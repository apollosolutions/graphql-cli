import { promises as fs } from 'node:fs';
import path from 'node:path';

const FIXTURES_ROOT = path.resolve(__dirname, '..', 'fixtures');

export async function loadSchemaSDL(name: string): Promise<string> {
  const filePath = path.join(FIXTURES_ROOT, 'schemas', `${name}.graphql`);
  return fs.readFile(filePath, 'utf8');
}

export async function loadIntrospectionJSON<T = unknown>(name: string): Promise<T> {
  const filePath = path.join(FIXTURES_ROOT, 'introspection', `${name}.json`);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}
