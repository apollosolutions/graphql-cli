# Field Selection Builder (FIELDS)

## Goal
Provide `--fields` handling and safe default selection generation so URL mode and endpoint commands can shape responses without forcing users to hand-write GraphQL documents for simple queries.

## User stories
- As a CLI user, I can specify `--fields "id,name,profile{id,email}"` to select only the data I need from an operation.
- When I omit `--fields`, the CLI auto-selects scalar leaf fields (and IDs) to return sensible data without manual docs.

## Assumptions
- URLMODE supplies the operation metadata (root field, return type) from INTROS indexes.
- OUTJSON handles the eventual printing; FIELDS only affects the document sent to the server.
- Users can still pass `--doc path/to/query.graphql`; in that case, FIELDS must step aside.

## Open issues & risks
- Auto-selecting scalar leaves may explode for wide schemas; need heuristics (depth limits, `--max-fields`).
- Handling fragments and interfaces: default builder should respect inline fragment requirements (typename + scalar leaves per concrete type).
- Need to parse `--fields` syntax robustly (commas, braces); consider reusing GraphQL parser vs custom mini-language.

## Clarifying questions
- Should `--fields` support aliasing (`user:node{id}`) or stick to simplified selections?
- How do we expose default selection behavior to users (documented, flag to disable)?
- Do we support `--fields` on mutations/subscriptions equally or warn about side effects?

## Scope
**Include**
- Parser for `--fields` mini-language supporting nested braces and comma-separated selections.
- Default selection generator: collects scalar + enum leaf fields and `id` where available; respects depth/recursion guard.
- Integration with document builder used by URLMODE/endpoint mode to produce final GraphQL document string.
- Validation errors for unknown fields, invalid nesting, or selections on non-object types.
**Exclude**
- Full GraphQL parsing of arbitrary documents (users should use `--doc` for complex needs).
- Fragment reuse across operations (Phase 3 DOCDOC handles authored docs/fragments).
- Automatic inclusion of connection edges/pagination helpers (Phase 4 RELAYPG/OFFSETPG).

## Design notes
- Reuse GraphQL schema metadata to ensure `--fields` respects actual type structure; provide helpful errors showing path.
- Default selection should include `__typename` when interfaces/unions are involved for downstream filtering.
- Provide configuration knobs (`--no-default-fields`, depth limit) to avoid over-fetching; default depth maybe 2.
- Keep builder pure for deterministic testing; golden fixtures should compare generated docs directly.

## Tasks
- [x] Implementation
- [x] Docs/Help updates
- [x] Tests:
  - [x] Unit
  - [ ] Integration
  - [ ] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Implementation notes (2025-11-09)
- Added `src/fields/parser.ts`, a lightweight tokenizer/recursive-descent parser for the `--fields` mini-language supporting comma-delimited selections and nested braces.
- Added `src/fields/builder.ts`, which turns parsed selections into GraphQL documents and can generate safe default selections (scalar/enums + `__typename`) with a depth limit to avoid runaway documents.
- Validation uses schema metadata to ensure unknown fields or missing sub-selections throw `InvalidArgsError`, wiring into ERRXIT.
- Unit tests (`tests/unit/fields.parser.test.ts`, `tests/unit/fields.builder.test.ts`) cover parsing, document rendering, validation, and default selection generation.
- Authored `docs/fields.md` describing syntax, defaults, and how future commands can integrate the helpers.

## Acceptance criteria
- [x] `--fields` parser handles nested selections, whitespace, and errors clearly (unknown field -> actionable message).
- [x] Default selection covers scalar leaves + `id` without exceeding configured depth; tests guard against regressions.
- [ ] Operations using default builder execute successfully without `--fields` provided. *(Pending URLMODE wiring.)*
- [ ] Document builder integrates seamlessly with URLMODE: `--doc` overrides, `--fields` merges, defaults otherwise. *(Pending command integration.)*

## Dependencies
- Blocks: URLMODE, SELECTR, DOCDOC, pagination helpers needing base selections.
- Blocked by: INTROS (type metadata), CORECLI (flag plumbing), TESTFIX (fixtures).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
