import { describe, expect, it } from 'vitest';

import { formatGraphQLResponse } from '../../src/output/json.js';

describe('OUTJSON formatter', () => {
  it('pretty prints when tty true', () => {
    const output = formatGraphQLResponse(
      { data: { hello: 'world' } },
      { tty: true, env: { ...process.env } }
    );
    expect(output).toContain('\n  "data"');
    expect(output).toContain('\n    "hello"');
  });

  it('compact prints when tty false', () => {
    const output = formatGraphQLResponse(
      { data: { hello: 'world' } },
      { tty: false }
    );
    expect(output).toBe('{"data":{"hello":"world"}}\n');
  });

  it('honors GQL_PRETTY env override', () => {
    const output = formatGraphQLResponse(
      { data: { hello: 'world' } },
      { env: { ...process.env, GQL_PRETTY: '1' }, tty: false }
    );
    expect(output).toContain('\n  "data"');
    expect(output).toContain('\n    "hello"');
  });

  it('renders raw payload verbatim when rawResult provided', () => {
    const output = formatGraphQLResponse(
      { data: null },
      { rawResult: '{"raw":true}' }
    );
    expect(output).toBe('{"raw":true}\n');
  });

  it('includes errors array when provided', () => {
    const output = formatGraphQLResponse(
      {
        errors: [
          {
            message: 'Boom',
            path: ['query', 'user'],
          },
        ],
      },
      { tty: false }
    );
    expect(output).toContain('"errors"');
  });
});
