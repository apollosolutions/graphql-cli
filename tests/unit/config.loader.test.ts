import { promises as fs } from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import type { GqlConfig } from '../../src/config/index.js';
import {
  clearConfigCache,
  ConfigNotFoundError,
  ConfigValidationError,
  loadConfig,
  resolveEndpoint,
} from '../../src/config/index.js';
import { InvalidArgsError } from '../../src/errors/exit.js';
import { withTempDir } from '../utils/temp-dir.js';

describe('config loader (CFGDISC)', () => {
  beforeEach(() => {
    clearConfigCache();
  });

  it('discovers configs up to repo root and prefers .gqlrc.yml', async () => {
    await withTempDir(async (tmp) => {
      const repoRoot = path.join(tmp, 'repo');
      const nested = path.join(repoRoot, 'services', 'api');
      await fs.mkdir(nested, { recursive: true });
      await fs.mkdir(path.join(repoRoot, '.git'));

      const repoConfigPath = path.join(repoRoot, '.gqlrc.yml');
      const parentConfigPath = path.join(tmp, '.gqlrc.yml');

      await fs.writeFile(
        parentConfigPath,
        [
          'version: 1',
          'endpoints:',
          '  parent:',
          '    url: https://parent.example.com/graphql',
          '',
        ].join('\n'),
        'utf8'
      );

      await fs.writeFile(
        repoConfigPath,
        [
          'version: 1',
          'defaultEndpoint: api',
          'endpoints:',
          '  api:',
          '    url: https://repo.example.com/graphql',
          '',
        ].join('\n'),
        'utf8'
      );

      const result = await loadConfig({ cwd: nested, useCache: false });
      const resolvedRepoConfigPath = await fs.realpath(repoConfigPath);
      expect(result.filePath).toBe(resolvedRepoConfigPath);
      expect(result.defaultEndpoint.name).toBe('api');
      expect(result.config.endpoints.api.url).toBe('https://repo.example.com/graphql');
    });
  });

  it('parses env substitutions with defaults', async () => {
    await withTempDir(async (tmp) => {
      const configPath = path.join(tmp, 'gql.config.yml');
      await fs.writeFile(
        configPath,
        [
          'version: 1',
          'endpoints:',
          '  api:',
          '    url: https://example.com/graphql',
          '    headers:',
          '      Authorization: "Bearer ${API_TOKEN}"',
          '      X-Tenant: "${TENANT_ID:-public}"',
          '',
        ].join('\n'),
        'utf8'
      );

      const result = await loadConfig({
        path: configPath,
        env: {
          API_TOKEN: 'secret',
        },
      });

      expect(result.config.endpoints.api.headers).toEqual({
        Authorization: 'Bearer secret',
        'X-Tenant': 'public',
      });
    });
  });

  it('throws when env vars are missing and no default provided', async () => {
    await withTempDir(async (tmp) => {
      const configPath = path.join(tmp, '.gqlrc.yml');
      await fs.writeFile(
        configPath,
        [
          'version: 1',
          'endpoints:',
          '  api:',
          '    url: https://example.com/graphql',
          '    headers:',
          '      Authorization: "Bearer ${API_TOKEN}"',
          '',
        ].join('\n'),
        'utf8'
      );

      await expect(loadConfig({ path: configPath, env: {} })).rejects.toThrow(ConfigValidationError);
    });
  });

  it('validates default endpoint references', async () => {
    await withTempDir(async (tmp) => {
      const configPath = path.join(tmp, '.gqlrc.yml');
      await fs.writeFile(
        configPath,
        [
          'version: 1',
          'defaultEndpoint: missing',
          'endpoints:',
          '  api:',
          '    url: https://example.com/graphql',
          '',
        ].join('\n'),
        'utf8'
      );

      await expect(loadConfig({ path: configPath })).rejects.toThrow(ConfigValidationError);
    });
  });

  it('throws when no config file is discovered', async () => {
    await withTempDir(async () => {
      await expect(loadConfig()).rejects.toThrow(ConfigNotFoundError);
    });
  });

  it('resolves explicit endpoints and errors on unknown names', async () => {
    const config: GqlConfig = {
      version: 1,
      endpoints: {
        alpha: { url: 'https://alpha.example.com' },
        beta: { url: 'https://beta.example.com' },
      },
    };
    const beta = resolveEndpoint(config, 'beta');
    expect(beta.name).toBe('beta');
    expect(beta.config.url).toBe('https://beta.example.com');
    expect(() => resolveEndpoint(config, 'gamma')).toThrow(InvalidArgsError);
  });
});
