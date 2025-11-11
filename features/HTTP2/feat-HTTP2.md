# HTTP/2 & Connection Tuning (HTTP2)

## Goal
Support HTTP/2 (and optional HTTP/1.1 fallback) with configuration for max concurrent streams, keepalive, and ALPN negotiation to improve performance against modern GraphQL servers.

## User stories
- As a user hitting Apollo Router, I can enable `--http2` to reuse a single connection for pagination loops, reducing latency.
- As an SRE, I can configure timeouts/keepalive per endpoint to avoid idle disconnects.

## Assumptions
- Runtime uses undici or another client capable of HTTP/2.
- Some servers may not support HTTP/2; CLI must fallback gracefully to HTTP/1.1 when handshake fails.
- HDRMGMT/AUTH interplay remains unchanged regardless of protocol.

## Open issues & risks
- Node HTTP/2 client has different APIs vs HTTP/1.1; need abstraction layer.
- TLS and certificate handling differs (ALPN). Need config knobs for custom CA, insecure skip verify.
- Some proxies block HTTP/2; detection + fallback essential.

## Clarifying questions
- Should HTTP/2 be enabled per endpoint config or via CLI flag? (likely both.)
- Do we support prior knowledge (h2c) or only TLS ALPN? maybe later.
- How do we expose metrics (streams reused, resets) to LOGTRCE?

## Scope
**Include**
- Transport abstraction supporting HTTP/1.1 + HTTP/2 with runtime detection.
- Config/flags (`--http2`, endpoint `request.http2: true`, keepalive settings).
- Diagnostics to show protocol used + connection stats.
**Exclude**
- HTTP/3/QUIC (future).
- Reverse proxy integration.
- TLS client cert auth (maybe later).

## Design notes
- Use undici's dispatcher interface or custom wrapper to share connection pools across requests.
- Provide fallback logic: try HTTP/2, on failure log warning and retry with HTTP/1.1 once.
- Expose per-request metadata (protocol, streamId) for logging.

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
- [ ] CLI can perform GraphQL requests over HTTP/2 when enabled and fallback to HTTP/1.1 otherwise.
- [ ] Keepalive/timeout settings configurable per endpoint and applied to transport.
- [ ] Diagnostics/logs report protocol used.
- [ ] Tests cover HTTP/2 success + fallback path (mock servers).

## Dependencies
- Blocks: performance improvements (pagination, streaming), RETRIES/TIMEOUT (transport options).
- Blocked by: CORECLI (flag wiring), HDRMGMT/AUTH (headers), URLMODE/pagination features, TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
