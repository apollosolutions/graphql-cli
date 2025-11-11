import { InvalidArgsError } from '../errors/exit.js';
import { HeaderDirective, HeaderParseError, parseHeaderDirective } from '../http/headers.js';
import { FlagValues } from '../command-registry.js';

export type OperationKind = 'query' | 'mutation' | 'subscription';
export type OutputFormat = 'json' | 'table' | 'ndjson';

export function normalizeOperationKind(value: string, options?: { allowSubscription?: boolean }): OperationKind {
  const normalized = value.toLowerCase();
  if (normalized === 'subscription' && options?.allowSubscription !== true) {
    throw new InvalidArgsError('Subscriptions are not supported yet.');
  }
  if (normalized === 'query' || normalized === 'mutation' || normalized === 'subscription') {
    return normalized;
  }
  throw new InvalidArgsError(`Unsupported operation kind "${value}". Use query, mutation, or subscription.`);
}

export function collectHeaders(flags: FlagValues): HeaderDirective[] {
  const entries = toArray(flags.header)
    .concat(toArray(flags.headers))
    .concat(toArray(flags.H));
  const directives: HeaderDirective[] = [];
  for (const entry of entries) {
    if (typeof entry !== 'string') {
      continue;
    }
    try {
      directives.push(parseHeaderDirective(entry));
    } catch (error) {
      if (error instanceof HeaderParseError) {
        throw new InvalidArgsError(error.message);
      }
      throw error;
    }
  }
  return directives;
}

export function extractVariableInput(flags: FlagValues): Record<string, unknown> {
  const vars = flags.var ?? flags.vars;
  if (vars && typeof vars === 'object') {
    return vars as Record<string, unknown>;
  }
  return {};
}

export function getStringFlag(flags: FlagValues, names: string | string[]): string | undefined {
  const list = Array.isArray(names) ? names : [names];
  for (const name of list) {
    const value = flags[name];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

export function getDocFlag(flags: FlagValues): string | undefined {
  return getStringFlag(flags, ['doc', 'document']);
}

export function getOperationNameFlag(flags: FlagValues): string | undefined {
  return getStringFlag(flags, ['operation-name', 'operation']);
}

export function resolveOutputFormat(value: unknown): OutputFormat {
  if (value === undefined || value === null) {
    return 'json';
  }
  const normalized = String(value).toLowerCase();
  if (normalized === 'json' || normalized === 'table' || normalized === 'ndjson') {
    return normalized;
  }
  throw new InvalidArgsError('Unsupported --format value. Use "json", "table", or "ndjson".');
}

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}
