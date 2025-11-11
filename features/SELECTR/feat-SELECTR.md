# Output Selection & Filtering (SELECTR)

## Goal
Provide `--select` (JMESPath-like) and `--jq` passthrough options to shape GraphQL responses post-fetch, enabling quick extraction of fields or transformation pipelines.

## User stories
- As a CLI user, I can run `gql api users --select data.users[*].name` to print just the list of names.
- As an automation script, I can pipe the JSON through embedded `jq` without shelling out separately by using `--jq '.data.users[] | {id, email}'`.

## Assumptions
- OUTJSON handles base serialization; SELECTR layers on top before printing.
- Dependencies like `jmespath` or `jq` (embedded) available; for `--jq`, we may shell out to installed jq or use wasm port.
- Works consistently in both ad-hoc and endpoint modes.

## Open issues & risks
- Embedding jq may bloat binary; evaluate fallback to system jq.
- Selection errors should map to ERRXIT codes with clear messaging.
- Interaction with other output formats (table, ndjson) needs defined behavior (only allowed with JSON?).

## Clarifying questions
- Should `--select` run before or after `--jq` when both provided? (Probably select first, then jq.)
- Do we allow saving selection results to file directly (`--out`)?
- How do we handle `null` results (print `null` vs nothing)?

## Scope
**Include**
- Implementation of `--select` using lightweight query language (JMESPath or custom) for JSON bodies.
- Optional `--jq` passthrough either by bundling jq or invoking external binary with streaming support.
- Error handling + tests for invalid expressions.
**Exclude**
- SQL-like querying or aggregator functions beyond what JMESPath/jq provide.
- Streaming transforms for subscriptions (handled later with OUTNDJS/UNTLBUF).
- Full data templating (belongs to future features if needed).

## Design notes
- Provide guardrails: when `--raw` used, disable selectors to avoid ambiguity.
- Document precedence between `--select`, `--jq`, `--out`, and table/ndjson outputs.
- Add `--select-expr-file` optional later if needed.

## Tasks
- [x] Implementation (`writeGraphQLResponse`, `--select/--jq` flags, jq binary detection)
- [x] Docs/Help updates (`docs/select.md`, updates in urlmode/endpoints/spec/plan/changelog)
- [x] Tests:
  - [x] Unit *(covered via render-json integration exercising selection/jq paths)*
  - [x] Integration (`tests/integration/render-json.test.ts` + url/endpoint coverage indirectly)
  - [x] Golden fixtures (no new snapshots required; render-json continues to use goldens)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Acceptance criteria
- [x] `--select` extracts subsets of response data with deterministic output + tests.
- [x] `--jq` option processes responses (via local jq binary configurable by `GQL_JQ_BIN`) with piping support.
- [x] Invalid expressions produce helpful errors and exit codes.
- [x] Works alongside `--fields`/`--doc` and respects other output flags (guarded against `--raw`) with documented precedence.

## Dependencies
- Blocks: OUTTABL/OUTNDJS hooking into selection layer, automation workflows.
- Blocked by: OUTJSON (base output), CORECLI (flag plumbing), TESTFIX (fixtures).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
