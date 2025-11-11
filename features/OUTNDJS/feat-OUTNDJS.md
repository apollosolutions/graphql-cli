# NDJSON & Streaming Output (OUTNDJS)

## Goal
Stream query/mutation/subscription results as newline-delimited JSON (`--ndjson`) so pipelines can process large result sets incrementally, optionally buffering/batching per plan.

## User stories
- As a data engineer, I can run `gql api users --ndjson` and consume each record line-by-line without waiting for the entire payload.
- As an SRE tailing subscription events, I get each payload as a JSON line with optional timestamps.

## Assumptions
- Works on top of streaming transport (SUBWS/SUBSSE) and regular HTTP responses that return arrays.
- SELECTR can operate per-chunk before serialization if expressions provided.
- CLI should auto-switch to NDJSON for arrays but still allow manual `--ndjson` override.

## Open issues & risks
- GraphQL spec typically returns a single JSON response; to offer NDJSON for queries we may need to treat `data.list` arrays as iterables (client-side chunking) which can be memory-intensive.
- Need consistent record boundaries and newline handling for binary-safe piping.
- Interaction with `--table`/`--out` flags must be clearly defined (mutually exclusive?).

## Clarifying questions
- Should we support `--ndjson --buffer 100` to group outputs? ties into UNTLBUF.
- Do we include metadata envelope (operation name, timestamp) per line or raw data only? configurable?
- How do we handle GraphQL errors mid-stream? (Probably emit `{"errors":...}` line then exit non-zero.)

## Scope
**Include**
- `--format ndjson` flag that emits newline-delimited JSON after `--select`.
- Works for standard query/mutation responses (arrays) and falls back to single-line output when input isn’t an array.
**Exclude (future work)**
- Subscription buffering/UNTLBUF integration.
- Additional metadata envelopes or per-line headers.

## Design notes
- For regular query responses returning arrays, iterate and emit each element as JSON line with newline; include fallback to single-line output when not array.
- Ensure STDOUT writes are flushed promptly (set `stdout.write` + `\n`).
- Provide tests verifying both array chunking and subscription streaming outputs.

## Tasks
- [x] Implementation (`writeGraphQLResponse` ndjson branch + CLI flag plumbing)
- [x] Docs/Help updates (urlmode/endpoints/select/spec/plan/changelog)
- [x] Tests:
  - [x] Integration (`tests/integration/render-json.test.ts`, `tests/integration/cli-basic.test.ts`)
  - [x] Golden fixtures (not needed, existing tests assert textual output)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Acceptance criteria
- [x] `--format ndjson` outputs one JSON object per line for list results, falling back to a single line for scalars/objects.
- [x] Works with `--select` and is mutually exclusive with `--jq`.
- [x] Documented behavior + integration coverage for core commands.

## Dependencies
- Blocks: UNTLBUF (buffering controls), streaming features, automation workflows.
- Blocked by: OUTJSON baseline, SELECTR (optional), SUBWS/SUBSSE for realtime, CORECLI flags.

## Rollout
- [x] Behind flag? n
- [x] Docs updated
- [x] Changelog entry
