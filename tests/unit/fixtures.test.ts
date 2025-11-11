import { describe, expect, it } from 'vitest';

import { loadIntrospectionJSON, loadSchemaSDL } from '../utils/fixtures.js';

describe('fixture loaders', () => {
  it('loads schema SDL fixtures', async () => {
    const sdl = await loadSchemaSDL('basic');
    expect(sdl).toContain('type Query');
    expect(sdl).toContain('type User');
  });

  it('loads introspection JSON fixtures', async () => {
    const introspection = await loadIntrospectionJSON<{ data: { __schema: { types: Array<{ name: string }> } } }>('basic');
    const typeNames = introspection.data.__schema.types.map((type) => type.name);
    expect(typeNames).toContain('Query');
    expect(typeNames).toContain('User');
  });
});
