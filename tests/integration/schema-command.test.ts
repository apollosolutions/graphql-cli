import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { buildSchema, graphql } from 'graphql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runCliCapture } from '../utils/cli-runner.js';
import { withTempDir } from '../utils/temp-dir.js';

const schema = buildSchema(/* GraphQL */ `
  type User {
    id: ID!
    name: String!
  }

  type Query {
    hello: String!
    user(id: ID!): User
  }
`);

const rootValue = {
  hello: () => 'world',
  user: ({ id }: { id: string }) => (id === '1' ? { id: '1', name: 'Ada' } : null),
};

describe('schema command', () => {
  let server: ReturnType<typeof createServer>;
  let endpoint: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk as Buffer));
      req.on('end', async () => {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const result = await graphql({
          schema,
          source: body.query,
          rootValue,
          variableValues: body.variables,
        });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    endpoint = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('prints SDL for URL targets by default', async () => {
    const result = await runCliCapture(['schema', endpoint]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('type Query');
    expect(result.stdout).toContain('type User');
  });

  it('renders introspection JSON when requested', async () => {
    const result = await runCliCapture(['schema', 'print', endpoint, '--format', 'json']);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout.trim());
    expect(parsed.__schema).toBeDefined();
    expect(Array.isArray(parsed.__schema.types)).toBe(true);
  });

  it('saves schema output to a file', async () => {
    await withTempDir(async (dir) => {
      const result = await runCliCapture(['schema', 'save', endpoint, '--out', 'schema.graphql']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Saved SDL schema');
      const saved = await fs.readFile(path.join(dir, 'schema.graphql'), 'utf8');
      expect(saved).toContain('type Query');
    });
  });

  it('uses project config defaults when no target is provided', async () => {
    await withTempDir(async (dir) => {
      await fs.mkdir(path.join(dir, '.git'));
      const config = ['version: 1', 'endpoints:', '  api:', `    url: ${endpoint}`, ''].join('\n');
      await fs.writeFile(path.join(dir, '.gqlrc.yml'), config, 'utf8');
      const result = await runCliCapture(['schema']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('type Query');
    });
  });

  it('requires --out for the save action', async () => {
    const result = await runCliCapture(['schema', 'save', endpoint]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('requires --out');
  });
});
