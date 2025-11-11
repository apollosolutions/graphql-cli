# @defer / @stream Rendering (DEFERST)

## Goal
Handle GraphQL incremental delivery (`@defer`, `@stream`) by rendering partial results progressively in the CLI (JSON, table, NDJSON) while indicating placeholders and completion state.

## User stories
- As a developer, I can run `gql api userProfile --doc profile.graphql --defer` and see initial payload followed by deferred fragments as they arrive.
- As an analyst, I can stream list fields annotated with `@stream` and pipe them into other tools without waiting for entire list.

## Assumptions
- Server supports GraphQL over SSE or multipart responses with incremental payload messages (`next`, `complete`).
- OUTNDJS/UNTLBUF pipeline can consume incremental chunks.
- CLI must differentiate between final and in-progress states.

## Open issues & risks
- Protocol differences between multipart/mixed responses vs SSE vs WebSocket; need unified parser.
- Need to show placeholders in JSON output (maybe `null` + metadata) until deferred payload arrives.
- Interaction with SELECTR/TABLE outputs may require buffering until fragment resolved.

## Clarifying questions
- Should CLI automatically enable SSE when docs contain `@defer`/`@stream`? probably yes if supported.
- Do we expose CLI flag `--defer-mode` to control output (raw incremental vs assembled final)?
- How to handle errors inside deferred fragments (display without failing entire command?).

## Scope
**Include**
- Incremental payload parser supporting multipart responses and SSE events.
- Output renderer that updates JSON/table views as new patches arrive (maybe printing patch events sequentially via NDJSON).
- Flags to control behavior (`--defer`, `--assemble-final`, `--show-patches`).
**Exclude**
- Server implementation of defer/stream.
- GUI diff visualizations (maybe TUIBROW later).

## Design notes
- Represent incremental events internally as `{ label, path, data, errors, hasNext }`.
- Provide options: `--assemble-final` (apply patches to base object and print final result) vs `--patches` (emit each patch as NDJSON).
- Integration with ERRXIT to decide exit status when partial errors occur.

## Tasks
- [ ] Implementation
- [ ] Docs/Help updates
- [ ] Tests:
  - [ ] Unit
  - [ ] Integration
  - [ ] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Acceptance criteria
- [ ] CLI handles incremental payloads, showing partial + final data according to flags.
- [ ] Errors inside deferred fragments displayed without crashing base flow.
- [ ] Works over SSE (preferred) and multipart HTTP responses.
- [ ] Tests cover sample deferred + streamed lists.

## Dependencies
- Blocks: advanced streaming UX, TUIBROW integration.
- Blocked by: SUBSSE/SUBWS transports, OUTNDJS/UNTLBUF, SELECTR (patch application), TESTFIX.

## Rollout
- [ ] Behind flag? y
- [ ] Docs updated
- [ ] Changelog entry
