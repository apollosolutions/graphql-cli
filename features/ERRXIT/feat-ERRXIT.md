# Exit Codes & Error Surfacing (ERRXIT)

## Goal
Provide deterministic exit code mapping and error presentation for all CLI commands so scripts and users can rely on consistent behavior (e.g., 0 success, 2 validation, 3 HTTP, etc.).

## User stories
- As a user scripting `gql`, I can inspect the process exit code to know whether the failure was due to invalid input vs server error vs network issues.
- As a developer, I can throw structured errors from URL mode (and future commands) and have ERRXIT translate them into human-friendly messages and codes automatically.

## Assumptions
- Error objects include metadata (type, cause) or are wrapped before reaching ERRXIT.
- OUTJSON handles printing response bodies; ERRXIT focuses on summarizing failures and setting exit codes.
- Baseline mapping derived from plan: codes 0..6 covering success, invalid args, schema errors, HTTP errors, etc.

## Open issues & risks
- Need to finalize the canonical code table; changing later can break scripts.
- Some downstream features (subscriptions, retries) may need additional codes (e.g., timeout). Plan extensibility now.
- When multiple errors occur, need clear priority for messaging (validation > auth > network?).

## Clarifying questions
- What exact exit code mapping do we adopt (per docs/plan: 2,3,4,5,6)? define semantics.
- Should we emit machine-readable error info (JSON on STDERR) for automation?
- Do we localize error messages or keep English-only for now?

## Scope
**Include**
- Central error classification utility that maps thrown errors (custom types) to `{ code, message, hint }`.
- Global process exit helper used by CLI entrypoint so all commands share behavior.
- Documentation of exit codes in README/manpage.
- Hooks for logging diagnostics (stack traces with `GQL_DEBUG=1`).
**Exclude**
- Telemetry/error reporting external services.
- UI prompts for error recovery (handled elsewhere).
- Retrying logic (belongs to future RETRIES feature).

## Design notes
- Define error classes: `InvalidArgsError`, `SchemaError`, `HttpError`, `NetworkError`, `AuthError`, `UnknownError`; map to codes (0 success, 2 invalid args, 3 schema, 4 HTTP GraphQL errors, 5 network/transport, 6 internal).
- Provide helper `handleCommandResult(result)` that prints via OUTJSON (when data) or writes formatted errors to STDERR, then calls `process.exit(code)`.
- Include optional verbose stack output when `--debug` or env flag set.
- Ensure integration tests assert exit codes for key scenarios (missing var, HTTP 500, GraphQL errors, uncaught exception).

## Tasks
- [x] Implementation
- [x] Docs/Help updates
- [x] Tests:
  - [x] Unit
  - [x] Integration
  - [ ] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Implementation notes (2025-11-09)
- Added `src/errors/exit.ts` with the canonical exit code enum, custom error classes (`InvalidArgsError`, etc.), and `mapErrorToExitInfo`, which inspects env/`GQL_DEBUG` to decide whether to emit stack traces.
- `CommandRegistry` now funnels uncaught handler exceptions through the mapper so every command (present and future) receives consistent messaging and exit codes. Stack traces appear only when `GQL_DEBUG=1`, satisfying the debug requirement without overwhelming users by default.
- The dev-facing `render-json` command throws `InvalidArgsError` for malformed JSON and supports `--simulate-internal` to exercise the ERRXIT path; integration tests assert the resulting exit codes (2 for invalid input, 6 for unexpected crashes).
- Documented the mapping in `docs/errors.md` for maintainers and automation authors.
- Golden fixtures are not applicable (stderr output remains short messages), hence the unchecked box.

## Acceptance criteria
- [x] Exit codes documented and enforced across CLI commands; tests assert mapping.
- [ ] Structured errors from URLMODE map to correct codes/messages (e.g., missing var -> 2, GraphQL error -> 4). *(Pending URLMODE implementation that emits these errors.)*
- [x] `GQL_DEBUG=1` (or `--debug`) prints stack traces on STDERR without altering exit codes.
- [x] Unexpected exceptions still surface a friendly message plus guidance to rerun with `--debug`.

## Dependencies
- Blocks: RETRIES, TIMEOUT, LOGTRCE, diagnostics features relying on consistent error handling.
- Blocked by: CORECLI (entrypoint), URLMODE (producer for integration tests), OUTJSON (success path printer), TESTFIX (test scaffolding).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
