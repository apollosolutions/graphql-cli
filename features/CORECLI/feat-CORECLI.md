# Core CLI Bootstrap (CORECLI)

## Goal
Stand up the first runnable `gql` binary with a shared command registry, argument parsing, and plumbing for future subcommands so that all subsequent features have a stable entrypoint.

## User stories
- As a CLI user, I can run `gql --help` and see consistent global flags and subcommand listings even before advanced features land.
- As a contributor, I can register new commands (URL mode, endpoint mode, tooling utilities) without rewriting parsing or process lifecycle code.

## Assumptions
- Tooling targets Node 18+ (or the runtime chosen for the final binary) with access to standard POSIX environments.
- No network access is required beyond what downstream features (introspection, HTTP requests) enable later.
- CI/lint/test infrastructure from **CISETUP** will be available but may not be fully configured yet.

## Open issues & risks
- Command definition growth may bloat startup if registry loading eagerly requires heavy modules; consider lazy imports per command.
- Flag schema must remain stable across phases to avoid breaking users once URL/endpoint modes ship.
- Need a decision on single-binary bundling strategy (Node pkg + pkg, Rust, Bun, etc.); impacts how commands register themselves.

## Clarifying questions
- Are we standardizing on a specific argument parsing library (yargs, commander, custom) or building an internal thin layer?
- Should telemetry hooks (if any) initialize here or later (Phase 10 `TELEMRY`)?
- Do we require Windows Cmd/PowerShell parity on day one or can we iterate post-foundation?

## Scope
**Include**
- CLI entrypoint (`src/cli.ts` or equivalent) with process bootstrap, global error handling, and version flag.
- Command registry that can register built-in commands (`help`, `completions`, `init`, URL placeholder) per the Phase 0 pseudocode in `docs/plan.md`.
- Flag parser wrapper that normalizes args, supports `--help/--version`, and hands off to handlers with typed contexts.
- Wiring for graceful exit codes plus stubs for logging/tracing toggles referenced in the spec.
**Exclude**
- Actual URL mode execution, config discovery, or schema introspection (covered by **URLMODE**, **CFGDISC**, etc.).
- Packaging/release automation (**PKGREL**) and CI wiring (**CISETUP**).
- Telemetry, auth helpers, output formatting beyond minimal JSON printing.

## Design notes
- Follow the pseudocode in `docs/plan.md` that registers `help`, `completions`, `init`, URL, and endpoint placeholders.
- Keep command handlers decoupled via a `CommandRegistry` interface (`register(name, handler, options)` + `run(argv)`); expect later injection by plugin features (**PLUGINAPI** cluster).
- Include a lightweight context object passed to handlers (parsed args, env, stdio handles, logger).
- Centralize process exit so later features (**ERRXIT**) can hook in without rewriting base CLI flow.
- Ensure the parser supports passthrough arguments for future commands (e.g., `--` handling for GraphQL variables files).

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
- Introduced a type-safe `CommandRegistry` (`src/command-registry.ts`) with named commands, alias resolution, matcher-based fallbacks (used for the URL placeholder), and centralized help rendering/IO handling.
- Bootstrapped the CLI entrypoint (`src/cli.ts`, `src/index.ts`) that registers `help`, `completions`, `init`, and the URL-mode placeholder; `runCliFromProcess` now owns process exit codes so downstream handlers can reuse it in tests.
- Implemented built-in commands:
  - `help`: renders global/command help via registry APIs.
  - `completions`: prints temporary bash/zsh/fish snippets until **COMPLSH** lands.
  - `init`: writes or prints a starter `.gqlrc.yml` (with collision protection) to unblock endpoint-mode experiments.
  - `<url> <kind> <operation>` placeholder: detects URL-first invocations and fails with a pointer to **URLMODE** until that feature is ready.
- Added Vitest-based coverage (`src/__tests__/cli.test.ts`) exercising help/version reporting, command dispatch, completion output, URL placeholder routing, and unknown-command errors. These tests double as integration coverage because they execute `runCli` end-to-end with in-memory stdio.
- Updated package/tooling scaffolding (`package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`) plus build + test scripts (`npm run build`, `npm test`). Golden fixtures remain unnecessary until we have stable CLI transcripts to capture.

*Golden fixtures deliberately left unchecked; no stable textual transcripts exist yet for snapshotting.*

## Acceptance criteria
- [x] Running `gql --help` shows global flags and registered commands with descriptions sourced from the registry.
- [x] `gql <command>` dispatches to the correct handler and surfaces structured errors (no raw stack traces by default).
- [x] Non-zero exits funnel through a single mapper hook so **ERRXIT** can extend it later.
- [x] Registry/CLI entrypoint covered by baseline tests (command listing + handler invocation).

## Dependencies
- Blocks: URLMODE, INTROS, VARMAPR, CFGDISC, and all downstream features that require a CLI surface.
- Blocked by: none (foundation).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
