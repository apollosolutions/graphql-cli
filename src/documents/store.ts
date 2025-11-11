import { promises as fs } from 'node:fs';
import path from 'node:path';

import { glob } from 'tinyglobby';
import { DocumentNode, Kind, OperationDefinitionNode, OperationTypeNode, parse } from 'graphql';

import { InvalidArgsError } from '../errors/exit.js';

export interface DocumentResolution {
  document: string;
  operationName?: string;
}

export interface DocumentStoreOptions {
  rootDir: string;
  documents?: string[];
  fragments?: string[];
}

interface DocumentDefinition {
  name: string;
  type: OperationTypeNode;
  filePath: string;
  source: string;
}

export class DocumentStore {
  private initialized = false;
  private docsByName = new Map<string, DocumentDefinition>();
  private fragmentsText = '';

  constructor(private readonly options: DocumentStoreOptions) {}

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.loadFragments();
    await this.loadDocuments();
    this.initialized = true;
  }

  resolveByName(name: string): DocumentResolution | undefined {
    const doc = this.docsByName.get(name);
    if (!doc) {
      return undefined;
    }
    return {
      document: this.appendFragments(doc.source),
      operationName: doc.name,
    };
  }

  async resolveFromPath(filePath: string, operationName?: string): Promise<DocumentResolution> {
    const contents = await fs.readFile(filePath, 'utf8');
    return prepareDocument(contents, {
      operationName,
      fileLabel: filePath,
      fragments: this.fragmentsText,
    });
  }

  getFragmentsText(): string {
    return this.fragmentsText;
  }

  private async loadFragments(): Promise<void> {
    const patterns = this.options.fragments ?? [];
    if (patterns.length === 0) {
      this.fragmentsText = '';
      return;
    }
    const files = await this.globPatterns(patterns);
    const parts: string[] = [];
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const doc = parse(text);
      ensureOnlyFragments(doc, file);
      parts.push(text.trim());
    }
    this.fragmentsText = parts.filter(Boolean).join('\n\n');
  }

  private async loadDocuments(): Promise<void> {
    const patterns = this.options.documents ?? [];
    if (patterns.length === 0) {
      return;
    }
    const files = await this.globPatterns(patterns);
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const definitions = parse(text);
      const operations = extractOperations(definitions);
      if (operations.length === 0) {
        throw new InvalidArgsError(`Document ${formatPath(file)} does not contain any GraphQL operations.`);
      }
      for (const operation of operations) {
        const name = operation.name?.value;
        if (!name) {
          throw new InvalidArgsError(
            `Document ${formatPath(file)} defines an unnamed ${operation.operation} operation. Name it to reference via --doc.`
          );
        }
        if (this.docsByName.has(name)) {
          throw new InvalidArgsError(
            `Duplicate document name "${name}" encountered in ${formatPath(file)}. Each operation must be unique across configured documents.`
          );
        }
        this.docsByName.set(name, {
          name,
          type: operation.operation,
          filePath: file,
          source: text,
        });
      }
    }
  }

  private appendFragments(document: string): string {
    if (!this.fragmentsText) {
      return document;
    }
    return `${document.trim()}\n\n${this.fragmentsText}`;
  }

  private async globPatterns(patterns: string[]): Promise<string[]> {
    if (patterns.length === 0) {
      return [];
    }
    const results = await glob(patterns, {
      cwd: this.options.rootDir,
      absolute: true,
      onlyFiles: true,
    });
    return results;
  }
}

export async function loadDocumentFromFile(
  filePath: string,
  options: { operationName?: string; fragments?: string } = {}
): Promise<DocumentResolution> {
  const contents = await fs.readFile(filePath, 'utf8');
  return prepareDocument(contents, {
    operationName: options.operationName,
    fileLabel: filePath,
    fragments: options.fragments,
  });
}

export function prepareDocument(
  source: string,
  options: { operationName?: string; fileLabel?: string; fragments?: string } = {}
): DocumentResolution {
  const doc = parse(source);
  const operations = extractOperations(doc);
  if (operations.length === 0) {
    throw new InvalidArgsError(messagePrefix(options.fileLabel, 'Document does not contain any operations.'));
  }

  let target: OperationDefinitionNode;

  if (options.operationName) {
    const match = operations.find((op) => op.name?.value === options.operationName);
    if (!match) {
      const names = operations.map((op) => op.name?.value).filter(Boolean) as string[];
      const suffix = names.length > 0 ? ` Available operations: ${names.join(', ')}.` : '';
      throw new InvalidArgsError(
        messagePrefix(
          options.fileLabel,
          `Operation "${options.operationName}" not found.${suffix}`
        )
      );
    }
    target = match;
  } else {
    if (operations.length > 1) {
      const names = operations.map((op) => op.name?.value ?? '<unnamed>').join(', ');
      throw new InvalidArgsError(
        messagePrefix(
          options.fileLabel,
          `Document defines multiple operations (${names}). Use --operation-name to select one.`
        )
      );
    }
    target = operations[0];
  }

  const operationName = options.operationName ?? target.name?.value;
  if (!operationName && operations.length > 1) {
    throw new InvalidArgsError(
      messagePrefix(options.fileLabel, 'Operation must be named when a document defines multiple operations.')
    );
  }

  const document = options.fragments ? `${source.trim()}\n\n${options.fragments}` : source;

  return {
    document,
    operationName,
  };
}

function extractOperations(doc: DocumentNode): OperationDefinitionNode[] {
  return doc.definitions.filter(
    (definition): definition is OperationDefinitionNode => definition.kind === Kind.OPERATION_DEFINITION
  );
}

function ensureOnlyFragments(doc: DocumentNode, filePath: string): void {
  const invalid = doc.definitions.filter((def) => def.kind !== Kind.FRAGMENT_DEFINITION);
  if (invalid.length > 0) {
    throw new InvalidArgsError(
      `Fragments file ${formatPath(filePath)} contains non-fragment definitions. Only fragments are allowed.`
    );
  }
}

function messagePrefix(fileLabel: string | undefined, message: string): string {
  if (!fileLabel) {
    return message;
  }
  return `${message} (${formatPath(fileLabel)})`;
}

function formatPath(filePath: string): string {
  return path.relative(process.cwd(), filePath) || filePath;
}
