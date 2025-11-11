import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { expectToMatchGolden } from '../utils/golden.js';
import { runCliCapture } from '../utils/cli-runner.js';

describe('render-json command', () => {
  it('pretty prints when --pretty passed', async () => {
    const result = await runCliCapture([
      'render-json',
      '--data',
      '{"hello":"world"}',
      '--pretty',
    ]);

    expect(result.exitCode).toBe(0);
    await expectToMatchGolden('render-json-pretty.txt', result.stdout);
  });

  it('compacts when --compact passed', async () => {
    const result = await runCliCapture([
      'render-json',
      '--data',
      '{"hello":"world"}',
      '--compact',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('{"data":{"hello":"world"}}');
  });

  it('outputs raw payload when --raw used', async () => {
    const result = await runCliCapture([
      'render-json',
      '--raw',
      '{"raw":true}',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('{"raw":true}');
  });

  it('returns exit code 2 for invalid JSON', async () => {
    const result = await runCliCapture([
      'render-json',
      '--data',
      '{not-json}',
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid JSON');
  });

  it('returns exit code 6 for unexpected errors', async () => {
    const result = await runCliCapture([
      'render-json',
      '--simulate-internal',
    ]);

    expect(result.exitCode).toBe(6);
    expect(result.stderr).toContain('Unexpected error');
  });

  it('applies --select expressions before printing', async () => {
    const result = await runCliCapture([
      'render-json',
      '--data',
      '{"hello":"world"}',
      '--select',
      'data.hello',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('"world"');
  });

  it('pipes through jq when --jq is specified', async () => {
    await withFakeJq(async () => {
      const result = await runCliCapture([
        'render-json',
        '--data',
        '{"hello":"world"}',
        '--jq',
        '.data.hello',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('"world-from-jq"');
    });
  });

  it('renders table output when --format table is provided', async () => {
    const result = await runCliCapture([
      'render-json',
      '--data',
      '{"users":[{"id":1,"name":"Ada"},{"id":2,"name":"Bob"}]}',
      '--select',
      'data.users',
      '--format',
      'table',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('id');
    expect(result.stdout).toContain('name');
    expect(result.stdout).toContain('Ada');
    expect(result.stdout).toContain('Bob');
  });

  it('renders ndjson output when --format ndjson is provided', async () => {
    const result = await runCliCapture([
      'render-json',
      '--data',
      '{"users":[{"id":1,"name":"Ada"},{"id":2,"name":"Bob"}]}',
      '--select',
      'data.users',
      '--format',
      'ndjson',
    ]);

    expect(result.exitCode).toBe(0);
    const lines = result.stdout.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Ada');
    expect(lines[1]).toContain('Bob');
  });

  it('rejects --format table combined with --jq', async () => {
    const result = await runCliCapture([
      'render-json',
      '--data',
      '{"hello":"world"}',
      '--format',
      'table',
      '--jq',
      '.data',
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('--jq cannot be combined with --format table');
  });

  it('fails on invalid select expressions', async () => {
    const result = await runCliCapture([
      'render-json',
      '--data',
      '{"hello":"world"}',
      '--select',
      'data[',
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid --select expression');
  });
});

async function withFakeJq(run: () => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gql-jq-'));
  const jqPath = path.join(dir, 'jq');
  const script = [
    '#!/usr/bin/env node',
    'const fs = require("node:fs");',
    'const expr = process.argv[2];',
    'let input = "";',
    'process.stdin.on("data", (chunk) => (input += chunk));',
    'process.stdin.on("end", () => {',
    '  const json = JSON.parse(input);',
    '  if (expr === ".data.hello") {',
    '    process.stdout.write(JSON.stringify("world-from-jq"));',
    '  } else {',
    '    process.stdout.write(JSON.stringify(json));',
    '  }',
    '});',
  ].join('\n');
  await fs.writeFile(jqPath, script, { mode: 0o755 });
  const previous = process.env.GQL_JQ_BIN;
  process.env.GQL_JQ_BIN = jqPath;
  try {
    await run();
  } finally {
    if (previous === undefined) {
      delete process.env.GQL_JQ_BIN;
    } else {
      process.env.GQL_JQ_BIN = previous;
    }
  }
}
