# Test Harness & Fixtures (TESTFIX)

## Goal
Provide a repeatable testing framework with unit, integration, and golden fixture coverage (schema snapshots, command outputs) so every feature can ship with regression safety nets.

## User stories
- As a contributor, I can run `npm test` (or equivalent) locally and exercise unit + integration suites with consistent fixtures.
- As a reviewer, I can inspect golden diff outputs to understand CLI behavior changes before merging.

## Assumptions
- Node-based toolchain (Jest/Vitest/Tap equivalent) is acceptable; Rust/Bun targets can adapt later if introduced.
- Schema fixtures can live under `spec/` or `tests/fixtures/` and be version-controlled (not generated on the fly).
- CI from **CISETUP** will invoke the same scripts, so tests must run headlessly without user input.

## Open issues & risks
- Golden files can cause churn; need stable serialization + tooling to update intentionally (`npm run test:update`).
- Large schema fixtures slow tests; may need trimmed SDLs or selective introspection JSON subsets.
- Integration tests might require mock GraphQL servers—decide between local in-process mocks vs spun-up containers.

## Clarifying questions
- Preferred test runner? (Jest vs Vitest vs Node built-in test).
- Do we require code coverage thresholds from day one or later (Phase 3+)?
- Should we snapshot CLI stdout/stderr via spawn harness or rely on library-level tests?

## Scope
**Include**
- Test runner config, scripts, and base directory layout (`tests/unit`, `tests/integration`, `tests/fixtures`).
- Schema + introspection fixture strategy with helper utilities to load them (Phase 1 URL mode depends heavily on this).
- Helpers/mocks for HTTP GraphQL responses, config files, and file system isolation.
- Docs describing how to add/update fixtures and when to regenerate goldens.
**Exclude**
- E2E tests that hit live external APIs (would need secrets and belong to future perf/diagnostics work).
- Telemetry validation (belongs to **TELEMRY**).
- Benchmarks/perf harness (Phase 8+).

## Design notes
- Provide utilities to spawn the CLI (once implemented) with deterministic env/stdio capture for regression tests.
- Golden outputs should normalize timestamps, ordering, and absolute paths to keep diffs clean.
- Consider layering test tags (fast vs slow) so CI can run the full matrix while developers have quick loops.
- Reuse fixtures between spec validation and CLI tests to avoid drift; maybe central `tests/fixtures/schema/basic.graphql` referenced by both.

## Tasks
- [x] Implementation
- [x] Docs/Help updates
- [x] Tests:
  - [x] Unit
  - [x] Integration
  - [x] Golden fixtures
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Implementation notes (2025-11-09)
- Established `tests/` hierarchy with `fixtures/`, `integration/`, `unit/`, `golden/`, and reusable helpers under `tests/utils/` (CLI runner, temp dirs, fixture loaders, golden matcher).
- Added reusable schema + introspection fixtures (`tests/fixtures/schemas/basic.graphql`, `tests/fixtures/introspection/basic.json`) consumed by unit tests and future URLMODE work.
- Created integration suites (`tests/integration/*.test.ts`) that drive `runCli` end-to-end—capturing stdout/stderr for help/completions/url placeholder plus `gql init` scaffolding (with temp directories).
- Introduced golden comparison helper + files for CLI help/placeholder outputs, alongside `npm run test:update` (via `cross-env UPDATE_GOLDENS=1`) to regenerate snapshots deterministically.
- Authored `docs/tests.md` documenting layout, workflows, and the golden update process.

## Acceptance criteria
- [x] `npm test` runs locally with clear pass/fail output under 60s for baseline suite.
- [x] Golden fixture update workflow documented (`npm run test:update`) with reviewer guidance.
- [x] Sample schema fixtures checked in and consumed by at least one unit + one integration test.
- [x] CI jobs from **CISETUP** consume the same commands without additional setup steps.

## Dependencies
- Blocks: URLMODE, INTROS, VARMAPR, CFGDISC (all require reliable harness + fixtures).
- Blocked by: CORECLI (directory structure), CISETUP (pipeline to run tests).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
