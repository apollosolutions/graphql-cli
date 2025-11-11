import { promises as fs } from 'node:fs';
import path from 'node:path';

import { expect } from 'vitest';

const GOLDEN_ROOT = path.resolve(__dirname, '..', 'golden');
const UPDATE = process.env.UPDATE_GOLDENS === '1' || process.env.UPDATE_GOLDENS === 'true';

export async function expectToMatchGolden(filename: string, actual: string): Promise<void> {
  const target = path.join(GOLDEN_ROOT, filename);
  await fs.mkdir(path.dirname(target), { recursive: true });

  const normalizedActual = normalize(actual);

  if (UPDATE || !(await fileExists(target))) {
    await fs.writeFile(target, normalizedActual, 'utf8');
    return;
  }

  const expected = normalize(await fs.readFile(target, 'utf8'));
  expect(normalizedActual).toBe(expected);
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function normalize(input: string): string {
  return input.replace(/\r\n/g, '\n');
}
