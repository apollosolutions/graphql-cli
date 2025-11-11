import { describe, expect, it } from 'vitest';

import { parseFields } from '../../src/fields/parser.js';

describe('fields parser', () => {
  it('parses simple selection list', () => {
    const fields = parseFields('id,name,profile { id }');
    expect(fields).toEqual([
      { name: 'id' },
      { name: 'name' },
      { name: 'profile', selection: [{ name: 'id' }] },
    ]);
  });

  it('throws on unexpected characters', () => {
    expect(() => parseFields('id, 123')).toThrow();
  });
});
