# Endpoint Help Generation (HELPEP)

## Goal
Generate rich `gql <endpoint> --help` screens that list queries, mutations, and subscriptions grouped with descriptions, aliases, and hidden/renamed info derived from config + schema.

## User stories
- As a user, I can run `gql api --help` and see categorized operation listings with summaries so I know what commands exist.
- As a docs writer, I can rely on automated help output instead of maintaining manual README tables whenever the schema evolves.

## Assumptions
- CFGDISC provides parsed config (descriptions, hide/rename metadata) and INTROS supplies schema descriptions.
- Terminal width detection available for formatting but fallback works in narrow terminals.
- Hidden operations (RENHIDE) should not appear unless `--all` flag provided.

## Open issues & risks
- Large schemas may produce unwieldy help output; need pagination or search-friendly hints.
- Need localization? likely English-only for now but format should not hardcode ASCII art that breaks locales.
- Derived descriptions might need truncation/rich formatting; decide on indentation + bullet style.

## Clarifying questions
- Should help list arguments/signatures for each operation or only names + summaries?
- How are aliases displayed (both alias + original)?
- Do we include examples (e.g., `gql api users --limit 10`) automatically?

## Scope
**Include**
- Help renderer that groups operations by root type with counts, descriptions, alias annotations, and hide/rename respect.
- Support for `gql --help` (global) plus `gql <endpoint> --help` and `gql <endpoint> <operation> --help` detail view.
- Integration with COMPLSH metadata so help + completions share a source of truth.
**Exclude**
- Markdown/HTML export of help (future docs tooling).
- Interactive fuzzy search (belongs to future TUIBROW stretch).
- Example snippet curation beyond simple autop-generated ones.

## Design notes
- Use consistent formatting with bold headers (Queries, Mutations, Subscriptions) and align columns for readability.
- Provide `--json` help output for tooling (maybe later) but plan structure to allow that.
- Ensure hidden/renamed operations respect RENHIDE metadata; include `--show-hidden` flag for maintainers.
- Hooks for future `help.rename`, `help.hide`, `help.describe` fields per plan.

## Tasks
- [x] Implementation (`src/project/endpoint-command.ts`, dynamic `CommandRegistry.renderCommandHelp`)
- [x] Docs/Help updates (`docs/endpoints.md`, `docs/urlmode.md`, `docs/tests.md`, `docs/plan.md`, `docs/changelog.md`)
- [x] Tests:
  - [x] Unit (covered via schema index + resolver helpers)
  - [x] Integration (`tests/integration/project-mode.test.ts`)
  - [x] Golden fixtures (n/a; textual help asserted inline)
- [x] Telemetry (n/a)
- [x] Feature flag (always on)

## Acceptance criteria
- [x] `gql <endpoint> --help` shows operations grouped by root with schema/config descriptions, rename/hide respected, aliases appended.
- [x] Hidden operations remain hidden unless `--show-hidden` is provided.
- [x] Help output is derived from live introspection; tests refresh automatically when schema/config fixtures change.
- [x] `gql <endpoint> <operation> --help` surfaces argument metadata plus common flags (`--var`, `--fields`, `--doc`, `--kind`, `--header`).

## Implementation notes (2025-11-11)
- `CommandRegistry.renderCommandHelp` is now async-aware and forwards command args/flags so endpoint commands can emit context-aware help (operation listings vs. per-operation detail cards).
- `src/project/endpoint-command.ts` builds schema indexes on demand, caches them, and renders help screens that group operations, honor `help.rename`/`help.hide`/`help.describe`, and append alias summaries + `--show-hidden`.
- Endpoint help rendering is exercised end-to-end in `tests/integration/project-mode.test.ts`, which scaffolds a temporary `.gqlrc.yml`, starts a GraphQL server, and asserts help text content (renamed operations, hidden operations, alias footer).

## Dependencies
- Blocks: COMPLSH, HELPX2, MANPAGE, docs generation.
- Blocked by: CFGDISC (config), INTROS (schema info), VARMAPR (argument metadata), RENHIDE/ALIASES for display hints.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
