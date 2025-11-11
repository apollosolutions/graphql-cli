# JSON Output Pipeline (OUTJSON)

## Goal
Provide consistent JSON (and future format) rendering for CLI results, including pretty-print vs compact modes, piping detection, color/syntax toggles, and hooks for subsequent output modes.

## User stories
- As a developer running `gql ...`, I see pretty-formatted JSON when in an interactive terminal, but compact JSON when piping to other tools.
- As a script author, I can opt into `--raw` or `--compact` to control formatting and rely on deterministic output for automation.

## Assumptions
- URLMODE and future endpoint commands feed structured execution results (data/errors/extensions) into this module.
- STDOUT/STDERR detection for TTY vs pipe is available; colorization via chalk/colorette or similar can be added later.
- Error/exit code mapping handled by **ERRXIT**; OUTJSON focuses on rendering structures.

## Open issues & risks
- Large responses may need streaming/NDJSON modes later (Phase 4 OUTNDJS); ensure architecture keeps output layer pluggable.
- Need redaction utilities for sensitive headers/request dumps when `--print-request/response` features land.
- Pretty-print performance for huge payloads could be costly; consider chunked writing or `fast-json-stringify` alternatives.

## Clarifying questions
- Do we default to colored JSON (syntax highlighting) or plain text? Controlled via `--color`?
- Should we automatically append newline at end of output (needed for many tools)?
- How do we represent GraphQL errors: merged into data, printed separately, or combined object aligning with spec (`{ data, errors }`)?

## Scope
**Include**
- Output formatter that takes `{ data, errors, extensions }` and prints JSON with options: pretty (indent=2), compact, color, raw.
- Pipe/TTY detection to auto-switch between pretty vs compact unless overridden.
- `--raw` passthrough for response body and `--compact`/`--pretty` flags.
- Basic helpers for printing warnings/info to STDERR with consistent prefixes.
**Exclude**
- Table/NDJSON/select/jq shaping (Phase 3 SELECTR/OUTTABL/OUTNDJS).
- Streaming subscription rendering (Phase 5 SUBWS/SUBSSE/UNTLBUF).
- Telemetry logging.

## Design notes
- Provide `printJson(result, opts)` used by URLMODE now and future commands; opts should accept `pretty`, `compact`, `color`, `raw`.
- When errors exist, include them in output while still respecting GraphQL spec shape; include `errors` array even if `data` null.
- Detect `process.stdout.isTTY`; default `pretty=true` when TTY else `false`. Allow env override `GQL_PRETTY=0/1`.
- Ensure outputs end with `\n` and flush before exit to avoid truncated JSON when piping.

## Tasks
- [x] Implementation
- [x] Docs/Help updates
- [x] Tests:
  - [x] Unit
  - [x] Integration
  - [x] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Implementation notes (2025-11-09)
- Added `src/output/json.ts` with `formatGraphQLResponse` + `printGraphQLResponse`. It handles pretty vs compact mode (TTY/env aware), honors `GQL_PRETTY`, supports explicit `--pretty/--compact`, appends trailing newline, and optionally emits raw payloads unchanged.
- Registered `render-json` developer command (`src/commands/render-json.ts`) so contributors (and tests) can exercise the output layer via CLI flags (`--pretty`, `--compact`, `--raw`, etc.) ahead of URLMODE wiring.
- Golden-backed integration test verifies command output plus raw mode; unit tests cover env overrides, tty detection, raw passthrough, and error serialization.
- Documented workflow in `docs/tests.md` via mention of shared helpers/goldens (no extra user-facing docs needed yet).

## Acceptance criteria
- [x] Pretty vs compact behavior verified via tests simulating TTY and non-TTY environments.
- [x] `--raw` returns server response verbatim (bypass JSON reformatting).
- [x] Errors array renders with message + path, matching GraphQL spec serialization.
- [ ] URLMODE uses OUTJSON to produce consistent outputs across success/failure flows. *(Pending URLMODE implementation; OUTJSON is ready for wiring once URLMODE lands.)*

## Dependencies
- Blocks: SELECTR, OUTTABL, OUTNDJS (later output features), ERRXIT (shares result object), logging diagnostics.
- Blocked by: CORECLI (flag plumbing), TESTFIX (fixtures), URLMODE providing payloads for integration tests.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
