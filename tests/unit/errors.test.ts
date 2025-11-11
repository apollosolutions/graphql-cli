import { PassThrough } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CommandRegistry } from '../../src/command-registry.js';
import { InvalidArgsError } from '../../src/errors/exit.js';

function captureIo() {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
  stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));
  return {
    io: { stdout, stderr },
    readStdout: () => Buffer.concat(stdoutChunks).toString('utf8'),
    readStderr: () => Buffer.concat(stderrChunks).toString('utf8'),
  };
}

describe('ERRXIT integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.GQL_DEBUG;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('maps InvalidArgsError to exit code 2', async () => {
    const registry = new CommandRegistry({ version: '0.0.0' });
    registry.register({
      name: 'invalid',
      summary: 'throw invalid',
      handler: () => {
        throw new InvalidArgsError('Invalid fields provided.');
      },
    });

    const recorder = captureIo();
    const code = await registry.run(['invalid'], recorder.io);

    expect(code).toBe(2);
    expect(recorder.readStderr()).toContain('Invalid fields provided.');
  });

  it('prints stack when GQL_DEBUG=1 for unexpected errors', async () => {
    process.env.GQL_DEBUG = '1';
    const registry = new CommandRegistry({ version: '0.0.0' });
    registry.register({
      name: 'crash',
      summary: 'throw generic error',
      handler: () => {
        throw new Error('Crash!');
      },
    });

    const recorder = captureIo();
    const code = await registry.run(['crash'], recorder.io);

    expect(code).toBe(6);
    const stderr = recorder.readStderr();
    expect(stderr).toContain('Unexpected error');
    expect(stderr).toContain('Crash!');
  });
});
