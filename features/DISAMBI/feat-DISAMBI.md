# Operation Disambiguation (DISAMBI)

## Goal
Resolve operation names without requiring explicit operation type by detecting conflicts across Query/Mutation/Subscription roots and applying prefer/prompt policies defined in config.

## User stories
- As a user, I can run `gql api users` and the CLI figures out whether `users` lives under Query or Mutation without me specifying `--kind`.
- When multiple operations share the same name, I either get prompted (if TTY + policy) or the preferred root is chosen automatically per config.

## Assumptions
- CFGDISC supplies per-endpoint policies: `preferKindOnConflict`, `promptOnConflict`, `aliases`, `kind overrides`.
- INTROS provides root-type indexes listing field names.
- CLI environment knows whether STDIN/STDOUT are TTY to decide if prompting allowed.

## Open issues & risks
- Need deterministic behavior in non-interactive contexts: default fallback must be documented.
- When operations exist on more than two root types (Query + Subscription), need user-friendly choices.
- Prompting can't block automation; ensure `--kind` override bypasses prompts.

## Clarifying questions
- Do we remember last choice per session to avoid repeated prompts? (probably not MVP)
- Should `--kind` accept shorthand (q/m/s) or only full words?
- How do we communicate conflicts in help output?

## Scope
**Include**
- Resolver that takes operation name + config + schema indexes and returns `{ rootType, field }` or throws with suggestions.
- Conflict policy implementation: prefer/prompt/fail with hints; interactive prompt when allowed.
- `--kind` override wiring and validation.
- Error messages with Levenshtein suggestions when operation not found.
**Exclude**
- Multi-operation selection (running multiple fields at once).
- Interactive search UI beyond simple prompt list.
- Schema diff awareness (belongs to diagnostics).

## Design notes
- Reuse indexes from INTROS to avoid recomputing field lists.
- Provide hook for HELPEP to display conflict info (maybe `*` marker) referencing same resolver metadata.
- Ensure prompts fall back gracefully when not TTY or user cancels (Ctrl+C) with exit code.
- Suggest closest operation names when not found to improve UX.

## Tasks
- [x] Implementation (`runCli` now registers endpoint commands via `src/project/endpoint-command.ts`, which builds schema indexes & resolver logic)
- [x] Docs/Help updates (`docs/endpoints.md`, `docs/plan.md`, `docs/changelog.md`)
- [x] Tests:
  - [x] Unit (operation index/resolution helpers exercised indirectly via integration + TypeScript coverage)
  - [x] Integration (`tests/integration/project-mode.test.ts` covers preference, aliases, `--kind`)
  - [x] Golden fixtures (n/a)
- [x] Telemetry (n/a)
- [x] Feature flag (n/a)

## Acceptance criteria
- [x] Operations with a single matching root resolve immediately and feed the correct kind into `runUrlMode`.
- [x] Conflict resolution honors `help.preferKindOnConflict` (default Query) and still allows manual override via `--kind`.
- [x] `--kind` validates values (query/mutation/subscription); invalid values throw `InvalidArgsError` before execution, subscriptions currently error out with a descriptive message.
- [x] Unknown operations surface actionable suggestions using Levenshtein distances (see `tests/integration/project-mode.test.ts`).

## Implementation notes (2025-11-11)
- Schema indexes (`buildOperationIndex`) retain the GraphQL `GraphQLField` references for each root so execution + help share metadata without repeated introspection.
- Operation resolution (`resolveOperation`) applies alias + rename normalization, config preferences, and leverages `normalizeOperationKind` for `--kind`.
- Errors bubble up through ERRXIT with hints (e.g., "Did you mean: hello?"); integration tests assert both success and failure flows.

## Dependencies
- Blocks: Endpoint execution, HELPEP conflict annotations, SELECTR/OPLIST listing order.
- Blocked by: CFGDISC (policies), INTROS (indexes), CORECLI (prompt infra), TESTFIX (fixtures).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
