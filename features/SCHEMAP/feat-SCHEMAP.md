# Schema Print & Save (SCHEMAP)

## Goal
Expose commands to print, save, and diff GraphQL schemas (SDL + introspection JSON) leveraging the cached introspection data so users can inspect schemas or commit snapshots.

## User stories
- As a developer, I can run `gql https://api/graphql schema print --sdl` to view the current schema.
- As a CI job, I can save the schema JSON/SDL to disk (`--out schema.graphql`) for drift detection.

## Assumptions
- INTROS already caches schemas; SCHEMAP reuses stored data rather than re-fetching unless `--refresh`.
- CLI has `schema` subcommand accessible in both ad-hoc and endpoint modes.
- Output formatting (SDL vs JSON) uses GraphQL utilities.

## Open issues & risks
- Large schemas may exceed terminal buffer; need pagination guidance or pipe-friendly behavior.
- Need consistent diffing strategy for CI (maybe `gql schema save --format json --out ...` + git diff?).
- Multi-endpoint configs: decide default endpoint when user runs `gql schema print` without args.

## Clarifying questions
- Do we provide `schema list` to show types/operations or just print/save?
- Should we include `--filter typeName` to dump subset?
- Are we responsible for formatting default values/descriptions exactly as server returns or apply normalization?

## Scope
**Include**
- `schema print` and `schema save` commands with flags: `--format (sdl|json)`, `--out`, `--refresh`.
- Integration with INTROS cache + HTTP fallback.
- Optional `schema info` summary (type counts) if feasible.
**Exclude**
- Schema diffing UI (future diagnostics).
- Migration generation.
- Visual schema explorers (TUIBROW handles later).

## Design notes
- Use `graphql`'s `printSchema` for SDL; maintain stable ordering for deterministic outputs.
- When saving to file, ensure directories created as needed or provide helpful errors.
- Provide tests comparing saved files to fixtures to guard formatting.

## Tasks
- [x] Implementation
- [x] Docs/Help updates
- [x] Tests:
  - [x] Unit *(extended `tests/unit/introspection.test.ts` to cover raw loaders)*
  - [x] Integration
  - [x] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Acceptance criteria
- [x] `gql <endpoint> schema print --sdl` prints schema to STDOUT using cached data.
- [x] `--refresh` forces re-introspection and updates cache.
- [x] `--out path` writes file and reports location; tests verify file contents.
- [x] Command works for both ad-hoc URLs and configured endpoints.

## Dependencies
- Blocks: OPLIST, diagnostics (schema diff), docs automation.
- Blocked by: INTROS (cache), URLMODE/CFGDISC (endpoint context), CORECLI (command router), TESTFIX (fixtures).

## Rollout
- [x] Behind flag? n
- [x] Docs updated
- [x] Changelog entry
