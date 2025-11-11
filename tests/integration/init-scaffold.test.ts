import { promises as fs } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runCliCapture } from '../utils/cli-runner.js';
import { fileExists, withTempDir } from '../utils/temp-dir.js';

describe('gql init scaffolding', () => {
  it('creates config, docs, and env files', async () => {
    await withTempDir(async (dir) => {
      const result = await runCliCapture([
        'init',
        '--yes',
        '--endpoint-name',
        'example',
        '--endpoint-url',
        'https://example.com/graphql',
        '--auth-strategy',
        'bearer',
        '--auth-env',
        'EXAMPLE_TOKEN',
      ]);

      expect(result.exitCode).toBe(0);

      const config = await fs.readFile(path.join(dir, '.gqlrc.yml'), 'utf8');
      expect(config).toContain('defaultEndpoint: example');
      expect(config).toContain('Authorization');

      const operation = await fs.readFile(path.join(dir, 'graphql/operations/SampleQuery.graphql'), 'utf8');
      expect(operation).toContain('query SampleQuery');

      const envFile = await fs.readFile(path.join(dir, '.env.example'), 'utf8');
      expect(envFile).toContain('EXAMPLE_TOKEN');
    });
  });

  it('refuses to overwrite config without --force', async () => {
    await withTempDir(async (dir) => {
      await fs.writeFile(path.join(dir, '.gqlrc.yml'), '# existing');
      const result = await runCliCapture(['init', '--yes', '--endpoint-url', 'https://example.com/graphql']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('already exists');
    });
  });

  it('skips docs/env when requested', async () => {
    await withTempDir(async () => {
      const result = await runCliCapture([
        'init',
        '--yes',
        '--endpoint-name',
        'ops',
        '--endpoint-url',
        'https://example.org/graphql',
        '--skip-docs',
        '--skip-env',
        '--force',
      ]);

      expect(result.exitCode).toBe(0);
      expect(await fileExists('graphql/operations/SampleQuery.graphql')).toBe(false);
      expect(await fileExists('.env.example')).toBe(false);
    });
  });
});
