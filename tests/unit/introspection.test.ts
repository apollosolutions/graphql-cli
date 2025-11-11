import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { buildClientSchema } from 'graphql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import introspectionData from '../fixtures/introspection/basic.json' with { type: 'json' };
import { withTempDir } from '../utils/temp-dir.js';
import { loadIntrospectionJSON, loadSchemaFromUrl } from '../../src/introspection/index.js';

describe('INTROS', () => {
  let server: ReturnType<typeof createServer>;
  let port: number;
  let requestCount = 0;
  let etagCount = 0;

  beforeEach(() => {
    requestCount = 0;
    etagCount = 0;
  });

  beforeAll(async () => {
    server = createServer((req, res) => {
      requestCount += 1;
      if (req.headers['if-none-match'] === '"v1"') {
        etagCount += 1;
        res.statusCode = 304;
        res.end();
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('ETag', '"v1"');
      res.end(JSON.stringify(introspectionData));
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('fetches and caches schema with ETag support', async () => {
    await withTempDir(async (dir) => {
      const url = `http://127.0.0.1:${port}`;
      const options = { cache: { dir, ttlMs: 60_000 } };
      const schema1 = await loadSchemaFromUrl(url, options);
      expect(schema1.getQueryType()?.name).toBe('Query');

      const schema2 = await loadSchemaFromUrl(url, options);
      expect(schema2.getQueryType()?.name).toBe('Query');

      expect(requestCount).toBeGreaterThanOrEqual(2);
      expect(etagCount).toBeGreaterThanOrEqual(1);
    });
  });

  it('differentiates cache entries by headers', async () => {
    await withTempDir(async (dir) => {
      const url = `http://127.0.0.1:${port}`;
      await loadSchemaFromUrl(url, { cache: { dir, ttlMs: 60_000 }, headers: { Authorization: 'token-a' } });
      await loadSchemaFromUrl(url, { cache: { dir, ttlMs: 60_000 }, headers: { Authorization: 'token-b' } });

      expect(requestCount).toBeGreaterThanOrEqual(2);
    });
  });

  it('exposes raw introspection JSON for downstream consumers', async () => {
    await withTempDir(async (dir) => {
      const url = `http://127.0.0.1:${port}`;
      const json = await loadIntrospectionJSON(url, { cache: { dir, ttlMs: 60_000 } });
      expect(json.__schema?.queryType?.name).toBe('Query');
      const schemaFromJson = buildClientSchema(json);
      expect(schemaFromJson.getType('User')).toBeDefined();
    });
  });
});
