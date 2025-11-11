# Relay Pagination Helpers (RELAYPG)

## Goal
Provide helpers (`--paginate relay`) to iterate through Relay-style connections automatically, handling `first/after` vars, `pageInfo`, and output accumulation/streaming.

## User stories
- As a data analyst, I can run `gql api usersConnection --paginate relay --limit 500` to fetch multiple pages without scripting loops.
- As a CLI user, I can specify `--path data.usersConnection.edges[].node` to stream nodes via NDJSON.

## Assumptions
- Schema uses Relay conventions: arguments `first`/`after`, response fields `pageInfo`, `edges/node`.
- VARMAPR handles variable updates; RELAYPG orchestrates repeated calls adjusting cursor.
- Works with both ad-hoc and endpoint commands.

## Open issues & risks
- Need to guard against infinite loops when server misreports `hasNextPage`.
- Rate limiting/backoff interplay with RETRIES/TIMEOUT features.
- Default limit vs user-specified `--limit` semantics.

## Clarifying questions
- Do we support backward pagination (`last`/`before`)? maybe later.
- Should we allow overriding argument names for non-standard schemas?
- How do we surface progress (counts) to users? progress bar vs logs.

## Scope
**Include**
- `--paginate relay` flag plus options: `--limit`, `--page-size`, `--cursor-var after`, `--path` for extracting nodes.
- Loop controller that persists `after` cursor between requests and writes output via OUTNDJS/OUTTABL.
- Error handling for missing required fields.
**Exclude**
- GraphQL list pagination without Relay patterns (OFFSETPG handles offset/limit).
- Automatic deduplication; rely on server for unique nodes.
- Persistent resume/resume tokens (maybe future).

## Design notes
- Use safe default page size (e.g., 100) if not specified.
- Provide stats summary after run (# requests, items, duration).
- Allow `--cursor <file>` to resume later? maybe optional.

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
- [ ] Relay pagination fetches successive pages until `hasNextPage=false` or `--limit` reached, with tests using mock server.
- [ ] Users can override arg names/path if schema deviates.
- [ ] Errors on missing `pageInfo` or `edges` fields provide actionable messages.
- [ ] Works with NDJSON/table outputs seamlessly.

## Dependencies
- Blocks: advanced data export flows, UNTLBUF interplay.
- Blocked by: VARMAPR (arg setting), FIELDS (selection ensures pageInfo), OUTNDJS/SELECTR (output), CORECLI flags, TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
