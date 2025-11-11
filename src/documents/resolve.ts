import { access } from 'node:fs/promises';
import path from 'node:path';

import { InvalidArgsError } from '../errors/exit.js';
import { DocumentStore, DocumentResolution, loadDocumentFromFile, prepareDocument } from './store.js';

export interface ResolveDocumentOptions {
  operationName?: string;
  store?: DocumentStore;
  searchDirs?: string[];
}

export async function resolveDocumentInput(value: string, options: ResolveDocumentOptions = {}): Promise<DocumentResolution> {
  const searchDirs = options.searchDirs ?? [process.cwd()];
  const candidatePath = await findExistingPath(value, searchDirs);
  if (candidatePath) {
    if (options.store) {
      return options.store.resolveFromPath(candidatePath, options.operationName);
    }
    return loadDocumentFromFile(candidatePath, { operationName: options.operationName });
  }

  if (options.store) {
    const fromStore = options.store.resolveByName(value);
    if (fromStore) {
      if (options.operationName && fromStore.operationName && fromStore.operationName !== options.operationName) {
        throw new InvalidArgsError(
          `Document "${value}" defines operation "${fromStore.operationName}". Use --operation-name=${fromStore.operationName} or omit the flag.`
        );
      }
      return fromStore;
    }
  }

  return prepareDocument(value, {
    operationName: options.operationName,
  });
}

export function findAutoDocument(store: DocumentStore | undefined, candidates: string[]): DocumentResolution | undefined {
  if (!store) {
    return undefined;
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = store.resolveByName(candidate);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
}

async function findExistingPath(value: string, searchDirs: string[]): Promise<string | undefined> {
  const attempts = new Set<string>();
  if (path.isAbsolute(value)) {
    attempts.add(value);
  } else {
    for (const dir of searchDirs) {
      attempts.add(path.resolve(dir, value));
    }
  }
  for (const candidate of attempts) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
