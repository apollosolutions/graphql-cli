import { access, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

import { load as parseYaml } from 'js-yaml';

import { InvalidArgsError } from '../errors/exit.js';

const CONFIG_CANDIDATES = [
  '.gqlrc.yml',
  '.gqlrc.yaml',
  '.gqlrc.json',
  'gql.config.yml',
  'gql.config.yaml',
  'gql.config.json',
] as const;

const ENV_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)(:-([^}]*))?\}/g;

const discoveryCache = new Map<string, string | null>();

export interface DiscoverConfigOptions {
  cwd?: string;
  useCache?: boolean;
}

export interface LoadConfigOptions extends DiscoverConfigOptions {
  path?: string;
  env?: Record<string, string | undefined>;
}

export interface LoadedConfig {
  filePath: string;
  rootDir: string;
  config: GqlConfig;
  defaultEndpoint: EndpointResolution;
}

export interface EndpointResolution {
  name: string;
  config: EndpointConfig;
}

export interface GqlConfig {
  version: number;
  defaultEndpoint?: string;
  endpoints: Record<string, EndpointConfig>;
  telemetry?: {
    enabled?: boolean;
  };
  output?: {
    format?: string;
    pretty?: boolean;
  };
  cache?: {
    dir?: string;
  };
}

export interface EndpointConfig {
  url: string;
  headers?: Record<string, string>;
  auth?: {
    strategy?: string;
    env?: string;
  };
  request?: {
    timeoutMs?: number;
    retries?: {
      maxAttempts?: number;
      backoff?: string;
      baseMs?: number;
    };
  };
  cache?: {
    introspectionTTL?: number;
  };
  features?: Record<string, boolean>;
  aliases?: Record<string, string>;
  fragments?: string[];
  documents?: string[];
  help?: EndpointHelpConfig;
}

export interface EndpointHelpConfig {
  groupOrder?: string[];
  hide?: string[];
  rename?: Record<string, string>;
  describe?: Record<string, string>;
  preferKindOnConflict?: 'query' | 'mutation' | 'subscription';
  promptOnConflict?: boolean;
}

export class ConfigNotFoundError extends InvalidArgsError {
  constructor(message = 'No gql config found. Create one via "gql init" or add a .gqlrc.yml file.') {
    super(message);
  }
}

export class ConfigValidationError extends InvalidArgsError {
  constructor(filePath: string, pointer: string, message: string) {
    const location = pointer ? `${pointer} (${filePath})` : filePath;
    super(`Invalid config at ${location}: ${message}`);
  }
}

export async function discoverConfigPath(options: DiscoverConfigOptions = {}): Promise<string | undefined> {
  const cwdInput = options.cwd ?? process.cwd();
  const startDir = await realpath(cwdInput);
  const cacheKey = `${startDir}`;

  if (options.useCache !== false && discoveryCache.has(cacheKey)) {
    return discoveryCache.get(cacheKey) ?? undefined;
  }

  let current = startDir;
  const visited = new Set<string>();

  while (!visited.has(current)) {
    visited.add(current);
    const match = await findInDirectory(current);
    if (match) {
      if (options.useCache !== false) {
        discoveryCache.set(cacheKey, match);
      }
      return match;
    }

    const reachedRepoRoot = await isRepoRoot(current);
    const parent = path.dirname(current);
    if (reachedRepoRoot || parent === current) {
      break;
    }
    current = parent;
  }

  if (options.useCache !== false) {
    discoveryCache.set(cacheKey, null);
  }
  return undefined;
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<LoadedConfig> {
  const env = options.env ?? process.env;
  const filePath = options.path ?? (await discoverConfigPath(options));
  if (!filePath) {
    throw new ConfigNotFoundError();
  }

  const rawText = await readFile(filePath, 'utf8');
  const parsed = parseConfigFile(rawText, filePath);
  const hydrated = resolveEnvPlaceholders(parsed, env, filePath);
  const config = validateConfig(hydrated, filePath);
  const defaultEndpoint = resolveEndpoint(config);

  return {
    filePath,
    rootDir: path.dirname(filePath),
    config,
    defaultEndpoint,
  };
}

export function resolveEndpoint(config: GqlConfig, requestedName?: string): EndpointResolution {
  const entries = Object.entries(config.endpoints);
  if (entries.length === 0) {
    throw new InvalidArgsError('Config defines no endpoints.');
  }

  const targetName = requestedName ?? config.defaultEndpoint ?? entries[0][0];
  const targetConfig = config.endpoints[targetName];

  if (!targetConfig) {
    const available = entries.map(([name]) => name).join(', ');
    throw new InvalidArgsError(
      requestedName
        ? `Unknown endpoint "${requestedName}". Available endpoints: ${available || '<none>'}.`
        : 'Unable to resolve default endpoint.'
    );
  }

  return {
    name: targetName,
    config: targetConfig,
  };
}

export function clearConfigCache(): void {
  discoveryCache.clear();
}

async function findInDirectory(dir: string): Promise<string | undefined> {
  for (const candidate of CONFIG_CANDIDATES) {
    const target = path.join(dir, candidate);
    if (await pathExists(target)) {
      return target;
    }
  }
  return undefined;
}

async function isRepoRoot(dir: string): Promise<boolean> {
  const gitPath = path.join(dir, '.git');
  return await pathExists(gitPath);
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function parseConfigFile(contents: string, filePath: string): unknown {
  try {
    if (filePath.endsWith('.json')) {
      return JSON.parse(contents);
    }
    return parseYaml(contents);
  } catch (error) {
    throw new ConfigValidationError(filePath, '', (error as Error).message);
  }
}

function resolveEnvPlaceholders(value: unknown, env: Record<string, string | undefined>, filePath: string, pointer = ''): unknown {
  if (typeof value === 'string') {
    return substituteEnv(value, env, filePath, pointer);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => resolveEnvPlaceholders(item, env, filePath, buildPointer(pointer, `[${index}]`)));
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = resolveEnvPlaceholders(child, env, filePath, buildPointer(pointer, key));
    }
    return result;
  }

  return value;
}

function substituteEnv(input: string, env: Record<string, string | undefined>, filePath: string, pointer: string): string {
  return input.replace(ENV_PATTERN, (_, name: string, _defaultExpr: string | undefined, defaultValue: string | undefined) => {
    const envValue = env[name];
    if (envValue === undefined || envValue === null) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new ConfigValidationError(filePath, pointer, `Environment variable "${name}" is not set.`);
    }
    return String(envValue);
  });
}

function validateConfig(raw: unknown, filePath: string): GqlConfig {
  if (!isPlainObject(raw)) {
    throw new ConfigValidationError(filePath, '', 'Config root must be an object.');
  }

  const version = raw.version;
  if (typeof version !== 'number') {
    throw new ConfigValidationError(filePath, 'version', 'Must be a number.');
  }
  if (version !== 1) {
    throw new ConfigValidationError(filePath, 'version', `Unsupported version "${version}". Expected 1.`);
  }

  const endpoints = parseEndpoints(raw.endpoints, filePath);

  const config: GqlConfig = {
    version,
    defaultEndpoint: parseDefaultEndpoint(raw.defaultEndpoint, endpoints, filePath),
    endpoints,
  };

  if (raw.telemetry !== undefined) {
    config.telemetry = parseTelemetry(raw.telemetry, filePath);
  }
  if (raw.output !== undefined) {
    config.output = parseOutput(raw.output, filePath);
  }
  if (raw.cache !== undefined) {
    config.cache = parseRootCache(raw.cache, filePath);
  }

  return config;
}

function parseEndpoints(
  raw: unknown,
  filePath: string
): Record<string, EndpointConfig> {
  if (!isPlainObject(raw)) {
    throw new ConfigValidationError(filePath, 'endpoints', 'Must be an object keyed by endpoint name.');
  }

  const entries = Object.entries(raw);
  if (entries.length === 0) {
    throw new ConfigValidationError(filePath, 'endpoints', 'At least one endpoint is required.');
  }

  const endpoints: Record<string, EndpointConfig> = {};
  for (const [name, value] of entries) {
    endpoints[name] = parseEndpointConfig(value, filePath, `endpoints.${name}`);
  }
  return endpoints;
}

function parseEndpointConfig(raw: unknown, filePath: string, pointer: string): EndpointConfig {
  if (!isPlainObject(raw)) {
    throw new ConfigValidationError(filePath, pointer, 'Endpoint entry must be an object.');
  }

  const url = raw.url;
  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new ConfigValidationError(filePath, `${pointer}.url`, 'Endpoint URL must be a non-empty string.');
  }

  const endpoint: EndpointConfig = {
    url: url.trim(),
  };

  const headers = parseOptionalStringRecord(raw.headers, filePath, `${pointer}.headers`);
  if (headers) {
    endpoint.headers = headers;
  }

  if (raw.auth !== undefined) {
    endpoint.auth = parseAuthConfig(raw.auth, filePath, `${pointer}.auth`);
  }

  if (raw.request !== undefined) {
    endpoint.request = parseRequestConfig(raw.request, filePath, `${pointer}.request`);
  }

  if (raw.cache !== undefined) {
    endpoint.cache = parseEndpointCache(raw.cache, filePath, `${pointer}.cache`);
  }

  if (raw.features !== undefined) {
    endpoint.features = parseBooleanRecord(raw.features, filePath, `${pointer}.features`);
  }

  if (raw.aliases !== undefined) {
    const aliases = parseOptionalStringRecord(raw.aliases, filePath, `${pointer}.aliases`);
    if (aliases) {
      validateAliases(aliases, filePath, `${pointer}.aliases`);
      endpoint.aliases = aliases;
    }
  }

  if (raw.fragments !== undefined) {
    endpoint.fragments = parseStringArray(raw.fragments, filePath, `${pointer}.fragments`);
  }

  if (raw.documents !== undefined) {
    endpoint.documents = parseStringArray(raw.documents, filePath, `${pointer}.documents`);
  }

  if (raw.help !== undefined) {
    endpoint.help = parseHelpConfig(raw.help, filePath, `${pointer}.help`);
  }

  return endpoint;
}

function parseDefaultEndpoint(
  value: unknown,
  endpoints: Record<string, EndpointConfig>,
  filePath: string
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ConfigValidationError(filePath, 'defaultEndpoint', 'Must be a non-empty string.');
  }
  if (!endpoints[value]) {
    throw new ConfigValidationError(filePath, 'defaultEndpoint', `Endpoint "${value}" is not defined.`);
  }
  return value;
}

function parseTelemetry(value: unknown, filePath: string): GqlConfig['telemetry'] {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(filePath, 'telemetry', 'Must be an object.');
  }
  const telemetry: GqlConfig['telemetry'] = {};
  if (value.enabled !== undefined) {
    telemetry.enabled = parseBoolean(value.enabled, filePath, 'telemetry.enabled');
  }
  return telemetry;
}

function parseOutput(value: unknown, filePath: string): GqlConfig['output'] {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(filePath, 'output', 'Must be an object.');
  }
  const output: GqlConfig['output'] = {};
  if (value.format !== undefined) {
    output.format = parseString(value.format, filePath, 'output.format');
  }
  if (value.pretty !== undefined) {
    output.pretty = parseBoolean(value.pretty, filePath, 'output.pretty');
  }
  return output;
}

function parseRootCache(value: unknown, filePath: string): GqlConfig['cache'] {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(filePath, 'cache', 'Must be an object.');
  }
  const cache: GqlConfig['cache'] = {};
  if (value.dir !== undefined) {
    cache.dir = parseString(value.dir, filePath, 'cache.dir');
  }
  return cache;
}

function parseAuthConfig(value: unknown, filePath: string, pointer: string): EndpointConfig['auth'] {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(filePath, pointer, 'Must be an object.');
  }
  const auth: EndpointConfig['auth'] = {};
  if (value.strategy !== undefined) {
    auth.strategy = parseString(value.strategy, filePath, `${pointer}.strategy`);
  }
  if (value.env !== undefined) {
    auth.env = parseString(value.env, filePath, `${pointer}.env`);
  }
  return auth;
}

function parseRequestConfig(value: unknown, filePath: string, pointer: string): EndpointConfig['request'] {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(filePath, pointer, 'Must be an object.');
  }
  const request: EndpointConfig['request'] = {};
  if (value.timeoutMs !== undefined) {
    request.timeoutMs = parseNumber(value.timeoutMs, filePath, `${pointer}.timeoutMs`);
  }
  if (value.retries !== undefined) {
    request.retries = parseRetriesConfig(value.retries, filePath, `${pointer}.retries`);
  }
  return request;
}

function parseRetriesConfig(value: unknown, filePath: string, pointer: string): NonNullable<EndpointConfig['request']>['retries'] {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(filePath, pointer, 'Must be an object.');
  }
  const retries: NonNullable<EndpointConfig['request']>['retries'] = {};
  if (value.maxAttempts !== undefined) {
    retries.maxAttempts = parseNumber(value.maxAttempts, filePath, `${pointer}.maxAttempts`);
  }
  if (value.baseMs !== undefined) {
    retries.baseMs = parseNumber(value.baseMs, filePath, `${pointer}.baseMs`);
  }
  if (value.backoff !== undefined) {
    retries.backoff = parseString(value.backoff, filePath, `${pointer}.backoff`);
  }
  return retries;
}

function parseEndpointCache(value: unknown, filePath: string, pointer: string): EndpointConfig['cache'] {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(filePath, pointer, 'Must be an object.');
  }
  const cache: EndpointConfig['cache'] = {};
  if (value.introspectionTTL !== undefined) {
    cache.introspectionTTL = parseNumber(value.introspectionTTL, filePath, `${pointer}.introspectionTTL`);
  }
  return cache;
}

function parseBooleanRecord(value: unknown, filePath: string, pointer: string): Record<string, boolean> {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(filePath, pointer, 'Must be an object with boolean values.');
  }
  const record: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    record[key] = parseBoolean(entry, filePath, `${pointer}.${key}`);
  }
  return record;
}

function parseOptionalStringRecord(
  value: unknown,
  filePath: string,
  pointer: string
): Record<string, string> | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(filePath, pointer, 'Must be an object with string values.');
  }
  const record: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    record[key] = parseString(entry, filePath, `${pointer}.${key}`);
  }
  return record;
}

function parseStringArray(value: unknown, filePath: string, pointer: string): string[] {
  if (!Array.isArray(value)) {
    throw new ConfigValidationError(filePath, pointer, 'Must be an array of strings.');
  }
  return value.map((entry, index) => parseString(entry, filePath, `${pointer}[${index}]`));
}

function parseHelpConfig(value: unknown, filePath: string, pointer: string): EndpointHelpConfig {
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(filePath, pointer, 'Must be an object.');
  }
  const help: EndpointHelpConfig = {};
  if (value.groupOrder !== undefined) {
    help.groupOrder = parseStringArray(value.groupOrder, filePath, `${pointer}.groupOrder`);
  }
  if (value.hide !== undefined) {
    help.hide = parseStringArray(value.hide, filePath, `${pointer}.hide`);
  }
  if (value.rename !== undefined) {
    help.rename = parseOptionalStringRecord(value.rename, filePath, `${pointer}.rename`);
  }
  if (value.describe !== undefined) {
    help.describe = parseOptionalStringRecord(value.describe, filePath, `${pointer}.describe`);
  }
  if (value.preferKindOnConflict !== undefined) {
    const allowed = ['query', 'mutation', 'subscription'];
    const parsed = parseString(value.preferKindOnConflict, filePath, `${pointer}.preferKindOnConflict`).toLowerCase();
    if (!allowed.includes(parsed)) {
      throw new ConfigValidationError(
        filePath,
        `${pointer}.preferKindOnConflict`,
        `Expected one of ${allowed.join(', ')}.`
      );
    }
    help.preferKindOnConflict = parsed as EndpointHelpConfig['preferKindOnConflict'];
  }
  if (value.promptOnConflict !== undefined) {
    help.promptOnConflict = parseBoolean(value.promptOnConflict, filePath, `${pointer}.promptOnConflict`);
  }
  return help;
}

function parseString(value: unknown, filePath: string, pointer: string): string {
  if (typeof value !== 'string') {
    throw new ConfigValidationError(filePath, pointer, 'Expected a string.');
  }
  return value;
}

function parseNumber(value: unknown, filePath: string, pointer: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ConfigValidationError(filePath, pointer, 'Expected a number.');
  }
  return value;
}

function parseBoolean(value: unknown, filePath: string, pointer: string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (/^(true|false)$/i.test(value)) {
      return value.toLowerCase() === 'true';
    }
  }
  throw new ConfigValidationError(filePath, pointer, 'Expected a boolean.');
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildPointer(parent: string, key: string): string {
  if (!parent) {
    return key.replace(/^\./, '');
  }
  if (key.startsWith('[')) {
    return `${parent}${key}`;
  }
  return `${parent}.${key}`;
}

function validateAliases(
  aliases: Record<string, string>,
  filePath: string,
  pointer: string
): void {
  for (const [alias, target] of Object.entries(aliases)) {
    if (!target || typeof target !== 'string') {
      throw new ConfigValidationError(filePath, `${pointer}.${alias}`, 'Alias target must be a non-empty string.');
    }
    if (aliases[target]) {
      throw new ConfigValidationError(
        filePath,
        `${pointer}.${alias}`,
        'Alias chaining is not supported (aliases must point to canonical operations).'
      );
    }
    if (alias === target) {
      throw new ConfigValidationError(filePath, `${pointer}.${alias}`, 'Alias cannot reference itself.');
    }
  }
}
