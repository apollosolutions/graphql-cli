# Rename & Hide Controls (RENHIDE)

## Goal
Allow endpoint configs to rename operations, hide ones users should not see, and override descriptions/help text so the CLI surface matches product language while still mapping to true schema fields.

## User stories
- As an API platform, I can rename `userById` to `users get` in CLI help while still calling the original field.
- I can hide dangerous operations (e.g., `resetDatabase`) from help/completions so only explicit callers with `--show-hidden` can access them.

## Assumptions
- CFGDISC parses `help.rename`, `help.hide`, `help.describe` blocks per plan.
- HELPEP/COMPLSH honor metadata; DISAMBI still resolves canonical field names behind the scenes.
- Hidden operations remain callable if user knows the exact name unless `disableHidden` option enforced.

## Open issues & risks
- Need precedence when rename and alias both defined; decide evaluation order (likely rename first, alias second in help display).
- Hiding operations may confuse teams if errors mention original names; need consistent messaging.
- Rename affects telemetry/logs? ensure canonical name still stored for debugging.

## Clarifying questions
- Should hidden operations be entirely blocked (hard fail) or just omitted from help/completions? configurable per endpoint?
- Do we allow renaming root commands (endpoint alias) or only operations?
- How are descriptions for renamed ops merged with schema descriptions?

## Scope
**Include**
- Metadata schema for rename/hide/describe sections + validation.
- Resolver that maps CLI-visible name ↔ canonical operation, used by HELPEP, COMPLSH, DISAMBI.
- Flags to show hidden operations and mention in help output.
**Exclude**
- Field-level argument renaming (future enhancement).
- Automatic RBAC enforcement—RENHIDE is cosmetic/config-driven only.
- Localization/internationalization of descriptions.

## Design notes
- Represent rename map separately from alias map to avoid collisions; pipeline: user input → alias → rename? need defined order.
- Hidden operations should still be accessible programmatically when `--show-hidden` or env set (admin flows).
- Provide integration tests with sample config showing rename/hide to ensure help/completions align.

## Tasks
- [x] Implementation (`help.rename`/`help.hide`/`help.describe` parsed in `src/config/loader.ts`, consumed by `src/project/endpoint-command.ts`)
- [x] Docs/Help updates (`docs/endpoints.md`, `docs/plan.md`, `docs/changelog.md`)
- [x] Tests:
  - [x] Unit (config parsing + endpoint help rendering exercised via integration)
  - [x] Integration (`tests/integration/project-mode.test.ts` asserts renamed/hidden ops)
  - [x] Golden fixtures (n/a)
- [x] Telemetry (n/a)
- [x] Feature flag (n/a)

## Acceptance criteria
- [x] Renamed operations display new names in help; users can still invoke either the renamed label or canonical field name.
- [x] Hidden operations stay out of help output unless `--show-hidden` is supplied; execution continues to work when invoked explicitly.
- [x] Description overrides display in help, otherwise schema descriptions are used.
- [x] Config validation ensures rename/hide metadata is well-formed and coexists with aliases (alias chaining already blocked by CFGDISC validation).

## Implementation notes (2025-11-11)
- Config loader preserves `help.rename`/`help.hide`/`help.describe` metadata and enforces array/string types so endpoint commands can trust inputs.
- Endpoint help renderer respects hide lists (with optional `--show-hidden` flag), renders rename labels, and merges description overrides before printing columns. Detail help cards surface original GraphQL path (`Query.user`) for clarity.
- Alias resolution happens alongside rename (rename labels also act as alternative invocation names) while help footers continue to advertise alias mappings.

## Dependencies
- Blocks: HELPEP formatting, COMPLSH entries, DX polish features.
- Blocked by: CFGDISC (config), DISAMBI (resolution), CORECLI (flag plumbing), TESTFIX (fixtures).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
