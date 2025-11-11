# Logging & Trace Controls (LOGTRCE)

## Goal
Provide structured logging and trace flags (`--log-level`, `--trace`) that expose request lifecycle timing (DNS, TLS, HTTP) and integrate with ERRXIT/diagnostic features for debugging latency.

## User stories
- As a developer, I can run `gql api users --trace` to see how long DNS, connect, TLS, and GraphQL processing took.
- As an SRE, I can set `GQL_LOG_LEVEL=debug` to get detailed logs when investigating incidents.

## Assumptions
- CLI uses Node HTTP/undici; hooking into request lifecycle is possible via instrumentation.
- Logs should be machine-readable (JSON) optionally, with human-friendly default.
- PRINTIO/diagnostics features rely on the same logging subsystem.

## Open issues & risks
- Ensuring logs do not leak sensitive data; need redaction hooks from HDRMGMT.
- Performance overhead when tracing enabled; default off.
- Multi-request operations (pagination) should correlate logs via IDs.

## Clarifying questions
- Do we integrate with OpenTelemetry? (maybe later.)
- Should we write logs to stderr only, or allow file target via `--log-file`?
- How do we correlate logs per request? generate request IDs?

## Scope
**Include**
- Logging subsystem with levels (silent,error,warn,info,debug,trace) configurable via flag/env.
- `--trace` flag enabling HTTP timing breakdown and summary table.
- Request correlation IDs and structured output for multi-call operations.
**Exclude**
- External log shipping (user can redirect output).
- Persistent log history beyond current run.

## Design notes
- Implement simple logger abstraction that other modules use; support JSON logs via flag.
- For trace, capture timestamps (DNS start/end, TCP connect, TLS handshake, request, response) using undici hooks or manual instrumentation.
- Provide pretty summary when TTY else JSON.

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
- [ ] `--log-level` adjusts verbosity across CLI components.
- [ ] `--trace` outputs timing breakdown per request with tests verifying format.
- [ ] Logs redact sensitive headers by default.
- [ ] Multi-request operations share correlation IDs for easier debugging.

## Dependencies
- Blocks: PRINTIO, diagnostics features, telemetry.
- Blocked by: CORECLI (flag wiring), HDRMGMT (redaction), URLMODE/pagination to generate events, TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
