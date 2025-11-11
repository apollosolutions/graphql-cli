import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildSchema, graphql } from 'graphql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };
import { expectToMatchGolden } from '../utils/golden.js';
import { runCliCapture } from '../utils/cli-runner.js';

const schema = buildSchema(/* GraphQL */ `
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    hello: String!
    user(id: ID!): User!
  }
`);

const data = {
  '1': { id: '1', name: 'Ada', email: 'ada@example.com' },
};

const rootValue = {
  hello: () => 'world',
  user: ({ id }: { id: string }) => data[id] ?? null,
};

describe('CLI basics', () => {
  let server: ReturnType<typeof createServer>;
  let endpoint: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk as Buffer));
      req.on('end', async () => {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const result = await graphql({ schema, source: body.query, rootValue, variableValues: body.variables });
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

  it('prints global help output', async () => {
    const result = await runCliCapture(['--help']);
    expect(result.exitCode).toBe(0);
    await expectToMatchGolden('cli-help-global.txt', result.stdout);
  });

  it('renders command-specific help', async () => {
    const result = await runCliCapture(['help', 'init']);
    expect(result.exitCode).toBe(0);
    await expectToMatchGolden('cli-help-init.txt', result.stdout);
  });

  it('shows the current version with --version', async () => {
    const result = await runCliCapture(['--version']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(packageJson.version);
  });

  it('emits completion snippet for zsh', async () => {
    const result = await runCliCapture(['completions', 'zsh']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('#compdef gql');
    expect(result.stdout).toContain('_gql_commands=(');
  });

  it('executes URL mode queries using a document file', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gql-doc-'));
    const docPath = path.join(tmpDir, 'getUser.graphql');
    await fs.writeFile(
      docPath,
      `
        query GetUser($id: ID!) {
          user(id: $id) {
            name
          }
        }
      `,
      'utf8'
    );
    const result = await runCliCapture([
      endpoint,
      'query',
      'user',
      '--doc',
      docPath,
      '--operation-name',
      'GetUser',
      '--var.id',
      '1',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"name":"Ada"');
  });

  it('executes URL mode queries', async () => {
    const result = await runCliCapture([endpoint, 'query', 'hello']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"hello":"world"');
  });

  it('executes URL mode with variables and fields', async () => {
    const result = await runCliCapture([
      endpoint,
      'query',
      'user',
      '--var.id',
      '1',
      '--fields',
      'name,email',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"name":"Ada"');
  });

  it('supports table output via --format table', async () => {
    const result = await runCliCapture([endpoint, 'query', 'hello', '--format', 'table']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello');
  });

  it('supports ndjson output via --format ndjson', async () => {
    const result = await runCliCapture([endpoint, 'query', 'hello', '--select', 'data.hello', '--format', 'ndjson']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('"world"');
  });

  it('warns on unknown commands', async () => {
    const result = await runCliCapture(['unknown-command']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown command');
  });

  it('prints request diagnostics with redacted headers in URL mode', async () => {
    const result = await runCliCapture([endpoint, 'query', 'hello', '--header', 'Authorization: secret', '--print-request']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('[request] POST');
    expect(result.stderr).toContain('Authorization: ***REDACTED***');
    expect(result.stderr).not.toContain('secret');
  });
});
