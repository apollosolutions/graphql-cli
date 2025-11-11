# Response Cache & Replay (CACHRES)

## Goal
Implement optional response caching (per URL + query + variables) with TTL/ETag revalidation plus commands to inspect/replay cached responses for offline usage.

## User stories
- As a developer working offline, I can run `gql api users --cache` to reuse last successful response if server unreachable.
- As a tester, I can inspect cached responses via `gql cache responses list` and replay them for debugging.

## Assumptions
- Cache stored in filesystem similar to schema cache but keyed by request fingerprint (url, headers hash, operation hash).
- Users opt-in via config or flag (`--cache-response`, `cache.responses.enabled`).
- Sensitive payloads may live on disk; need warnings/controls.

## Open issues & risks
- Must avoid caching responses containing mutations unless explicitly allowed.
- Large responses may bloat disk; provide TTL + size limits + prune command.
- Need to respect HTTP cache headers (ETag/Cache-Control) when available.

## Clarifying questions
- Do we support offline replay command (serve as fake server) or just CLI consumption?
- Should we sign/encrypt cache entries? maybe optional for sensitive data.
- How do we handle partial caching (only query operations)?

## Scope
**Include**
- Cache writer/reader with TTL, size limit, and ETag revalidation support.
- CLI commands to list/clear/prune response cache similar to CACHSCM.
- Flags/config to enable caching per endpoint or command.
**Exclude**
- Distributed cache backend (Redis, etc.).
- Mutation caching (default off) beyond manual override.
- Transparent offline mode (maybe future).

## Design notes
- Key: hash(url + headers subset + operation signature + variables) to avoid collisions.
- Store metadata (timestamp, status, headers) + body. Maybe compress JSON to save space.
- Provide `--cache-mode` options: `off`, `read`, `write`, `read-write`, `bust`.

## Tasks
- [ ] Implementation
- [ ] Docs/Help updates
- [ ] Tests:
  - [ ] Unit
  - [ ] Integration
  - [ ] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Acceptance criteria
- [ ] Response cache can be enabled via config/flag and reused when TTL valid.
- [ ] Cache respects HTTP validators (ETag/Last-Modified) when provided.
- [ ] CLI commands list/clear/prune entries with metadata output.
- [ ] Security controls documented (encryption optional, warnings on sensitive data).

## Dependencies
- Blocks: offline workflows, diagnostics, performance improvements.
- Blocked by: INTROS caching infrastructure (patterns), HDRMGMT (header hashing), CORECLI (flags), TESTFIX.

## Rollout
- [ ] Behind flag? y (beta)
- [ ] Docs updated
- [ ] Changelog entry
