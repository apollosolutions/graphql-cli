import { CommandDefinition } from '../command-registry.js';
import { InvalidArgsError } from '../errors/exit.js';
import { loadSchemaFromUrl } from '../introspection/index.js';
import { buildOperationRecords, renderOperationRecordsText } from '../ops/list.js';
import { collectHeaders, getStringFlag, normalizeOperationKind } from './flag-helpers.js';
import { resolveTarget } from './target.js';

export function buildOpsCommand(): CommandDefinition {
  return {
    name: 'ops',
    summary: 'List operations for endpoints or URLs',
    usage: 'gql ops list [<endpoint|url>] [--url <url>] [--endpoint <name>] [--kind query|mutation|subscription] [--match text] [--json]',
    description:
      'Displays schema-derived operations grouped by root type. Works with either explicit URLs or endpoints defined in .gqlrc.* configs.',
    handler: async (ctx) => {
      const { action, targetArg } = parseActionAndTarget(ctx.args);
      if (action !== 'list') {
        throw new InvalidArgsError(`Unknown ops action "${action}". Use "gql ops list".`);
      }

      const headerDirectives = collectHeaders(ctx.flags);
      const urlFlag = getStringFlag(ctx.flags, 'url');
      const endpointFlag = getStringFlag(ctx.flags, 'endpoint');
      const match = getStringFlag(ctx.flags, 'match');
      const showHidden = toBooleanFlag(ctx.flags['show-hidden']);
      const asJson = toBooleanFlag(ctx.flags.json);
      const kindFlag = getStringFlag(ctx.flags, 'kind');
      const kindFilter = kindFlag
        ? normalizeOperationKind(kindFlag, { allowSubscription: true })
        : undefined;

      const target = await resolveTarget({
        targetArg,
        urlFlag,
        endpointFlag,
        headers: headerDirectives,
      });

      const schema = await loadSchemaFromUrl(target.url, {
        headers: target.headers,
        cache: target.cacheTtlMs ? { ttlMs: target.cacheTtlMs } : undefined,
      });

      const records = buildOperationRecords({
        schema,
        endpointConfig: target.endpointConfig,
        showHidden,
        kindFilter,
        match: match ?? undefined,
      });

      if (asJson) {
        const payload = {
          target: {
            label: target.label,
            url: target.url,
            endpoint: target.endpointName ?? null,
          },
          operations: records,
        };
        ctx.io.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        return 0;
      }

      const output = renderOperationRecordsText({ records, targetLabel: target.label });
      ctx.io.stdout.write(output);
      ctx.io.stdout.write('\n');
      return 0;
    },
  };
}

function parseActionAndTarget(args: string[]): { action: 'list'; targetArg?: string } {
  if (args.length === 0) {
    return { action: 'list' };
  }

  const [first, second, ...rest] = args;
  if (first === 'list') {
    if (rest.length > 0) {
      throw new InvalidArgsError('Too many positional arguments. Provide at most one endpoint or URL.');
    }
    return { action: 'list', targetArg: second };
  }

  if (second) {
    throw new InvalidArgsError('Too many positional arguments. Provide at most one endpoint or URL.');
  }

  return { action: 'list', targetArg: first };
}

function toBooleanFlag(value: unknown): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value === '') return true;
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return Boolean(value);
}
