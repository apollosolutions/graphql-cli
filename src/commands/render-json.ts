import { CommandDefinition } from '../command-registry.js';
import { InvalidArgsError } from '../errors/exit.js';
import { writeGraphQLResponse } from '../output/json.js';
import { resolveOutputFormat } from './flag-helpers.js';

export function buildRenderJsonCommand(): CommandDefinition {
  return {
    name: 'render-json',
    summary: 'Render GraphQL JSON payloads (dev)',
    usage:
      'gql render-json [--data <json>] [--errors <json>] [--extensions <json>] [--raw <string>] [--pretty|--compact] [--format json|table|ndjson]',
    description:
      'Developer helper that exercises the JSON output pipeline. Future GraphQL commands will call the same output layer.',
    handler: async (ctx) => {
      const options = {
        pretty: getBooleanFlag(ctx.flags, 'pretty'),
        compact: getBooleanFlag(ctx.flags, 'compact'),
        indent: ctx.flags.indent ? Number(ctx.flags.indent) : undefined,
      };

      if (options.indent !== undefined && Number.isNaN(options.indent)) {
        throw new InvalidArgsError('--indent must be a number');
      }

      if (getBooleanFlag(ctx.flags, 'simulate-internal')) {
        throw new Error('Simulated internal error (dev only)');
      }

      const selectExpr = typeof ctx.flags.select === 'string' ? ctx.flags.select : undefined;
      const jqExpr = typeof ctx.flags.jq === 'string' ? ctx.flags.jq : undefined;
      const outputFormat = ctx.flags.format ? resolveOutputFormat(ctx.flags.format) : 'json';

      if (ctx.flags.raw && (selectExpr || jqExpr)) {
        throw new InvalidArgsError('--select/--jq cannot be used with --raw.');
      }

      if (ctx.flags.raw) {
        await writeGraphQLResponse(
          {},
          {
            ...options,
            rawResult: String(ctx.flags.raw),
            stdout: ctx.io.stdout,
          }
        );
        return 0;
      }

      const data = ctx.flags.data ? parseJsonFlag('data', ctx.flags.data) : undefined;
      const errors = ctx.flags.errors ? parseJsonFlag('errors', ctx.flags.errors) : undefined;
      const extensions = ctx.flags.extensions ? parseJsonFlag('extensions', ctx.flags.extensions) : undefined;

      await writeGraphQLResponse(
        {
          data,
          errors,
          extensions,
        },
        {
          ...options,
          stdout: ctx.io.stdout,
          select: selectExpr,
          jq: jqExpr,
          format: outputFormat,
        }
      );

      return 0;
    },
  };
}

function parseJsonFlag(label: string, value: unknown) {
  try {
    return JSON.parse(String(value));
  } catch (error) {
    throw new InvalidArgsError(`Invalid JSON passed to --${label}: ${(error as Error).message}`);
  }
}

function getBooleanFlag(flags: Record<string, unknown>, name: string): boolean | undefined {
  const value = flags[name];
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value === '') {
      return true;
    }
    if (/^(true|false)$/i.test(value)) {
      return value.toLowerCase() === 'true';
    }
  }
  return undefined;
}
