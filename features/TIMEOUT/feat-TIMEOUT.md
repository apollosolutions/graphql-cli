# Timeout & Deadline Controls (TIMEOUT)

## Goal
Expose configurable request timeouts/deadlines (connection, read, overall) with CLI flags and per-endpoint defaults to prevent hanging commands and support RETRIES/backoff features.

## User stories
- As a user, I can set `--timeout 10s` to fail fast when the server is slow.
- As an endpoint maintainer, I configure `request.timeoutMs` in `.gqlrc.yml` to apply consistent deadlines across the team.

## Assumptions
- HTTP client supports abort controller/timeouts.
- RETRIES uses TIMEOUT values to decide when to retry.
- Logging/tracing (LOGTRCE) should note timeout events.

## Open issues & risks
- Need to differentiate between connect timeout, response timeout, and overall deadline.
- Some operations (long-running subscriptions) should bypass certain timeouts; support `--no-timeout` for streaming.
- Timeout cancellation must clean up sockets (especially for HTTP/2).

## Clarifying questions
- Should we support `--deadline` absolute timestamp vs relative durations only?
- How do we represent durations (e.g., `10s`, `500ms`) in CLI? human-friendly parser.
- Do we expose separate flags for connect vs read vs overall?

## Scope
**Include**
- Config schema + flags for `--timeout`, `--connect-timeout`, `--read-timeout`, `--deadline` (maybe), plus `request.timeoutMs` in config.
- Integration with HTTP client aborting requests when exceeded.
- Error messaging mapping to ERRXIT (timeout code) with suggestions.
**Exclude**
- Server-side timeouts (can't control) beyond documentation.
- Retry logic (handled by RETRIES) though interplay documented.

## Design notes
- Provide human-friendly duration parser supporting `ms/s/m` suffixes.
- Maintain default timeouts (e.g., 30s) but allow endpoints to override.
- For subscriptions/streaming, allow `--keepalive-timeout` vs `--initial-timeout` (maybe later) but ensure default won't kill long streams.

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
- [ ] CLI respects timeout flags/config with abort + clear error message when exceeded.
- [ ] Streaming commands can mark themselves as long-lived to bypass read timeout but keep connect timeout.
- [ ] Logging/tracing records timeout events with durations.
- [ ] Tests simulate slow servers to verify behavior.

## Dependencies
- Blocks: RETRIES (needs timeouts), diagnostics, reliability features.
- Blocked by: CORECLI (flag handling), HTTP2 transport, LOGTRCE (logging), TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
