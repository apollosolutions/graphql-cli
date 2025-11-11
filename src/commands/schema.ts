import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { buildClientSchema, GraphQLSchema, IntrospectionQuery, printSchema } from 'graphql';

import { CommandDefinition, FlagValues } from '../command-registry.js';
import { InvalidArgsError } from '../errors/exit.js';
import { loadIntrospectionJSON } from '../introspection/index.js';
import { collectHeaders, getStringFlag } from './flag-helpers.js';
import { ResolvedTarget, resolveTarget } from './target.js';

type SchemaAction = 'print' | 'save';
type SchemaFormat = 'sdl' | 'json';

export function buildSchemaCommand(): CommandDefinition {
  return {
    name: 'schema',
    summary: 'Inspect or save GraphQL schemas (SDL/JSON)',
    usage: 'gql schema [print|save] [<endpoint|url>] [--url <url>] [--endpoint <name>] [--format sdl|json] [--out path]',
    description:
      'Prints schemas as SDL or introspection JSON using either an explicit URL or endpoints defined in .gqlrc.* configs.',
    examples: [
      'gql schema print https://api.example.com/graphql',
      'gql schema print --endpoint api --format json',
      'gql schema save api --out schema.graphql',
    ],
    handler: async (ctx) => {
      const { action, targetArg } = parseActionAndTarget(ctx.args);
      const format = parseFormat(ctx.flags.format);
      const outPath = getStringFlag(ctx.flags, 'out');
      const refresh = toBooleanFlag(ctx.flags.refresh);
      const cacheOverride = parseNumberFlag(ctx.flags['cache-ttl']);
      const urlFlag = getStringFlag(ctx.flags, 'url');
      const endpointFlag = getStringFlag(ctx.flags, 'endpoint');
      const headerDirectives = collectHeaders(ctx.flags);

      if (action === 'save' && !outPath) {
        throw new InvalidArgsError('schema save requires --out <file path>.');
      }

      const target = await resolveTarget({
        targetArg,
        urlFlag,
        endpointFlag,
        headers: headerDirectives,
      });
      const resolvedHeaders = target.headers;
      const cacheTtlMs = refresh ? 0 : cacheOverride ?? target.cacheTtlMs;

      const introspection = await loadIntrospectionJSON(target.url, {
        headers: resolvedHeaders,
        cache: cacheTtlMs !== undefined ? { ttlMs: cacheTtlMs } : refresh ? { ttlMs: 0 } : undefined,
      });
      const schema = buildClientSchema(introspection);
      const payload = formatSchema(schema, introspection, format);

      let writtenPath: string | undefined;
      if (outPath) {
        writtenPath = await writeOutputFile(outPath, payload);
      }

      if (action === 'print') {
        ctx.io.stdout.write(payload);
        if (writtenPath) {
          ctx.io.stderr.write(buildWriteMessage(format, writtenPath, target));
        }
        return 0;
      }

      if (writtenPath) {
        ctx.io.stdout.write(buildWriteMessage(format, writtenPath, target));
      }

      return 0;
    },
    renderHelp: () =>
      [
        'Usage:',
        '  gql schema [print|save] [<endpoint|url>] [flags]',
        '',
        'Flags:',
        '  --url <url>             Execute against an explicit GraphQL URL',
        '  --endpoint <name>       Use a named endpoint from .gqlrc.* (defaults to config default)',
        '  --format sdl|json       Output SDL (default) or introspection JSON',
        '  --out <file>            Write schema to a file (required for "save")',
        '  --refresh               Skip the cache and re-run introspection',
        '  --cache-ttl <ms>        Override introspection cache TTL for this run',
        '  --header "K: V"         Merge additional HTTP headers (repeatable)',
        '',
        'Examples:',
        '  gql schema print https://api.example.com/graphql',
        '  gql schema print --endpoint api --format json',
        '  gql schema save api --out schema.graphql',
      ].join('\n'),
  };
}

function parseActionAndTarget(args: string[]): { action: SchemaAction; targetArg?: string } {
  if (args.length === 0) {
    return { action: 'print' };
  }

  const [first, ...rest] = args;
  const normalized = first.toLowerCase();
  if (isSchemaAction(normalized)) {
    if (rest.length > 1) {
      throw new InvalidArgsError('Too many positional arguments. Provide only one endpoint or URL.');
    }
    return { action: normalized, targetArg: rest[0] };
  }

  if (args.length > 1) {
    throw new InvalidArgsError('Too many positional arguments. Provide only one endpoint or URL.');
  }

  return { action: 'print', targetArg: first };
}

function isSchemaAction(value: string): value is SchemaAction {
  return value === 'print' || value === 'save';
}

function parseFormat(value: unknown): SchemaFormat {
  if (!value) {
    return 'sdl';
  }
  const normalized = String(value).toLowerCase();
  if (normalized === 'sdl' || normalized === 'json') {
    return normalized;
  }
  throw new InvalidArgsError('Unsupported --format value. Use "sdl" or "json".');
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

function parseNumberFlag(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function formatSchema(schema: GraphQLSchema, introspection: IntrospectionQuery, format: SchemaFormat): string {
  if (format === 'json') {
    return `${JSON.stringify(introspection, null, 2)}\n`;
  }
  return `${printSchema(schema)}\n`;
}

async function writeOutputFile(filePath: string, contents: string): Promise<string> {
  const absolute = path.resolve(filePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, contents, 'utf8');
  return absolute;
}

function buildWriteMessage(format: SchemaFormat, filePath: string, target: ResolvedTarget): string {
  return `Saved ${format.toUpperCase()} schema for ${target.label} to ${filePath}\n`;
}
