import { EndpointConfig, loadConfig, resolveEndpoint, ConfigNotFoundError } from '../config/index.js';
import { InvalidArgsError } from '../errors/exit.js';
import { buildHeaders, HeaderDirective, HeaderLayer } from '../http/headers.js';

export interface ResolvedTarget {
  label: string;
  url: string;
  headers: Record<string, string>;
  redactedHeaders: Record<string, string>;
  cacheTtlMs?: number;
  endpointName?: string;
  endpointConfig?: EndpointConfig;
}

export interface ResolveTargetOptions {
  targetArg?: string;
  urlFlag?: string;
  endpointFlag?: string;
  headers?: HeaderDirective[];
}

export async function resolveTarget(options: ResolveTargetOptions = {}): Promise<ResolvedTarget> {
  const headerDirectives = options.headers ?? [];
  const normalizedTarget = options.targetArg?.trim();
  const urlFromArg = normalizedTarget && isHttpUrl(normalizedTarget) ? normalizedTarget : undefined;

  const url = options.urlFlag ?? urlFromArg;
  const endpointName = options.endpointFlag ?? (url ? undefined : normalizedTarget);

  if (options.urlFlag && options.endpointFlag) {
    throw new InvalidArgsError('Specify either --url or --endpoint, not both.');
  }

  if (url) {
    const built = buildHeaders([{ directives: headerDirectives }]);
    return {
      label: url,
      url,
      headers: built.headers,
      redactedHeaders: built.redacted,
    };
  }

  let loadedConfig;
  try {
    loadedConfig = await loadConfig();
  } catch (error) {
    if (error instanceof ConfigNotFoundError) {
      throw new InvalidArgsError('No gql config found. Provide --url or run "gql init".');
    }
    throw error;
  }

  const resolution = endpointName
    ? resolveEndpoint(loadedConfig.config, endpointName)
    : loadedConfig.defaultEndpoint;

  const layers: HeaderLayer[] = [];
  if (resolution.config.headers) {
    layers.push({ headers: resolution.config.headers });
  }
  layers.push({ directives: headerDirectives });
  const built = buildHeaders(layers);

  const cacheTtlMs = resolution.config.cache?.introspectionTTL
    ? resolution.config.cache.introspectionTTL * 1000
    : undefined;

  return {
    label: resolution.name,
    url: resolution.config.url,
    headers: built.headers,
    redactedHeaders: built.redacted,
    cacheTtlMs,
    endpointName: resolution.name,
    endpointConfig: resolution.config,
  };
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
