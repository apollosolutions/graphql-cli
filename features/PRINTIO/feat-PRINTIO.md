# Request/Response Printing (PRINTIO)

> Status: `--print-request` shipped via HDRMGMT on 2025-11-13 (redacted header/body dump). Remaining scope covers response printing plus advanced truncation/file options.

## Goal
Expose `--print-request` and `--print-response` diagnostics flags that dump HTTP request/response payloads (with redaction) for troubleshooting.

## User stories
- As a developer, I can run `gql api users --print-request --print-response` to inspect headers/body when debugging.
- As support, I can ask users to rerun with `--print-request --print-response --debug` and share sanitized logs.

## Assumptions
- HDRMGMT provides redacted header maps; VARMAPR can show variables with sensitive fields masked.
- LOGTRCE handles base logging infrastructure; PRINTIO uses same output channel.
- JSON pretty printing uses OUTJSON utilities for consistency.

## Open issues & risks
- Need to ensure secrets (Authorization, API keys) redacted before printing.
- Large response bodies may flood terminal; provide `--print-response=truncated` option.
- Binary uploads/responses should be detected and summarized instead of dumping raw bytes.

## Clarifying questions
- Do we include HTTP timing metadata with these prints or keep separate (LOGTRCE)?
- Should we support writing to file for easier sharing (`--print-response-file`)?
- How do we integrate with pagination (print each request) without overwhelming logs?

## Scope
**Include**
- Flags `--print-request`, `--print-response`, `--print-request-body`, `--print-response-body` (maybe alias) with redaction.
- Formatting for headers + body (JSON pretty, GraphQL doc snippet) and pagination loops.
- Integration with logging/tracing to correlate outputs per request ID.
**Exclude**
- Automatic upload of logs.
- GUI viewer.

## Design notes
- Provide central `diagnostics.printRequest(context)` helper used by URLMODE/pagination.
- For response bodies, detect JSON vs text vs binary; handle accordingly.
- Respect `--raw` / `--out` combos (still print to stderr, not interfering with stdout data).

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
- [ ] Request/response dumps include method, URL, headers (redacted), and body (pretty JSON) when available.
- [ ] Works for pagination/multi-call flows with request IDs.
- [ ] Binary payloads summarized safely.
- [ ] Tests cover redaction + CLI flags interplay.

## Dependencies
- Blocks: diagnostics workflows, support tooling.
- Blocked by: HDRMGMT (redaction), LOGTRCE (logger), OUTJSON (formatting), CORECLI flags, TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
