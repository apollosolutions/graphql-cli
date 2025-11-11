# Endpoint Aliases (ALIASES)

## Goal
Allow configs to map friendly command names (e.g., `ls` → `users`) so teams can expose mnemonic shortcuts while still referencing canonical GraphQL operations.

## User stories
- As a team, we define `aliases` in `.gqlrc.yml` so running `gql api ls --limit 10` executes the `users` query.
- As a user, `gql api --help` shows aliases next to their target operations to avoid confusion.

## Assumptions
- CFGDISC loads alias definitions from config under each endpoint.
- DISAMBI resolves final root/type after alias translation.
- Aliases should not create cycles; validation must catch them.

## Open issues & risks
- Need to decide precedence order when alias name conflicts with real operation names; most likely aliases override but warn.
- Aliases may include dashes/spaces? limit to CLI-friendly names.
- Autocompletion (COMPLSH) must include aliases; ensure source of truth consistent.

## Clarifying questions
- Are alias names per-endpoint only or global? (assume per-endpoint).
- Do we support alias-specific descriptions and help text overrides?
- Should we allow aliasing to renamed operations (RENHIDE) as well?

## Scope
**Include**
- Alias resolution step before DISAMBI, mapping CLI cmd to canonical operation.
- Validation: detect duplicates, cycles, invalid characters, hidden targets.
- Metadata for HELPEP/COMPLSH to show alias relationships.
**Exclude**
- Macro-like aliases that inject default arguments (future enhancement).
- Cross-endpoint aliases.
- Alias chaining beyond one hop.

## Design notes
- Keep alias map simple dict; on command parse, look up first token after endpoint and replace if alias exists.
- Provide `--no-aliases` flag for debugging to bypass translation.
- Document alias behavior in config schema / README.

## Tasks
- [x] Implementation (`src/project/endpoint-command.ts` resolves aliases, `--no-aliases` flag bypasses them)
- [x] Docs/Help updates (`docs/endpoints.md`, `docs/plan.md`, `docs/changelog.md`)
- [x] Tests:
  - [x] Unit (config validation + resolution logic exercised by integration)
  - [x] Integration (`tests/integration/project-mode.test.ts` runs alias + disambiguation scenarios)
  - [x] Golden fixtures (n/a)
- [x] Telemetry (n/a)
- [x] Feature flag (n/a)

## Acceptance criteria
- [x] Aliases defined in config work end-to-end for execution and help (alias footer lists mappings).
- [x] Invalid alias definitions (self-reference or alias-of-alias) fail during config load with actionable errors.
- [x] `--no-aliases` bypasses alias translation per invocation (documented + surfaced in operation detail help).
- [x] Tests cover alias mapping, rename/hide interplay, and alias-aware help output.

## Implementation notes (2025-11-11)
- Config loader now validates alias maps to ensure each alias points to a canonical field (no chaining or self-references), surfacing `ConfigValidationError` with the alias path.
- Endpoint command handler normalizes incoming names via `resolveOperationName`, which respects `aliases`, rename labels, and the `--no-aliases` flag. Help detail cards document the flag alongside other shared options.
- Integration test (`tests/integration/project-mode.test.ts`) asserts alias execution, alias display in help, and compatibility with disambiguation logic.

## Dependencies
- Blocks: HELPEP display, COMPLSH suggestions, DX features referencing names.
- Blocked by: CFGDISC (config), DISAMBI (resolution), CORECLI (command parsing), TESTFIX (fixtures).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
