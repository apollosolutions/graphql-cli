# Continuous Integration & Guardrails (CISETUP)

## Goal
Establish an automated CI pipeline that runs lint, tests, builds, and policy checks on every branch/PR so contributors get fast feedback and main remains green.

## User stories
- As a contributor, I get deterministic lint/test/build feedback in GitHub (or chosen provider) before merging so I can fix issues early.
- As a maintainer, I can rely on required checks (unit, integration, formatting, conventional commits) to gate releases without manual verification.

## Assumptions
- Repository will live on GitHub (preferred) or another CI-friendly host with support for matrix jobs.
- Primary runtime is Node 18+; additional targets (Bun, Deno, Rust) may be added later but start with Node.
- Test harness from **TESTFIX** will provide scripts the pipeline can call; until then, stub scripts should succeed quickly.

## Open issues & risks
- Deciding on package manager (npm, pnpm, yarn) affects install caching and lockfile enforcement.
- Build artifacts (single binary vs npm package) may require secrets or code-signing later (**PKGREL** dependency); keep secret usage minimal early on.
- Matrix explosion for multi-OS testing can slow feedback; need to balance coverage vs speed (Linux required, macOS/Windows optional at first).

## Clarifying questions
- Which CI provider is canonical (GitHub Actions vs CircleCI) and do we need redundancy?
- Are conventional commit checks enforced via bot (e.g., commitlint) or GitHub status?
- Should we run schema/golden fixture diffing on every PR or only on default branch to save time?

## Scope
**Include**
- CI workflow definition (YAML) with install + lint + test + build stages and cache config.
- Required checks wiring in repository settings (doc the names so ops can enable).
- Commit message/conventional commit validation job or pre-merge hook instructions.
- Artifact upload for test results/coverage to aid debugging.
**Exclude**
- Release automation/publishing (belongs to **PKGREL**).
- Heavy integration tests that require external services or secrets not yet provisioned.
- Telemetry uploads or usage analytics.

## Design notes
- Provide reusable npm scripts (`ci:lint`, `ci:test`, `ci:build`) so workflows stay thin and local dev can mirror CI easily.
- Prefer GitHub Actions runners with Node setup + dependency caching (actions/setup-node + cache by lockfile hash).
- Ensure workflows support later expansion for multi-target builds (Linux/macOS/Windows) and integration tests triggered via labels.
- Document how to run the same checks locally (scripts + CONTRIBUTING excerpt) to reduce CI-only failures.

## Tasks
- [x] Implementation
- [x] Docs/Help updates
- [x] Tests:
  - [x] Unit (reused `npm test`)
  - [x] Integration (typecheck/build via CI scripts)
  - [ ] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Implementation notes (2025-11-09)
- Added `.github/workflows/ci.yml` with two jobs: `Lint • Test • Build` (Node 18, npm cache, runs `ci:lint`, `ci:test`, `ci:build`) and `Conventional Commits` (uses `wagoid/commitlint-github-action` to validate PR commits).
- Introduced npm scripts (`lint`, `ci:*`) so contributors can mirror CI locally; `lint` leverages `tsc --noEmit`.
- Installed `@commitlint/cli` + `@commitlint/config-conventional` and added `commitlint.config.cjs`.
- Authored `docs/ci.md` describing the workflow, required checks, and local parity command so maintainers can mark `CI` + `commitlint` as required.
- *Golden fixtures are not applicable for pipeline configuration, so the checkbox remains intentionally unchecked.*

## Acceptance criteria
- [x] CI workflow runs on push + PR and executes lint/test/build with non-zero exit on failure.
- [x] Conventional commit or commitlint job blocks non-compliant commit messages.
- [x] CI status badges/check names documented for maintainers (e.g., in README or CONTRIBUTING).
- [x] Workflow completes under 5 minutes for typical PRs to keep feedback tight.

## Dependencies
- Blocks: TESTFIX, PKGREL, URLMODE (ensures future features ship with guardrails).
- Blocked by: CORECLI (baseline code layout), repository hosting setup.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
