import { promises as fs } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DocumentStore, prepareDocument } from '../../src/documents/index.js';
import { withTempDir } from '../utils/temp-dir.js';

describe('documents store', () => {
  it('resolves documents by name and appends fragments', async () => {
    await withTempDir(async (dir) => {
      const docsDir = path.join(dir, 'docs');
      const fragmentsDir = path.join(dir, 'fragments');
      await fs.mkdir(docsDir, { recursive: true });
      await fs.mkdir(fragmentsDir, { recursive: true });
      await fs.writeFile(
        path.join(docsDir, 'user.graphql'),
        `
          query user {
            user(id: "1") {
              ...UserFields
            }
          }
        `,
        'utf8'
      );
      await fs.writeFile(
        path.join(fragmentsDir, 'userFields.graphql'),
        `
          fragment UserFields on User {
            name
          }
        `,
        'utf8'
      );
      const store = new DocumentStore({
        rootDir: dir,
        documents: ['docs/**/*.graphql'],
        fragments: ['fragments/**/*.graphql'],
      });
      await store.init();
      const resolved = store.resolveByName('user');
      expect(resolved).toBeDefined();
      expect(resolved?.document).toContain('fragment UserFields');
    });
  });

  it('allows unnamed single operations when using prepareDocument', () => {
    const result = prepareDocument(
      `
        query {
          hello
        }
      `
    );
    expect(result.operationName).toBeUndefined();
    expect(result.document).toContain('query');
  });
});
