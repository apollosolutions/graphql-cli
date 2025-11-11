import { describe, expect, it } from 'vitest';

import { buildHeaders, parseHeaderDirective } from '../../src/http/headers.js';

describe('header utilities', () => {
  it('parses colon and equals directives', () => {
    expect(parseHeaderDirective('X-Tenant: demo')).toEqual({
      name: 'X-Tenant',
      value: 'demo',
      action: 'set',
    });
    expect(parseHeaderDirective('API_KEY=abc123')).toEqual({
      name: 'API_KEY',
      value: 'abc123',
      action: 'set',
    });
  });

  it('marks directives with empty values as removals', () => {
    expect(parseHeaderDirective('Authorization=')).toEqual({
      name: 'Authorization',
      action: 'remove',
    });
  });

  it('merges layers with overrides and preserves directive order', () => {
    const baseHeaders = { Authorization: 'Bearer config', 'X-Tenant': 'alpha' };
    const first = buildHeaders([{ headers: baseHeaders }]);
    expect(first.headers).toMatchObject({
      Authorization: 'Bearer config',
      'X-Tenant': 'alpha',
    });

    const directives = [
      { name: 'authorization', action: 'set', value: 'Bearer cli' } as const,
      { name: 'X-Tenant', action: 'set', value: 'beta' } as const,
      { name: 'Authorization', action: 'remove' } as const,
      { name: 'Authorization', action: 'set', value: 'Bearer final' } as const,
    ];
    const merged = buildHeaders([{ headers: baseHeaders }, { directives: Array.from(directives) }]);
    expect(merged.headers).toMatchObject({
      Authorization: 'Bearer final',
      'X-Tenant': 'beta',
    });
  });

  it('redacts sensitive headers in the redacted view', () => {
    const built = buildHeaders([
      { headers: { Authorization: 'Bearer secret', 'X-Tenant': 'demo' } },
    ]);
    expect(built.redacted.Authorization).toBe('***REDACTED***');
    expect(built.redacted['X-Tenant']).toBe('demo');
  });
});
