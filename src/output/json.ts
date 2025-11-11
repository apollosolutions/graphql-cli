import { InvalidArgsError } from '../errors/exit.js';
import { transformGraphQLResult } from './select.js';
import { renderTableFromData } from './table.js';

export interface GraphQLErrorLike {
  message: string;
  path?: Array<string | number>;
  locations?: Array<{ line: number; column: number }>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponseLike {
  data?: unknown;
  errors?: GraphQLErrorLike[];
  extensions?: Record<string, unknown>;
}

export interface JsonRenderOptions {
  pretty?: boolean;
  compact?: boolean;
  indent?: number;
  newline?: boolean;
  rawResult?: string | Buffer;
  stdout?: NodeJS.WritableStream & { isTTY?: boolean };
  env?: NodeJS.ProcessEnv;
  tty?: boolean;
}

export type GraphQLOutputFormat = 'json' | 'table' | 'ndjson';

export interface GraphQLOutputOptions extends JsonRenderOptions {
  select?: string;
  jq?: string;
  jqBinary?: string;
  format?: GraphQLOutputFormat;
}

const DEFAULT_INDENT = 2;

export function formatGraphQLResponse(result: GraphQLResponseLike, options: JsonRenderOptions = {}): string {
  if (options.rawResult !== undefined) {
    const rawText = typeof options.rawResult === 'string' ? options.rawResult : options.rawResult.toString('utf8');
    return appendNewline(rawText, options.newline);
  }

  const payload: GraphQLResponseLike = {};
  if ('data' in result || result.data !== undefined) {
    payload.data = result.data ?? null;
  } else if (result.errors) {
    payload.data = null;
  }

  if (result.errors && result.errors.length > 0) {
    payload.errors = result.errors.map((error) => normalizeError(error));
  }

  if (result.extensions && Object.keys(result.extensions).length > 0) {
    payload.extensions = result.extensions;
  }

  const pretty = resolvePrettyPreference(options);
  const indent = pretty ? options.indent ?? DEFAULT_INDENT : undefined;
  const json = JSON.stringify(payload, null, indent);
  return appendNewline(json, options.newline);
}

export function printGraphQLResponse(result: GraphQLResponseLike, options: JsonRenderOptions = {}): void {
  const stdout = options.stdout ?? process.stdout;
  const output = formatGraphQLResponse(result, { ...options, stdout });
  stdout.write(output);
}

export async function writeGraphQLResponse(
  result: GraphQLResponseLike,
  options: GraphQLOutputOptions = {}
): Promise<void> {
  const format: GraphQLOutputFormat = options.format ?? 'json';
  if ((format === 'table' || format === 'ndjson') && options.jq) {
    throw new InvalidArgsError(`--jq cannot be combined with --format ${format}.`);
  }

  if (!options.select && !options.jq && format === 'json') {
    printGraphQLResponse(result, options);
    return;
  }

  const stdout = options.stdout ?? process.stdout;
  const { text, payload } = await transformGraphQLResult(result, {
    select: options.select,
    jq: options.jq,
    jqBinary: options.jqBinary,
  });

  if (format === 'table') {
    const tableText = renderTableFromData(payload);
    stdout.write(appendNewline(tableText, options.newline));
    return;
  }

  if (format === 'ndjson') {
    const ndjsonText = renderNdjsonFromData(payload);
    stdout.write(appendNewline(ndjsonText, options.newline));
    return;
  }

  if (text !== undefined) {
    stdout.write(appendNewline(text, options.newline));
    return;
  }

  const pretty = resolvePrettyPreference(options);
  const indent = pretty ? options.indent ?? DEFAULT_INDENT : undefined;
  const json = JSON.stringify(payload ?? null, null, indent);
  stdout.write(appendNewline(json, options.newline));
}

function normalizeError(error: GraphQLErrorLike): GraphQLErrorLike {
  return {
    message: error.message,
    path: error.path,
    locations: error.locations,
    extensions: error.extensions,
  };
}

function resolvePrettyPreference(options: JsonRenderOptions): boolean {
  if (options.pretty === true) {
    return true;
  }
  if (options.compact === true || options.pretty === false) {
    return false;
  }

  const env = options.env ?? process.env;
  if (env.GQL_PRETTY) {
    if (env.GQL_PRETTY === '1') {
      return true;
    }
    if (env.GQL_PRETTY === '0') {
      return false;
    }
  }

  if (typeof options.tty === 'boolean') {
    return options.tty;
  }

  const stream = options.stdout ?? process.stdout;
  if (typeof stream.isTTY === 'boolean') {
    return Boolean(stream.isTTY);
  }

  return false;
}

function appendNewline(text: string, newlineOption: boolean | undefined): string {
  if (newlineOption === false) {
    return text;
  }
  return text.endsWith('\n') ? text : `${text}\n`;
}

function renderNdjsonFromData(value: unknown): string {
  const rows = Array.isArray(value) ? value : [value];
  return rows.map((row) => JSON.stringify(row ?? null)).join('\n');
}
