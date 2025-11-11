# Live Query Support (LIVEQ)

## Goal
Support GraphQL Live Queries (re-running queries when data changes) using subscriptions or server-provided live query protocol, surfacing incremental updates via NDJSON/table outputs.

## User stories
- As a developer, I can run `gql api liveUsers --live` to continuously receive updates when server invalidates cached data.
- As an analyst, I can specify `--until` conditions to stop live feed once criteria met.

## Assumptions
- Server supports GraphQL Live Queries via WebSocket or SSE (transport may piggyback on SUBWS/SUBSSE) or HTTP polling fallback.
- UNTLBUF/OUTNDJS handle streaming output, buffering, selection.
- CLI can differentiate between regular query and live query mode (maybe via config or directive detection).

## Open issues & risks
- Live Query protocols vary; need adapters (GraphQL over SSE `@live`, custom directives).
- Need resource cleanup to avoid runaway subscriptions.
- Handling patch payloads vs full result updates (maybe full data only initially).

## Clarifying questions
- Which live query protocol to support first (GraphQL Live Query spec vs custom)?
- Do we rely on server-sent `complete` events or manual `--until` to stop?
- Should we persist local cache between updates to compute diffs? (maybe later.)

## Scope
**Include**
- `--live` flag or detection when operation has `@live` directive.
- Transport integration with SUBWS/SUBSSE to subscribe to live updates.
- Output handling for repeated payloads (maybe highlight changed fields).
**Exclude**
- Client-side diff visualization (maybe TUI).
- Live query server components.

## Design notes
- Provide `LiveQueryController` to manage subscription, handle `patch` vs `next` messages, and feed into NDJSON.
- Document protocols supported and required server config.
- Offer fallback to periodic polling when live protocol unavailable.

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
- [ ] `--live` executes operations with server-supported protocol, streaming updates until stopped.
- [ ] Protocol negotiation handles unsupported servers gracefully (helpful error).
- [ ] Works with UNTLBUF/OUTNDJS for buffering + filtering.
- [ ] Tests simulate live query protocol messages (next, patch, complete).

## Dependencies
- Blocks: advanced streaming UX (TUIBROW integration), diagnostics.
- Blocked by: SUBWS/SUBSSE transports, UNTLBUF, CFGDISC (config to mark live-friendly ops), TESTFIX.

## Rollout
- [ ] Behind flag? y
- [ ] Docs updated
- [ ] Changelog entry
