import { GraphQLSchema } from 'graphql';
import { CommandDefinition, CommandHelpContext, CommandContext } from '../command-registry.js';
import { EndpointConfig } from '../config/index.js';
import { GraphQLExecutionError, InvalidArgsError } from '../errors/exit.js';
import { loadSchemaFromUrl } from '../introspection/index.js';
import { writeGraphQLResponse } from '../output/json.js';
import {
  collectHeaders,
  extractVariableInput,
  getDocFlag,
  getOperationNameFlag,
  normalizeOperationKind,
  resolveOutputFormat,
  OperationKind,
} from '../commands/flag-helpers.js';
import { DocumentStore, findAutoDocument, resolveDocumentInput } from '../documents/index.js';
import { formatLabel, formatCommand, formatMuted } from '../output/colors.js';
import { buildOperationRecords, renderOperationRecordsText } from '../ops/list.js';
import { runUrlMode } from '../urlmode/index.js';
import { buildHeaders, HeaderLayer } from '../http/headers.js';
import {
  buildAliasMap,
  buildOperationIndex,
  getDescription,
  getDisplayName,
  isArgumentRequired,
  isHidden,
  OperationIndex,
  OperationInfo,
  orderedGroups,
  ROOT_ORDER,
  RootKind,
  extractFieldKey,
} from './operations.js';

const ROOT_LABEL: Record<RootKind, string> = {
  query: 'Queries',
  mutation: 'Mutations',
  subscription: 'Subscriptions',
};

export function buildEndpointCommand(options: {
  endpointName: string;
  endpointConfig: EndpointConfig;
  configDir: string;
}): CommandDefinition {
  const { endpointName, endpointConfig, configDir } = options;
  const configHeaderLayer: HeaderLayer | undefined = endpointConfig.headers ? { headers: endpointConfig.headers } : undefined;
  const introspectionHeaders = configHeaderLayer ? buildHeaders([configHeaderLayer]).headers : undefined;
  let schemaPromise: Promise<GraphQLSchema> | undefined;
  let operationIndex: OperationIndex | undefined;
  let docStorePromise: Promise<DocumentStore | undefined> | undefined;

  async function getSchema(): Promise<GraphQLSchema> {
    if (!schemaPromise) {
      schemaPromise = loadSchemaForEndpoint(endpointConfig, introspectionHeaders).catch((error) => {
        schemaPromise = undefined;
        throw error;
      });
    }
    return schemaPromise;
  }

  async function getOperationIndex(): Promise<OperationIndex> {
    if (!operationIndex) {
      const schema = await getSchema();
      operationIndex = buildOperationIndex(schema);
    }
    return operationIndex;
  }

  async function getDocumentStore(): Promise<DocumentStore | undefined> {
    const hasDocs = Boolean(
      (endpointConfig.documents && endpointConfig.documents.length > 0) ||
        (endpointConfig.fragments && endpointConfig.fragments.length > 0)
    );
    if (!hasDocs) {
      return undefined;
    }
    if (!docStorePromise) {
      docStorePromise = (async () => {
        const store = new DocumentStore({
          rootDir: configDir,
          documents: endpointConfig.documents,
          fragments: endpointConfig.fragments,
        });
        await store.init();
        return store;
      })();
    }
    return docStorePromise;
  }

  return {
    name: endpointName,
    summary: `Run operations defined in ${endpointName} endpoint config`,
    usage: `gql ${endpointName} <operation> [flags]`,
    description: `Operations, aliases, and help are derived from ${endpointName}'s schema and .gqrc configuration.`,
    renderHelp: async (ctx?: CommandHelpContext) =>
      renderEndpointHelp({
        endpointName,
        endpointConfig,
        indexLoader: getOperationIndex,
        showHidden: Boolean(ctx?.flags?.['show-hidden']),
        disableAliases: isTruthyFlag(ctx?.flags?.['no-aliases']),
        focusOperation: ctx?.args?.[0],
      }),
    handler: async (ctx) => {
      const disableAliases = isTruthyFlag(ctx.flags['no-aliases']);
      if (ctx.args.length === 0) {
        const help = await renderEndpointHelp({
          endpointName,
          endpointConfig,
          indexLoader: getOperationIndex,
          showHidden: Boolean(ctx.flags['show-hidden']),
          disableAliases,
        });
        ctx.io.stdout.write(help);
        ctx.io.stdout.write('\n');
        return 0;
      }

      if (ctx.args[0] === 'ops') {
        return await handleEndpointOpsSubcommand({
          ctx,
          endpointName,
          endpointConfig,
          getSchema,
          subArgs: ctx.args.slice(1),
        });
      }

      const inputName = ctx.args[0];
      const docValue = getDocFlag(ctx.flags);
      const opNameFlag = getOperationNameFlag(ctx.flags);
      if (opNameFlag && !docValue) {
        throw new InvalidArgsError('--operation-name requires --doc.');
      }

      const canonicalName = resolveOperationName(inputName, endpointConfig, { disableAliases });
      const index = await getOperationIndex();
      const preferredKind = endpointConfig.help?.preferKindOnConflict
        ? normalizeOperationKind(endpointConfig.help.preferKindOnConflict, { allowSubscription: true })
        : undefined;
      const requestedKind = ctx.flags.kind
        ? normalizeOperationKind(String(ctx.flags.kind), { allowSubscription: true })
        : undefined;
      const operation = resolveOperation(index, canonicalName, {
        prefer: preferredKind,
        requested: requestedKind,
        endpointName,
      });

      const docStore = await getDocumentStore();
      let documentOverride = docValue
        ? await resolveDocumentInput(docValue, {
            operationName: opNameFlag,
            store: docStore,
            searchDirs: [process.cwd(), configDir],
          })
        : undefined;

      if (!documentOverride && docStore) {
        documentOverride = findAutoDocument(docStore, [operation.field.name, canonicalName, inputName]);
      }

      const cliHeaders = collectHeaders(ctx.flags);
      const headerLayers: HeaderLayer[] = [];
      if (configHeaderLayer) {
        headerLayers.push(configHeaderLayer);
      }
      headerLayers.push({ directives: cliHeaders });
      const builtHeaders = buildHeaders(headerLayers);
      const headers = builtHeaders.headers;
      const redactedHeaders = builtHeaders.redacted;
      const variables = extractVariableInput(ctx.flags);
      const outputFormat = resolveOutputFormat(ctx.flags.format);
      const fields = documentOverride ? undefined : typeof ctx.flags.fields === 'string' ? ctx.flags.fields : undefined;

      const cacheTtl = ctx.flags['cache-ttl']
        ? Number(ctx.flags['cache-ttl'])
        : endpointConfig.cache?.introspectionTTL
        ? endpointConfig.cache.introspectionTTL * 1000
        : undefined;

      if (operation.kind === 'subscription') {
        throw new InvalidArgsError('Subscriptions are not supported yet.');
      }

      const schema = await getSchema();

      const printRequest = isTruthyFlag(ctx.flags['print-request']);
      const printResponse = isTruthyFlag(ctx.flags['print-response']);

      const result = await runUrlMode({
        endpoint: endpointConfig.url,
        kind: operation.kind,
        operationName: operation.field.name,
        variables,
        schema,
        options: {
          headers,
          fields,
          document: documentOverride?.document,
          operationName: documentOverride?.operationName,
          redactedHeaders,
          diagnostics:
            printRequest || printResponse
              ? {
                  printRequest,
                  printResponse,
                  stderr: ctx.io.stderr,
                }
              : undefined,
          cache: cacheTtl ? { ttlMs: cacheTtl } : undefined,
        },
      });

      const selectExpr = typeof ctx.flags.select === 'string' ? ctx.flags.select : undefined;
      const jqExpr = typeof ctx.flags.jq === 'string' ? ctx.flags.jq : undefined;

      await writeGraphQLResponse(result.result, {
        stdout: ctx.io.stdout,
        select: selectExpr,
        jq: jqExpr,
        format: outputFormat,
      });

      if (
        Array.isArray((result.result as { errors?: unknown[] }).errors) &&
        (result.result as { errors?: unknown[] }).errors!.length > 0
      ) {
        throw new GraphQLExecutionError('GraphQL execution returned errors.');
      }

      return 0;
    },
  };
}

async function renderEndpointHelp(options: {
  endpointName: string;
  endpointConfig: EndpointConfig;
  indexLoader: () => Promise<OperationIndex>;
  showHidden?: boolean;
  focusOperation?: string;
  disableAliases?: boolean;
}): Promise<string> {
  const { endpointName, endpointConfig, indexLoader, showHidden, focusOperation, disableAliases } = options;
  const lines: string[] = [];
  const header = `${formatLabel('Usage:')} gql ${endpointName} <operation> [flags]`;
  lines.push(header);
  lines.push(`${formatLabel('Endpoint URL:')} ${endpointConfig.url}`);
  lines.push('');

  if (focusOperation) {
    const detail = await renderOperationDetail({
      endpointConfig,
      indexLoader,
      operationName: focusOperation,
      disableAliases,
    });
    if (detail) {
      lines.push(detail);
      return lines.join('\n');
    }
  }

      const index = await indexLoader();
      for (const kind of orderedGroups(endpointConfig)) {
        const operations = index.byKind[kind];
    const visible = operations.filter((op) => showHidden || !isHidden(op, endpointConfig));
    if (visible.length === 0) {
      continue;
    }
    lines.push(formatLabel(ROOT_LABEL[kind]));
    const entries = visible
      .map((op) => ({
        name: getDisplayName(op, endpointConfig),
        description: getDescription(op, endpointConfig),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const maxName = Math.max(...entries.map((entry) => entry.name.length));
    for (const entry of entries) {
      const padded = entry.name.padEnd(maxName + 2, ' ');
      lines.push(`  ${formatCommand(padded)}${entry.description ?? ''}`.trimEnd());
    }
    lines.push('');
  }

  const aliases = endpointConfig.aliases ?? {};
  const aliasEntries = Object.entries(aliases);
  if (aliasEntries.length > 0) {
    lines.push(formatLabel('Aliases:'));
    for (const [alias, op] of aliasEntries.sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`  ${formatCommand(alias)} -> ${op}`);
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

async function renderOperationDetail(options: {
  endpointConfig: EndpointConfig;
  indexLoader: () => Promise<OperationIndex>;
  operationName: string;
  disableAliases?: boolean;
}): Promise<string | undefined> {
  const { endpointConfig, indexLoader, operationName, disableAliases } = options;
  const index = await indexLoader();
  const canonical = resolveOperationName(operationName, endpointConfig, { disableAliases });
  const matches = index.byName.get(canonical);
  if (!matches || matches.length === 0) {
    return undefined;
  }
  const lines: string[] = [];
  for (const op of matches) {
    lines.push(formatLabel(`Operation: ${capitalize(op.kind)}.${op.field.name}`));
    if (op.field.description) {
      lines.push(op.field.description);
    }
    if (op.field.args.length > 0) {
      lines.push(formatLabel('Arguments:'));
      for (const arg of op.field.args) {
        const required = isArgumentRequired(arg);
        const typeName = String(arg.type);
        const desc = arg.description ? ` — ${arg.description}` : '';
        lines.push(`  ${arg.name} (${typeName}${required ? '!' : ''})${desc}`);
      }
      lines.push(formatMuted('Set via --var.<argument>=value or --var argument=value JSON.'));
    } else {
      lines.push(`${formatLabel('Arguments:')} none`);
    }
    lines.push('');
  }
  lines.push(formatLabel('Flags:'));
  lines.push('  --kind query|mutation|subscription  Override automatic operation type resolution');
  lines.push('  --fields "a,b"                      Custom selection set');
  lines.push('  --doc/--document <file>             Provide full GraphQL document');
  lines.push('  --operation-name <name>             Select operation within the supplied document');
  lines.push('  --header "Key: Value"               Add request headers (later entries override earlier ones)');
  lines.push('  --print-request                     Show HTTP request diagnostics with redacted headers');
  lines.push('  --var.<name> <value>                Set variables via dot notation');
  lines.push('  --select <expr>                     Filter JSON with JMESPath before printing');
  lines.push('  --jq <expr>                         Pipe JSON through jq (uses $GQL_JQ_BIN if set)');
  lines.push('  --no-aliases                        Bypass alias translation when debugging');
  return lines.join('\n').trimEnd();
}

function resolveOperationName(
  name: string,
  config: EndpointConfig,
  options?: { disableAliases?: boolean }
): string {
  const aliases = config.aliases ?? {};
  if (!options?.disableAliases && aliases[name]) {
    return aliases[name];
  }
  const renameEntries = Object.entries(config.help?.rename ?? {});
  for (const [key, value] of renameEntries) {
    if (value === name) {
      return extractFieldKey(key);
    }
  }
  return name;
}

function resolveOperation(index: OperationIndex, name: string, options: { prefer?: RootKind; requested?: RootKind; endpointName: string }): OperationInfo {
  const matches = index.byName.get(name);
  if (!matches || matches.length === 0) {
    const suggestions = suggestOperations(index, name);
    const suggestionText = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '';
    throw new InvalidArgsError(`Operation "${name}" not found on endpoint "${options.endpointName}".${suggestionText}`);
  }

  if (options.requested) {
    const match = matches.find((entry) => entry.kind === options.requested);
    if (!match) {
      throw new InvalidArgsError(
        `Operation "${name}" does not exist on ${capitalize(options.requested)}. Use --kind ${matches
          .map((entry) => entry.kind)
          .map(capitalize)
          .join('/')}.`
      );
    }
    return match;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  const prefer = options.prefer ?? 'query';
  const preferred = matches.find((entry) => entry.kind === prefer);
  if (preferred) {
    return preferred;
  }

  const order: RootKind[] = ['query', 'mutation', 'subscription'];
  for (const kind of order) {
    const match = matches.find((entry) => entry.kind === kind);
    if (match) {
      return match;
    }
  }
  return matches[0];
}

function suggestOperations(index: OperationIndex, name: string): string[] {
  const scores: Array<{ name: string; score: number }> = [];
  for (const candidate of index.byName.keys()) {
    scores.push({ name: candidate, score: levenshtein(name, candidate) });
  }
  return scores
    .sort((a, b) => a.score - b.score)
    .filter((entry) => entry.score <= 3)
    .slice(0, 3)
    .map((entry) => entry.name);
}

async function loadSchemaForEndpoint(
  endpointConfig: EndpointConfig,
  headers?: Record<string, string>
): Promise<GraphQLSchema> {
  const resolvedHeaders =
    headers ??
    (endpointConfig.headers ? buildHeaders([{ headers: endpointConfig.headers }]).headers : undefined);
  return loadSchemaFromUrl(endpointConfig.url, {
    headers: resolvedHeaders,
    cache: endpointConfig.cache?.introspectionTTL ? { ttlMs: endpointConfig.cache.introspectionTTL * 1000 } : undefined,
  });
}

async function handleEndpointOpsSubcommand(options: {
  ctx: CommandContext;
  endpointName: string;
  endpointConfig: EndpointConfig;
  getSchema: () => Promise<GraphQLSchema>;
  subArgs: string[];
}): Promise<number> {
  const { ctx, endpointName, endpointConfig, getSchema, subArgs } = options;
  const [action, ...rest] = subArgs;
  if (action && action !== 'list') {
    throw new InvalidArgsError('Unknown ops action. Use "gql <endpoint> ops" or "gql <endpoint> ops list".');
  }
  if (rest.length > 0) {
    throw new InvalidArgsError('Too many positional arguments for endpoint ops.');
  }

  const showHidden = isTruthyFlag(ctx.flags['show-hidden']);
  const match = typeof ctx.flags.match === 'string' ? ctx.flags.match : undefined;
  const kindFlag = ctx.flags.kind ? String(ctx.flags.kind) : undefined;
  const kindFilter = kindFlag ? normalizeOperationKind(kindFlag, { allowSubscription: true }) : undefined;
  const asJson = isTruthyFlag(ctx.flags.json);

  const schema = await getSchema();
  const records = buildOperationRecords({
    schema,
    endpointConfig,
    showHidden,
    kindFilter,
    match,
  });

  if (asJson) {
    const payload = {
      target: {
        label: endpointName,
        url: endpointConfig.url,
        endpoint: endpointName,
      },
      operations: records,
    };
    ctx.io.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    const rendered = renderOperationRecordsText({
      records,
      targetLabel: endpointName,
    });
    ctx.io.stdout.write(rendered);
    ctx.io.stdout.write('\n');
  }

  return 0;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isTruthyFlag(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value === '') {
      return true;
    }
    return value.toLowerCase() === 'true';
  }
  return false;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

export interface EndpointOperationSummary {
  canonicalName: string;
  displayName: string;
  kind: RootKind;
  hidden: boolean;
}

export async function collectEndpointOperationSummaries(
  endpointConfig: EndpointConfig
): Promise<EndpointOperationSummary[]> {
  const baseLayer: HeaderLayer[] = endpointConfig.headers ? [{ headers: endpointConfig.headers }] : [];
  const built = baseLayer.length > 0 ? buildHeaders(baseLayer) : undefined;
  const schema = await loadSchemaForEndpoint(endpointConfig, built?.headers);
  const index = buildOperationIndex(schema);
  const summaries: EndpointOperationSummary[] = [];
  for (const kind of ROOT_ORDER) {
    const ops = index.byKind[kind];
    for (const op of ops) {
      summaries.push({
        canonicalName: op.field.name,
        displayName: getDisplayName(op, endpointConfig),
        kind,
        hidden: isHidden(op, endpointConfig),
      });
    }
  }
  return summaries;
}
