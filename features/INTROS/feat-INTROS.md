# Introspection Cache & Schema Index (INTROS)

## Goal
Implement schema discovery, caching, and lookup utilities that power URL mode and endpoint mode: fetch introspection once, persist it with TTL/ETag, and expose indexes for fast operation resolution.

## User stories
- As a CLI user, my first call against an endpoint introspects the schema, and subsequent calls reuse the cached copy unless it expires or changes.
- As a developer building new features, I can query helper APIs (e.g., `getSchemaCached`, `findRootOp`, `listOperations`) without re-implementing introspection parsing each time.

## Assumptions
- Cache directory lives under `${XDG_CACHE_HOME:-~/.cache}/gql/schemas` (configurable) and is writable.
- GraphQL servers support standard introspection query; advanced features (defer/stream) can be ignored for now.
- HTTP client from URLMODE/CFGDISC can pass through headers (auth) so introspection obeys user configuration.

## Open issues & risks
- Schemas can be large (MBs); need compression or pruning strategy to keep cache manageable.
- Header-sensitive caching: same URL with different auth headers may expose different schemas, so cache key must include hashed headers.
- Need robust invalidation strategy when servers change schema but keep same ETag; consider TTL fallback.

## Clarifying questions
- Should cache entries be human-readable JSON for debugging or binary (msgpack) for space?
- Do we allow manual cache control (`gql cache clear`, `--no-cache`) in MVP or later phases?
- How aggressively do we parallelize introspection fetches when multiple commands run concurrently?

## Scope
**Include**
- Introspection fetcher that issues standard query, handles HTTP errors, and retries with exponential backoff (hook into RETRIES later).
- Cache manager: file naming, TTL enforcement, ETag validation, header-hash keying, cleanup of stale entries.
- Schema index builder producing lookups by root type, operation name, argument metadata for VARMAPR.
- APIs consumed by URLMODE now and CFGDISC later (e.g., `getSchemaCached(url, headers)` returning `{ schema, fromCache }`).
**Exclude**
- Printing/exporting schema to disk for user consumption (covered by Phase 3 SCHEMAP/DOCDOC).
- Live schema polling or diffing (Phase 8 diagnostics).
- Subscription-specific introspection extensions.

## Design notes
- Cache key: hash of `url + sorted(headers subset)` to prevent auth leakage while isolating per-tenant schemas.
- Store both raw introspection JSON and derived metadata (indexes) to avoid recomputing on every command.
- Provide metrics hooks (cache hit/miss counters) for future telemetry but keep them no-ops for now.
- Respect env vars like `GQL_CACHE_DIR` for overrides; document fallback precedence.

## Tasks
- [x] Implementation
- [x] Docs/Help updates
- [x] Tests:
  - [x] Unit
  - [ ] Integration
  - [ ] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Implementation notes (2025-11-09)
- Added `src/introspection/index.ts` with `loadSchemaFromUrl`, which fetches introspection over HTTP, caches responses (default 1h TTL), and honors ETag/If-None-Match to avoid re-downloading unchanged schemas.
- Cache keys now hash the URL plus sorted header set, preventing cross-tenant bleed when different auth headers yield different schemas. Cached payloads include timestamps so TTL enforcement doesn’t rely on file mtime.
- Errors funnel through `NetworkError`, mapping to exit code 5 via ERRXIT.
- Documented behavior in `docs/introspection.md` and verified with unit tests (`tests/unit/introspection.test.ts`) that spin up a mock HTTP server to exercise caching + ETag + header differentiation.

## Acceptance criteria
- [x] Initial call to `getSchemaCached` hits network, persists result, and subsequent call returns cached schema within TTL.
- [x] Providing `If-None-Match` with stored ETag skips payload download when unchanged.
- [x] Cache key differentiates by URL + headers hash; calling same URL with different auth uses distinct entries.
- [ ] Schema indexes expose helpers used by URLMODE and upcoming CFGDISC/HELPEP features (operation lookup, arg metadata). *(Pending follow-up work to build operation indexes atop cached introspection.)*

## Dependencies
- Blocks: URLMODE, CFGDISC, HELPEP, DISAMBI, OPLIST, SCHEMAP, SELECTR.
- Blocked by: CORECLI (structure), TESTFIX (fixtures for introspection JSON), CISETUP (running tests).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
