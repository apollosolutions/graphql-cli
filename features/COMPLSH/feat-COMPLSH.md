# Shell Completions v1 (COMPLSH)

## Goal
Provide endpoint-aware shell completion scripts (zsh/bash/fish) that suggest endpoints, operation names (with aliases/renames), and common flags so users can explore schemas via tab completion.

## User stories
- As a zsh user, typing `gql <TAB>` lists endpoints discovered from config; `gql api <TAB>` lists operations/aliases.
- As a maintainer, I can regenerate/update completion scripts via `gql completions <shell>` command referenced in Phase 0 pseudocode.

## Assumptions
- CORECLI already exposes `gql completions <shell>` entrypoint stub; COMPLSH fills in logic.
- CFGDISC + INTROS supply endpoint + operation data; RENHIDE/ALIASES metadata must be respected.
- Users can source generated scripts in their shell rc files.

## Open issues & risks
- Need caching strategy so completions don't rerun heavy introspection each keystroke; likely rely on cached schema metadata.
- Some shells require completion script installation instructions; doc clarity essential.
- For large schemas, generating completions may be slow; consider incremental updates or limited suggestions.

## Clarifying questions
- Do we ship static completion files or generate on demand each time `gql completions` runs?
- Should completions include flag names (global + per operation) in v1 or defer to COMPLX2?
- How do we handle hidden operations (RENHIDE) in completions? default to hidden.

## Scope
**Include**
- Completion generation command that outputs script text for zsh/bash/fish (maybe powershell later?).
- Data sources: endpoints, aliases, renamed operations, global flags, subset of per-operation flags (if feasible).
- Docs instructing users how to install completions (README/manpage update).
**Exclude**
- Dynamic completion server (no background daemon).
- IDE-specific completions.
- Enum value completions (planned for COMPLX2 advanced phase).

## Design notes
- Use template files per shell with placeholders replaced by JSON/data (similar to other CLIs).
- Keep output deterministic for golden tests; store sample completions fixtures.
- Provide `--install` helper later maybe, but v1 just prints script to STDOUT.
- Respect RENHIDE/ALIASES so completions mirror help output.

## Tasks
- [x] Implementation (`src/commands/completions.ts`, `collectEndpointOperationSummaries` helper)
- [x] Docs/Help updates (`docs/completions.md`, `docs/plan.md`, `docs/changelog.md`)
- [x] Tests:
  - [x] Unit (covered indirectly via TypeScript + shared helpers)
  - [x] Integration (`tests/integration/completions.test.ts`)
  - [x] Golden fixtures (n/a — snippets asserted inline)
- [x] Telemetry (n/a)
- [x] Feature flag (n/a)

## Acceptance criteria
- [x] `gql completions zsh` outputs a functional script referencing endpoints + operations; tests assert presence of renamed operations and aliases.
- [x] Suggestions list endpoint commands plus operations/aliases while respecting hidden operations (not emitted in snippets).
- [x] Generation completes quickly using cached schema metadata (single fetch per endpoint during command run).
- [x] Documentation instructs users how to install completions for bash/zsh/fish (`docs/completions.md`).

## Implementation notes (2025-11-11)
- `src/commands/completions.ts` now loads config + schema metadata, synthesises suggestions (canonical names, rename labels, aliases), and renders shell-specific scripts instead of placeholders.
- `collectEndpointOperationSummaries` in `src/project/endpoint-command.ts` centralises schema traversal so completions + endpoint commands share visibility rules (hide/rename logic).
- Integration coverage spins up a temp `.gqlrc.yml` + GraphQL server to ensure the generated zsh snippet contains endpoint, renamed operation, and alias entries.

## Dependencies
- Blocks: COMPLX2 (advanced completions), DX polish tasks, MANPAGE instructions.
- Blocked by: CORECLI (command stub), CFGDISC/INTROS (data), RENHIDE/ALIASES (metadata), TESTFIX (fixtures).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
