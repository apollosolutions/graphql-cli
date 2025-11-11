import { spawn } from 'node:child_process';

import jmespath from 'jmespath';

import { InvalidArgsError } from '../errors/exit.js';
import type { GraphQLResponseLike } from './json.js';

export interface SelectionOptions {
  select?: string;
  jq?: string;
  jqBinary?: string;
  env?: NodeJS.ProcessEnv;
}

const DEFAULT_JQ_BIN_VAR = 'GQL_JQ_BIN';

export async function transformGraphQLResult(
  result: GraphQLResponseLike,
  options: SelectionOptions = {}
): Promise<{ payload: unknown; text?: string }> {
  if (!options.select && !options.jq) {
    return { payload: result };
  }

  let current: unknown = result;

  if (options.select) {
    current = applySelect(current, options.select);
  }

  if (options.jq) {
    const jqText = await runJq(current, options.jq, {
      jqBinary: options.jqBinary ?? options.env?.[DEFAULT_JQ_BIN_VAR] ?? process.env[DEFAULT_JQ_BIN_VAR] ?? 'jq',
    });
    return { payload: current, text: jqText };
  }

  return { payload: current };
}

function applySelect(source: unknown, expression: string): unknown {
  try {
    const result = jmespath.search(source, expression);
    return result ?? null;
  } catch (error) {
    throw new InvalidArgsError(`Invalid --select expression: ${(error as Error).message}`);
  }
}

async function runJq(input: unknown, expression: string, options: { jqBinary: string }): Promise<string> {
  const jqBinary = options.jqBinary;
  const serialized = JSON.stringify(input ?? null);

  return new Promise((resolve, reject) => {
    const proc = spawn(jqBinary, [expression], { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    proc.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    proc.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));

    proc.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(
          new InvalidArgsError(
            `jq binary "${jqBinary}" not found. Install jq or set ${DEFAULT_JQ_BIN_VAR} to a custom path.`
          )
        );
        return;
      }
      reject(error);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
        reject(new InvalidArgsError(`jq exited with code ${code}.${stderr ? `\n${stderr}` : ''}`));
        return;
      }
      resolve(Buffer.concat(stdoutChunks).toString('utf8'));
    });

    proc.stdin.end(serialized);
  });
}
