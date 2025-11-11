# Mock Server from Schema (MOCKSRV)

## Goal
Spin up a local mock GraphQL server derived from cached schema (INTROS) with customizable resolvers/fakers so teams can test CLI flows without hitting real endpoints.

## User stories
- As a developer offline, I run `gql mock start --schema cache` to start a mock server and point CLI commands at it.
- As QA, I can define fixture scripts to control mocked responses per operation.

## Assumptions
- INTROS provides schema SDL/JSON; we can use libraries like `graphql-tools` to mock resolvers.
- CLI spawns local server (maybe on random port) and optionally proxies via config.
- Mock server should support custom resolvers defined via JS module or config file.

## Open issues & risks
- Need to ensure mock server doesn't conflict with existing ports; auto-select or allow `--port`.
- Security: mock server should not expose secret data; warn if accessible on public interfaces.
- Keeping mocked data deterministic for tests vs random fakers.

## Clarifying questions
- Do we support scenario scripting (per-operation responses) or simple faker defaults? (both?)
- Should we integrate with RECORD flows to replay captured sessions via mock server?
- How do we manage server lifecycle (foreground vs background)?

## Scope
**Include**
- `gql mock start/stop/status` commands to manage local mock server.
- Config for faker options, static fixture files, delay injection.
- Integration with CLI so endpoint config can point to mock server easily.
**Exclude**
- Cloud-hosted mocking service.
- Complex stateful simulations (maybe future).

## Design notes
- Use `graphql-tools` `addMocksToSchema` with faker libs; allow overriding specific types/fields.
- Provide ability to load fixture JSON/JS modules exporting resolver overrides.
- For deterministic tests, support seeding random generator.

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
- [ ] Users can start mock server from schema cache or file, optionally customizing resolvers.
- [ ] CLI indicates server URL and how to target it.
- [ ] Mock server logs requests with redacted headers, supporting delays/errors for testing.
- [ ] Tests cover default faker + custom fixture overrides.

## Dependencies
- Blocks: offline testing, RECORD replay, diagnostics.
- Blocked by: INTROS (schema data), CORECLI (commands), HDRMGMT (logging), TESTFIX.

## Rollout
- [ ] Behind flag? y
- [ ] Docs updated
- [ ] Changelog entry
