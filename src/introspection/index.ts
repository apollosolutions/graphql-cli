import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildClientSchema, GraphQLSchema, IntrospectionQuery, getIntrospectionQuery } from 'graphql';

import { NetworkError } from '../errors/exit.js';

export interface IntrospectionOptions {
  headers?: Record<string, string>;
  cache?: {
    dir?: string;
    ttlMs?: number;
  };
}

interface CacheEntry {
  etag?: string | null;
  timestamp: number;
  data: IntrospectionQuery;
}

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

export async function loadSchemaFromUrl(url: string, options: IntrospectionOptions = {}): Promise<GraphQLSchema> {
  const introspection = await loadIntrospectionJSON(url, options);
  return buildClientSchema(introspection);
}

export async function loadIntrospectionJSON(
  url: string,
  options: IntrospectionOptions = {}
): Promise<IntrospectionQuery> {
  const cacheDir = options.cache?.dir ?? path.join(os.homedir(), '.gql', 'cache', 'introspection');
  await mkdir(cacheDir, { recursive: true });
  const headers = { 'content-type': 'application/json', ...(options.headers ?? {}) };
  const cachePath = path.join(cacheDir, `${hashKey(url, headers)}.json`);
  const ttl = options.cache?.ttlMs ?? DEFAULT_TTL;

  const cached = await readCache(cachePath, ttl);

  if (cached) {
    const fresh = await fetchFresh(url, headers, cached.etag ?? undefined);
    if (!fresh) {
      return cached.data;
    }
    const parsed = await parseIntrospectionResponse(fresh);
    await writeCache(cachePath, parsed, fresh.headers.get('etag'));
    return parsed;
  }

  const response = await fetchFresh(url, headers);
  if (!response) {
    throw new NetworkError('Unable to load introspection result.');
  }
  const data = await parseIntrospectionResponse(response);
  await writeCache(cachePath, data, response.headers.get('etag'));
  return data;
}

async function fetchFresh(url: string, headers: Record<string, string>, etag?: string): Promise<Response | null> {
  const requestHeaders = { ...headers };
  if (etag) {
    requestHeaders['if-none-match'] = etag;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  });

  if (response.status === 304) {
    return null;
  }

  if (!response.ok) {
    throw new NetworkError(`Introspection request failed (${response.status}).`);
  }

  return response;
}

async function parseIntrospectionResponse(response: Response): Promise<IntrospectionQuery> {
  const json = (await response.json()) as { data?: IntrospectionQuery; errors?: unknown };
  if (!json.data) {
    throw new NetworkError('Introspection response missing data.');
  }
  return json.data;
}

function hashKey(url: string, headers: Record<string, string>): string {
  const normalizedHeaders = Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase(), value ?? ''])
    .sort(([a], [b]) => a.localeCompare(b));
  const hash = createHash('sha1');
  hash.update(url);
  for (const [key, value] of normalizedHeaders) {
    hash.update(key);
    hash.update(value);
  }
  return hash.digest('hex');
}

async function readCache(cachePath: string, ttl: number): Promise<CacheEntry | null> {
  try {
    const raw = await readFile(cachePath, 'utf8');
    const parsed = JSON.parse(raw) as CacheEntry;
    const age = Date.now() - (parsed.timestamp ?? 0);
    if (age > ttl) {
      return null;
    }
    return parsed;
  } catch (error) {
    return null;
  }
}

async function writeCache(cachePath: string, data: IntrospectionQuery, etag: string | null): Promise<void> {
  const payload: CacheEntry = {
    data,
    etag,
    timestamp: Date.now(),
  };
  await writeFile(cachePath, JSON.stringify(payload), 'utf8');
}
