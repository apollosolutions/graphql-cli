# Operation Listing & Metadata (OPLIST)

## Goal
Provide commands (`gql ops list`, `gql <endpoint> ops`) that enumerate available operations with metadata (type, args, docs source) for discovery, audits, and CI drift checks.

## User stories
- As a new team member, I can run `gql api ops list` to see all queries/mutations with descriptions and last schema sync.
- As a CI pipeline, I can output machine-readable operation listings to detect additions/removals.

## Assumptions
- INTROS indexes operations; DOCDOC/CFGDISC supply doc metadata.
- Output should support JSON/CSV to integrate with other tools.
- Hidden/renamed operations respect RENHIDE settings by default.

## Open issues & risks
- Large output may need pagination or filtering by root type, name, or tags.
- Need to reflect alias + doc coverage (which operations have custom docs?).
- Determining diff baseline for CI may require storing previous listing; OPLIST just outputs current state.

## Clarifying questions
- Should we include argument schemas in listing or just names/description references?
- Do we list subscription operations by default or behind flag?
- Should listing command respect config-defined ordering or alphabetical?

## Scope
**Include**
- CLI subcommand to list operations with filters (`--kind`, `--pattern`, `--json`, `--columns`).
- JSON output structure for automation.
- Integration with HELPEP/COMPLSH metadata to reuse formatting logic.
**Exclude**
- Historical diffing; external tooling handles comparisons.
- GraphQL doc generation (belongs to DOCDOC).
- Execution of operations.

## Design notes
- Provide table output by default (ties into OUTTABL) with column selection.
- Hook into SELECTR/OUTJSON for formatting pipeline reuse.
- Ensure hidden ops suppressed unless `--show-hidden`.

## Tasks
- [x] Implementation (`src/commands/ops.ts`, `src/ops/list.ts`, endpoint hook)
- [x] Docs/Help updates (`docs/ops.md`, plan/spec/changelog, CLI help)
- [x] Tests:
  - [x] Unit *(logic covered via shared helpers; behavior asserted through integration)*
  - [x] Integration (`tests/integration/ops-command.test.ts`)
  - [x] Golden fixtures (global help updated)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Acceptance criteria
- [x] `gql ops list --json` outputs deterministic structure with tests verifying sample schema.
- [x] Filters (`--kind`, `--match`) work and case-insensitive.
- [x] Hidden/renamed/alias metadata respected.
- [x] Command available in both ad-hoc (with URL) and endpoint modes.

## Dependencies
- Blocks: SELECTR, OUTTABL (table output reuse), diagnostics/CI tooling.
- Blocked by: INTROS (operation metadata), CFGDISC (endpoints), RENHIDE/ALIASES, HELPEP design, TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
