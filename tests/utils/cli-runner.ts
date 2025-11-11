import { PassThrough } from 'node:stream';

import { CommandIO } from '../../src/command-registry.js';
import { runCli } from '../../src/cli.js';

export interface CliRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runCliCapture(args: string[]): Promise<CliRunResult> {
  const stdout = new PassThrough();
  const stderr = new PassThrough();

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
  stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));

  const io: Partial<CommandIO> = { stdout, stderr };
  const exitCode = await runCli(args, io);

  stdout.end();
  stderr.end();

  return {
    exitCode,
    stdout: Buffer.concat(stdoutChunks).toString('utf8'),
    stderr: Buffer.concat(stderrChunks).toString('utf8'),
  };
}
