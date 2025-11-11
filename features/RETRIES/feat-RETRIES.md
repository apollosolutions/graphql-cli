# Retry Policy (RETRIES)

## Goal
Add configurable retry policies (max attempts, backoff strategies) for HTTP/network failures and selected GraphQL errors, with per-endpoint overrides and logging hooks.

## User stories
- As an SRE, I can configure `retries.maxAttempts: 3, backoff: exponential` in `.gqlrc.yml` so transient network issues are retried automatically.
- As a CLI user, I can override via `--retries 0` or `--retry-kind network` for ad-hoc commands.

## Assumptions
- TIMEOUT feature provides request timeout values; RETRIES wraps around to reissue requests.
- Logging/tracing should capture retry attempts with delays.
- Not all operations safe to retry (mutations) unless explicitly allowed.

## Open issues & risks
- Need idempotency detection: default to retrying queries only unless user opts-in for mutations.
- Should we respect Retry-After headers? (if present, yes.)
- Prevent infinite loops; ensure jitter/backoff implemented correctly.

## Clarifying questions
- Do we allow custom retry conditions via CLI/pluggable functions?
- How to expose metrics (# retries, final success/failure) to users/logs?
- Should retries integrate with response cache (e.g., fallback to cache on failure)?

## Scope
**Include**
- Retry config schema: `maxAttempts`, `backoff` (none, linear, exponential), `baseMs`, `maxDelay`, `retryOn` (network, http5xx, graphqlErrors).
- CLI flags for quick overrides.
- Logging/tracing integration to show attempts + delay durations.
**Exclude**
- Circuit breaker state machine (maybe future).
- Parallel retries/speculative execution.

## Design notes
- Implement wrapper around request executor handling retries with Promise loop.
- Provide hook for plugins to observe retries (via PLUGNREQ maybe) but ensure they know attempt count.
- Respect `Retry-After` header when available (cap at max delay).

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
- [ ] Requests retry per config, with logs showing attempt counts/delays.
- [ ] Queries retried by default; mutations only when `allowMutationRetries` set (or via flag).
- [ ] `Retry-After` header respected when provided.
- [ ] Tests simulate network failures + GraphQL errors to verify behavior.

## Dependencies
- Blocks: TIMEOUT interplay, diagnostics, reliability.
- Blocked by: CORECLI (flag wiring), HTTP2/transport layer, LOGTRCE (logging), TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
