import { CommandDefinition } from '../command-registry.js';
import { GraphQLExecutionError, InvalidArgsError } from '../errors/exit.js';
import { writeGraphQLResponse } from '../output/json.js';
import { buildHeaders } from '../http/headers.js';
import { runUrlMode } from '../urlmode/index.js';
import { resolveDocumentInput } from '../documents/index.js';
import {
  collectHeaders,
  extractVariableInput,
  getDocFlag,
  getOperationNameFlag,
  normalizeOperationKind,
  resolveOutputFormat,
} from './flag-helpers.js';

export function buildUrlModeCommand(): CommandDefinition {
  return {
    name: '@url-mode',
    label: '<url> <kind> <operation>',
    summary: 'Execute a GraphQL operation directly by URL',
    usage: 'gql <url> <query|mutation> <operationName> [--fields] [--var.id 123] [--header "Key: Value"]',
    matcher: (input) => input.positionals.length > 0 && /^https?:\/\//i.test(input.positionals[0]),
    handler: async (ctx) => {
      const [endpoint, kind, operationName] = ctx.args;
      if (!endpoint || !kind || !operationName) {
        throw new InvalidArgsError('Usage: gql <url> <query|mutation> <operationName> [flags]');
      }

      const normalizedKind = normalizeOperationKind(kind);
      if (normalizedKind === 'subscription') {
        throw new InvalidArgsError('Subscriptions are not supported yet.');
      }
      const headerDirectives = collectHeaders(ctx.flags);
      const builtHeaders = buildHeaders([{ directives: headerDirectives }]);
      const docValue = getDocFlag(ctx.flags);
      const opNameFlag = getOperationNameFlag(ctx.flags);
      if (opNameFlag && !docValue) {
        throw new InvalidArgsError('--operation-name requires --doc.');
      }
      const documentOverride = docValue
        ? await resolveDocumentInput(docValue, {
            operationName: opNameFlag,
            searchDirs: [process.cwd()],
          })
        : undefined;
      const fields = documentOverride ? undefined : typeof ctx.flags.fields === 'string' ? ctx.flags.fields : undefined;
      const cacheTtl = ctx.flags['cache-ttl'] ? Number(ctx.flags['cache-ttl']) : undefined;

      const variables = extractVariableInput(ctx.flags);
      const outputFormat = resolveOutputFormat(ctx.flags.format);

      const printRequest = isTruthyFlag(ctx.flags['print-request']);

      const result = await runUrlMode({
        endpoint,
        kind: normalizedKind,
        operationName,
        variables,
        options: {
          fields,
          document: documentOverride?.document,
          operationName: documentOverride?.operationName,
          headers: builtHeaders.headers,
          redactedHeaders: builtHeaders.redacted,
          diagnostics: printRequest
            ? {
                printRequest: true,
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

      if (Array.isArray((result.result as { errors?: unknown[] }).errors) && (result.result as { errors?: unknown[] }).errors!.length > 0) {
        throw new GraphQLExecutionError('GraphQL execution returned errors.');
      }

      return 0;
    },
  };
}

function isTruthyFlag(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value === '') return true;
    const normalized = value.toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return Boolean(value);
}
