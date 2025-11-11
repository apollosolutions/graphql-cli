# Project Init Command (INITCMD)

## Goal
Provide `gql init` (and variants) to scaffold config files, example documents, and scripts interactively, making it easy to onboard new projects to endpoint mode.

## User stories
- As a developer, I can run `gql init` to create `.gqlrc.yml`, sample document directories, and helpful npm scripts.
- As a team lead, I can predefine templates so init autopopulates org conventions (endpoint URLs, headers placeholders).

## Assumptions
- Core CLI (CORECLI) already has command stub; INITCMD adds interactive prompts + templates.
- CFGDISC config schema known; init writes valid config with comments or guidance.
- Works cross-platform (Windows/macOS/Linux) and respects existing files (no overwrite without confirmation).

## Open issues & risks
- Need to detect package manager (npm/pnpm/yarn) for script suggestions.
- Ensuring secrets not accidentally committed (init should add `.gqlrc.local.yml` patterns?).
- Template updates must be versioned; consider `gql init --template <name>`.

## Clarifying questions
- Should init support non-interactive mode (`--yes`, `--endpoint-url` flags) for scripting?
- Do we provide multiple templates (basic, multi-endpoint, studio)?
- Should init also configure completions or git hooks? maybe optional steps.

## Scope
**Include**
- Interactive prompt (Inquirer/enquirer) collecting endpoint name, URL, default headers, auth strategy.
- File generation: `.gqlrc.yml`, optional `.env.example`, sample docs directory, README snippet.
- Safety checks: skip/backup existing files, `--force` flag.
**Exclude**
- Cloud project provisioning.
- Telemetry opt-in/out prompts (maybe TELEMRY handles later).

## Design notes
- Provide template partials (YAML, docs) embedded or fetched from repo.
- Support `--template <path|name>` to load alt scaffolds.
- Add tests using tmp directories verifying created files and prompt flows (with mocked answers).

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
- `gql init` now resolves answers either interactively (TTY prompts) or non-interactively via `--yes`/flags, covering endpoint name, URL, auth strategy/env var, docs/env toggles, and custom directories (`src/commands/init.ts`).
- Generated `.gqlrc.yml` includes headers, auth block, cache/request defaults, and docs/fragments globs when enabled. `.env.example` and `graphql/{operations,fragments}` scaffolds (with sample query/fragment) are created and protected from accidental overwrites unless `--force` is supplied.
- Flags: `--path`, `--docs-dir`, `--env-file`, `--auth-strategy`, `--auth-env`, `--header`, `--skip-docs`, `--skip-env`, `--force`, `--yes`, `--print-template`.
- Tests (`src/__tests__/cli.test.ts`) exercise successful scaffolding, refusal to overwrite existing configs, and skip/force flows by running the CLI inside temporary directories with in-memory stdio.
- *Golden fixtures remain unchecked until CLI transcripts stabilize; tests rely on runtime assertions instead of large snapshots.*

## Acceptance criteria
- [x] `gql init` scaffolds configs/docs interactively with helpful defaults.
- [x] Existing files not overwritten without `--force` confirmation.
- [x] Non-interactive mode supported via flags/env for CI automation.
- [x] Tests cover template generation + validations.

## Dependencies
- Blocks: onboarding, documentation, STUDIOOP flows.
- Blocked by: CFGDISC (config schema), CORECLI command router, TESTFIX (fixture harness), HELPX2 (docs references).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
