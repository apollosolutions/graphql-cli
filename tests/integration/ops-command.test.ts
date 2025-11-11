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
    internal: String!
  }

  type Mutation {
    ping: String!
  }
`);

const rootValue = {
  hello: () => 'world',
  user: ({ id }: { id: string }) => (id === '1' ? { id: '1', name: 'Ada' } : null),
  internal: () => 'secret',
  ping: () => 'pong',
};

describe('ops command', () => {
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

  it('lists operations for an explicit URL', async () => {
    const result = await runCliCapture(['ops', 'list', endpoint]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`Operations for ${endpoint}`);
    expect(result.stdout).toContain('Queries');
    expect(result.stdout).toContain('hello');
  });

  it('renders JSON output with endpoint metadata', async () => {
    await withProjectConfig(async (dir) => {
      const result = await runCliCapture(['ops', 'list', '--json']);
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.target.endpoint).toBe('api');
      const names = parsed.operations.map((op: { canonicalName: string }) => op.canonicalName);
      expect(names).toContain('user');
      expect(names).not.toContain('internal');
    });
  });

  it('supports endpoint ops subcommand with filters', async () => {
    await withProjectConfig(async () => {
      const result = await runCliCapture(['api', 'ops', '--kind', 'mutation', '--match', 'ping']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Mutations (1)');
      expect(result.stdout).toContain('ping');
      expect(result.stdout).not.toContain('Queries');
    });
  });

  async function withProjectConfig(run: (dir: string) => Promise<void>): Promise<void> {
    await withTempDir(async (dir) => {
      await fs.mkdir(path.join(dir, '.git'));
      const config = [
        'version: 1',
        'endpoints:',
        '  api:',
        `    url: ${endpoint}`,
        '    aliases:',
        '      hi: hello',
        '    help:',
        '      hide:',
        '        - Query.internal',
        '',
      ].join('\n');
      await fs.writeFile(path.join(dir, '.gqlrc.yml'), config, 'utf8');
      await run(dir);
    });
  }
});
