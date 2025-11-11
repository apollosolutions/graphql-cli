import { createServer, IncomingHttpHeaders } from 'node:http';
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
    ping: String!
    internal: String!
  }

  type Mutation {
    ping: String!
  }
`);

describe('config-driven endpoint commands', () => {
  let server: ReturnType<typeof createServer>;
  let endpointUrl: string;
  let lastQuery: string | undefined;
  let lastHeaders: IncomingHttpHeaders | undefined;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk as Buffer));
      req.on('end', async () => {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        lastHeaders = req.headers;
        lastQuery = body.query;
        const isMutation = /^\s*mutation\b/i.test(body.query);
        const dynamicRoot = {
          hello: () => 'world',
          user: ({ id }: { id: string }) => (id === '1' ? { id: '1', name: 'Ada' } : null),
          ping: () => (isMutation ? 'mutation-ping' : 'query-ping'),
          internal: () => 'hidden',
        };
        const result = await graphql({
          schema,
          source: body.query,
          rootValue: dynamicRoot,
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

  it('executes operations via endpoint name', async () => {
    await withProjectConfig(async () => {
      const result = await runCliCapture(['api', 'hello']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('"hello":"world"');
    });
  });

  it('honors aliases and disambiguates conflicts with config preference', async () => {
    await withProjectConfig(async () => {
      const aliasResult = await runCliCapture(['api', 'hi']);
      expect(aliasResult.exitCode).toBe(0);
      expect(aliasResult.stdout).toContain('"hello":"world"');

      const preferResult = await runCliCapture(['api', 'ping']);
      expect(preferResult.exitCode).toBe(0);
      expect(preferResult.stdout).toContain('"ping":"mutation-ping"');

      const overrideResult = await runCliCapture(['api', 'ping', '--kind', 'query']);
      expect(overrideResult.exitCode).toBe(0);
      expect(overrideResult.stdout).toContain('"ping":"query-ping"');
    });
  });

  it('renders endpoint help with rename/hide metadata', async () => {
    await withProjectConfig(async () => {
      const help = await runCliCapture(['api', '--help']);
      expect(help.exitCode).toBe(0);
      expect(help.stdout).toContain('Queries');
      expect(help.stdout).toContain('Mutations');
      expect(help.stdout).toContain('getUser'); // renamed display
      expect(help.stdout).not.toContain('internal');

      const opHelp = await runCliCapture(['api', 'user', '--help']);
      expect(opHelp.exitCode).toBe(0);
      expect(opHelp.stdout).toContain('Operation: Query.user');
      expect(opHelp.stdout).toContain('Arguments:');
      expect(opHelp.stdout).toContain('--var.<name>');
    });
  });

  it('suggests close operation names when missing', async () => {
    await withProjectConfig(async () => {
      const result = await runCliCapture(['api', 'helloo']);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('Did you mean: hello');
    });
  });

  it('auto loads configured documents when operation names match', async () => {
    await withProjectConfig(async () => {
      const result = await runCliCapture(['api', 'user', '--var.id', '1']);
      expect(result.exitCode).toBe(0);
      expect(lastQuery).toContain('fragment UserFields');
    });
  });

  it('resolves configured documents by name via --doc', async () => {
    await withProjectConfig(async () => {
      const result = await runCliCapture(['api', 'user', '--doc', 'GetUserDoc', '--var.id', '1']);
      expect(result.exitCode).toBe(0);
      expect(lastQuery).toContain('query GetUserDoc');
    });
  });

  async function withProjectConfig(run: () => Promise<void>): Promise<void> {
    await withTempDir(async (dir) => {
      await fs.mkdir(path.join(dir, '.git'));
      const docsDir = path.join(dir, 'graphql', 'documents');
      const fragmentsDir = path.join(dir, 'graphql', 'fragments');
      await fs.mkdir(docsDir, { recursive: true });
      await fs.mkdir(fragmentsDir, { recursive: true });
      await fs.writeFile(
        path.join(docsDir, 'user.graphql'),
        `
          query user($id: ID!) {
            user(id: $id) {
              ...UserFields
            }
          }
        `,
        'utf8'
      );
      await fs.writeFile(
        path.join(docsDir, 'getUserDoc.graphql'),
        `
          query GetUserDoc($id: ID!) {
            user(id: $id) {
              ...UserFields
            }
          }
        `,
        'utf8'
      );
      await fs.writeFile(
        path.join(fragmentsDir, 'userFields.graphql'),
        `
          fragment UserFields on User {
            name
          }
        `,
        'utf8'
      );
      const config = [
        'version: 1',
        'endpoints:',
        '  api:',
        `    url: ${endpointUrl}`,
        '    headers:',
        '      Authorization: Bearer CONFIG_TOKEN',
        '      X-Tenant: config',
        '    aliases:',
        '      hi: hello',
        '    help:',
        '      rename:',
        '        user: getUser',
        '      hide:',
        '        - Query.internal',
        '      preferKindOnConflict: mutation',
        '    documents:',
        '      - graphql/documents/**/*.graphql',
        '    fragments:',
        '      - graphql/fragments/**/*.graphql',
        '',
      ].join('\n');
      await fs.writeFile(path.join(dir, '.gqlrc.yml'), config, 'utf8');
      lastQuery = undefined;
      lastHeaders = undefined;
      await run();
    });
  }
  it('merges headers and allows removals', async () => {
    await withProjectConfig(async () => {
      const result = await runCliCapture(['api', 'hello', '--header', 'X-Tenant: cli', '--header', 'Authorization=']);
      expect(result.exitCode).toBe(0);
      expect(lastHeaders?.['x-tenant']).toBe('cli');
      expect(lastHeaders?.['authorization']).toBeUndefined();
    });
  });

  it('prints request diagnostics with redacted headers', async () => {
    await withProjectConfig(async () => {
      const result = await runCliCapture(['api', 'hello', '--print-request']);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[request] POST');
      expect(result.stderr).toContain('Authorization: ***REDACTED***');
      expect(result.stderr).toContain('X-Tenant: config');
      expect(result.stderr).not.toContain('CONFIG_TOKEN');
    });
  });
});
