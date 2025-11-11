import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';

import { buildSchema, graphql } from 'graphql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { InvalidArgsError, NetworkError } from '../../src/errors/exit.js';
import { runUrlMode } from '../../src/urlmode/index.js';

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

const users = {
  '1': { id: '1', name: 'Ada', email: 'ada@example.com' },
};

const rootValue = {
  hello: () => 'world',
  user: ({ id }: { id: string }) => users[id] ?? null,
};

describe('runUrlMode', () => {
  let server: ReturnType<typeof createServer>;
  let url: string;

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
    url = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('executes a query with default selections', async () => {
    const result = await runUrlMode({
      endpoint: url,
      kind: 'query',
      operationName: 'hello',
      variables: {},
    });

    expect(result.result.data).toEqual({ hello: 'world' });
  });

  it('executes query with variables and custom fields', async () => {
    const result = await runUrlMode({
      endpoint: url,
      kind: 'query',
      operationName: 'user',
      variables: { id: '1' },
      options: { fields: 'name,email' },
    });

    expect(result.result.data).toEqual({ user: { name: 'Ada', email: 'ada@example.com' } });
  });

  it('executes with a custom document', async () => {
    const result = await runUrlMode({
      endpoint: url,
      kind: 'query',
      operationName: 'hello',
      variables: {},
      options: { document: 'query { hello }' },
    });
    expect(result.result.data).toEqual({ hello: 'world' });
  });

  it('throws on missing required variables', async () => {
    await expect(
      runUrlMode({
        endpoint: url,
        kind: 'query',
        operationName: 'user',
        variables: {},
      })
    ).rejects.toThrow(InvalidArgsError);
  });

  it('throws on HTTP errors', async () => {
    const failServer = createServer((_, res) => {
      res.statusCode = 500;
      res.end('boom');
    });
    await new Promise<void>((resolve) => failServer.listen(0, resolve));
    const { port } = failServer.address() as AddressInfo;
    const failUrl = `http://127.0.0.1:${port}`;

    await expect(
      runUrlMode({
        endpoint: failUrl,
        kind: 'query',
        operationName: 'hello',
        variables: {},
      })
    ).rejects.toThrow(NetworkError);

    await new Promise<void>((resolve) => failServer.close(() => resolve()));
  });
});
