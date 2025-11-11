# WebSocket Subscriptions (SUBWS)

## Goal
Enable GraphQL subscriptions over WebSocket transports (graphql-ws / graphql-transport-ws) with reconnect/backoff policies, header/auth propagation, and integration with NDJSON output.

## User stories
- As a user, I can run `gql api onUserUpdated --ws` and receive events streamed to my terminal.
- As an SRE, I can set `--until` conditions (from UNTLBUF) or manual Ctrl+C to stop streaming gracefully.

## Assumptions
- Server supports `graphql-transport-ws` (preferred) with fallback to legacy `graphql-ws` per config.
- HDRMGMT/AUTH* supply headers; connection params may reuse headers.
- OUTNDJS handles output formatting per event.

## Open issues & risks
- Need heartbeat/ping support to detect dropped connections.
- Reconnect/backoff policies must avoid thundering herd; expose config.
- Multi-endpoint operations may require separate WS URLs; config should allow overriding `subscriptionsUrl`.

## Clarifying questions
- Should we auto-upgrade to SSE (SUBSSE) if WS blocked? or require explicit flag?
- Do we support multiplexing multiple operations over single connection? maybe later.
- How do we surface connection errors/exits to ERRXIT codes?

## Scope
**Include**
- WebSocket client supporting `graphql-transport-ws` handshake, connection init payloads, keepalive, and single-operation subscription.
- CLI flags/config for `--ws`, `--connection-params`, `--reconnect`, `--max-retries`.
- Integration with OUTNDJS + UNTLBUF for output/buffering.
**Exclude**
- Live query patching (LIVEQ stretch feature).
- GraphQL over MQTT or other transports.
- Complex multiplexing/protocol negotiation beyond ws vs legacy.

## Design notes
- Abstract transport interface so SUBSSE can reuse subscription pipeline.
- Provide debug logging for connection lifecycle when `--debug` or `GQL_DEBUG=1`.
- Ensure cancellations propagate (Ctrl+C closes socket, sends complete message).

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
- [ ] `gql <endpoint> <subscription>` streams events via WebSocket, handling auth headers + connection params.
- [ ] Reconnect/backoff options work with tests simulating dropped connections.
- [ ] Errors (connection refused, protocol mismatch) map to ERRXIT codes with clear messaging.
- [ ] Plays nicely with OUTNDJS/UNTLBUF for output buffering.

## Dependencies
- Blocks: UNTLBUF buffering, SUBSSE fallback, streaming diagnostics.
- Blocked by: HDRMGMT/AUTH*, CFGDISC (ws url config), CORECLI (flags), TESTFIX (mock server), OUTNDJS.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
