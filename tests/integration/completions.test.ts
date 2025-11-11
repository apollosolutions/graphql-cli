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

describe('gql completions', () => {
  let server: ReturnType<typeof createServer>;
  let endpointUrl: string;

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
    endpointUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('embeds endpoints and operations in zsh snippet', async () => {
    await withProjectConfig(async () => {
      const result = await runCliCapture(['completions', 'zsh']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('_gql_commands=(');
      expect(result.stdout).toContain('api');
      expect(result.stdout).toContain('_gql_endpoint_ops');
      expect(result.stdout).toContain('getUser');
      expect(result.stdout).toContain('hi');
    });
  });

  it('falls back to base commands when no config exists', async () => {
    const result = await runCliCapture(['completions', 'bash']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('# bash completion for gql');
  });

  async function withProjectConfig(run: () => Promise<void>): Promise<void> {
    await withTempDir(async (dir) => {
      await fs.mkdir(path.join(dir, '.git'));
      const config = [
        'version: 1',
        'endpoints:',
        '  api:',
        `    url: ${endpointUrl}`,
        '    aliases:',
        '      hi: hello',
        '    help:',
        '      rename:',
        '        user: getUser',
        '',
      ].join('\n');
      await fs.writeFile(path.join(dir, '.gqlrc.yml'), config, 'utf8');
      await run();
    });
  }
});
