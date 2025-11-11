# Table Output Mode (OUTTABL)

## Goal
Render operation results as columnar tables (`--format table`) with automatic column inference from arrays of objects using plain ASCII output.

## User stories
- As a CLI user, I can run `gql api users --table --columns id,name,email` to view results in a neat table.
- As an analyst, I can export table output to CSV via `--table --out users.csv` for spreadsheet usage.

## Assumptions
- SELECTR/OUTJSON produce structured JSON objects; OUTTABL consumes them before final printing.
- Terminal width detection available for formatting but degrade gracefully when unknown.
- Works best for list results; for single objects, present vertical table.

## Open issues & risks
- Need heuristics for column inference (use object keys from first row) and fallback when data not an array.
- Handling deeply nested data may require dot-path columns.
- Large datasets might need pagination or streaming; integrate with OUTNDJS later.

## Clarifying questions
- Do we auto-switch to table mode when `--fields` returns list? or require explicit `--table`?
- Should we support `--max-rows` to avoid dumping thousands of entries?
- Do we permit colorization/borders or keep minimal ASCII for compatibility?

## Scope
**Include**
- `--format table` flag with automatic column inference from array results (falls back to single-row tables for objects/scalars).
- Works after `--select`, so users can target `data.<list>` explicitly.
**Exclude (future)**
- Manual `--columns` overrides, CSV/TSV export, width-aware wrapping, pagination/streaming enhancements.
- Interactive scrolling or sorting.

## Design notes
- Implement as a formatter invoked from output pipeline after SELECTR but before final print.
- Provide autop detection when top-level result is `data.<op>` array; allow `--path` override.
- Use widely adopted libs (e.g., `cli-table3`, `table`) but ensure deterministic formatting for golden tests.

## Tasks
- [x] Implementation (`writeGraphQLResponse` + `renderTableFromData`, `--format table` wiring across commands)
- [x] Docs/Help updates (`docs/urlmode.md`, `docs/endpoints.md`, `docs/select.md`, changelog/plan/spec)
- [x] Tests:
  - [x] Unit/Integration (covered via `tests/integration/render-json.test.ts` + `tests/integration/cli-basic.test.ts`)
  - [x] Golden fixtures (not required)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Acceptance criteria
- [x] `--format table` renders array/object results with inferred headers/rows.
- [x] Works alongside `--select` and guards against unsupported combos (`--jq`).
- [x] Documented behavior and examples for both URL + endpoint modes.

## Dependencies
- Blocks: OUTNDJS streaming tables, SELECTR integration, DX polish features.
- Blocked by: OUTJSON baseline, SELECTR (data shaping), CORECLI (flags), TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
