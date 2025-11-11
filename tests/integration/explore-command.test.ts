import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runCliCapture } from '../utils/cli-runner';
import { withTempDir } from '../utils/temp-dir';

const sandboxBase = 'https://studio.apollographql.com/sandbox/explorer?endpoint=';

describe('explore command', () => {
  let server: ReturnType<typeof createServer>;
  let endpointUrl: string;
  const previous = process.env.GQL_NO_BROWSER;

  beforeAll(async () => {
    process.env.GQL_NO_BROWSER = '1';
    server = createServer((_, res) => {
      res.statusCode = 200;
      res.end('ok');
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    endpointUrl = `http://127.0.0.1:${port}/graphql`;
  });

  afterAll(async () => {
    if (previous === undefined) {
      delete process.env.GQL_NO_BROWSER;
    } else {
      process.env.GQL_NO_BROWSER = previous;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('prints sandbox URL for ad-hoc endpoints', async () => {
    const result = await runCliCapture(['explore', endpointUrl]);
    expect(result.exitCode).toBe(0);
    const expected = `${sandboxBase}${encodeURIComponent(endpointUrl)}`;
    expect(result.stdout).toContain(expected);
  });

  it('resolves named endpoints from config', async () => {
    await withProjectConfig(async () => {
      const result = await runCliCapture(['explore', 'api']);
      expect(result.exitCode).toBe(0);
      const expected = `${sandboxBase}${encodeURIComponent(endpointUrl)}`;
      expect(result.stdout).toContain(expected);
      expect(result.stdout).toContain('api');
    });
  });

  async function withProjectConfig(run: () => Promise<void>): Promise<void> {
    await withTempDir(async (dir) => {
      await fs.mkdir(path.join(dir, '.git'));
      const config = ['version: 1', 'endpoints:', '  api:', `    url: ${endpointUrl}`, ''].join('\n');
      await fs.writeFile(path.join(dir, '.gqlrc.yml'), config, 'utf8');
      await run();
    });
  }
});
