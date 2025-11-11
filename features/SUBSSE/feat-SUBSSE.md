# Server-Sent Events Subscriptions (SUBSSE)

## Goal
Support GraphQL subscriptions or live queries delivered via SSE endpoints (e.g., Apollo @defer, GraphQL over SSE spec), offering an alternative when WebSockets unavailable.

## User stories
- As a developer behind restrictive firewalls, I can run `gql api onUserUpdated --sse` to receive events via HTTP streaming.
- As an operator, I can inspect SSE event metadata and buffer behavior similar to WebSocket subscriptions.

## Assumptions
- Servers expose SSE endpoint (configurable) returning `event: next/data` frames per GraphQL over SSE spec.
- OUTNDJS handles event output; UNTLBUF provides buffering/expression-based stop conditions.
- Authentication uses regular HTTP headers (HDRMGMT) per request.

## Open issues & risks
- Need to handle reconnect semantics manually for SSE (HTTP reconnection, Last-Event-ID?).
- SSE streams may include keepalive comments; parser must skip them.
- Some providers send multi-part events (next/complete/errors) requiring state machine.

## Clarifying questions
- Do we store Last-Event-ID and resume automatically? optional config.
- Should we auto-fallback from WS to SSE or require explicit `--sse` flag?
- How do we surface partial/defer events vs final completion?

## Scope
**Include**
- SSE client reading event stream, parsing GraphQL payloads, detecting completion.
- Config options for SSE URL, headers, reconnection/backoff.
- Integration with OUTNDJS/UNTLBUF/ERRXIT for output + error mapping.
**Exclude**
- Browser-specific SSE polyfills.
- HTTP/2 push features beyond SSE spec.
- Multi-operation multiplexing.

## Design notes
- Implement incremental parser tolerant of chunked transfers; handle BOM/newline edge cases.
- Provide metrics/logging for reconnect counts.
- Align event semantics with WebSocket pipeline so higher layers share code.

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
- [ ] `gql <endpoint> <subscription> --sse` streams events, handling reconnect/backoff as configured.
- [ ] Parser handles keepalives/comments and emits data/error events correctly.
- [ ] Errors map to ERRXIT (network vs GraphQL errors) with informative messages.
- [ ] Works with UNTLBUF/OUTNDJS buffering + selection options.

## Dependencies
- Blocks: UNTLBUF, LIVEQ stretch, streaming diagnostics.
- Blocked by: HDRMGMT/AUTH, CFGDISC (SSE URL), OUTNDJS, CORECLI flags, TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
