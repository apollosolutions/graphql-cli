# Introspection Cache

`src/introspection/index.ts` exposes `loadSchemaFromUrl(url, options)` which:

1. Issues the standard GraphQL introspection query via `fetch`.
2. Caches the raw result under `~/.gql/cache/introspection/` (or a caller-provided `cache.dir`).
3. Respects `ttlMs` (default 1 hour) and `ETag` headers so repeat CLI invocations avoid redundant network calls.

Usage:

```ts
const schema = await loadSchemaFromUrl(endpoint, {
  headers: { Authorization: `Bearer ${token}` },
  cache: { ttlMs: 5 * 60_000 },
});
```

Errors throw `NetworkError`, flowing through ERRXIT so non-200 responses map to exit code 5. Tests live in `tests/unit/introspection.test.ts` and spin up a mock server to verify caching + ETag behavior.

Need raw introspection JSON? Use the sibling helper:

```ts
import { loadIntrospectionJSON } from '../introspection';

const json = await loadIntrospectionJSON(endpoint, { headers });
```

`loadSchemaFromUrl` now calls `loadIntrospectionJSON` internally so features such as `gql schema print --format json` can reuse the same cache entry without issuing duplicate network calls.
