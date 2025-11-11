# Plugin Request Hooks (PLUGNREQ)

## Goal
Allow plugins to observe and mutate HTTP requests/responses (headers, variables, documents) via safe hook APIs, enabling custom logging, auth, or policy enforcement.

## User stories
- As a security team, we can write a plugin that inspects outgoing operations and blocks those matching restricted patterns.
- As a telemetry team, we can capture request/response timings and emit metrics without modifying core code.

## Assumptions
- PLUGINAPI foundational system exists, providing registration + lifecycle.
- Hooks execute sequentially with error handling to prevent request corruption.
- Hooks should not mutate shared state without explicit API support.

## Open issues & risks
- Need to guard sensitive data; plugins may access headers (tokens). Provide sandbox options (SECBOX) or permission scopes.
- Performance overhead if many hooks run per request; need caching/opt-out.
- Hook order may impact results; document deterministic ordering.

## Clarifying questions
- Should hooks be async and allow request cancellation? (likely yes via thrown errors.)
- Do we allow streaming modification (e.g., rewriting response body) or only metadata?
- How do we expose config to plugins (per-endpoint)?

## Scope
**Include**
- Hook interfaces: `beforeRequest`, `afterResponse`, `onError` with typed payloads.
- Permission model for plugins declaring what data they access.
- Error propagation policy (hook throw -> abort request with ERRXIT code + plugin name).
**Exclude**
- Network-level proxies (HTTP intercept). Hooks operate in-process only.
- UI for managing plugin permissions (maybe later).
- Telemetry backend integration (plugin can implement).

## Design notes
- Provide immutable view with limited mutators: e.g., `context.request.headers.set`, `context.variables.patch`.
- Maintain audit log showing which plugins touched a request (helpful for debugging).
- Offer `context.shared` for plugin state per command run.

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
- [ ] Plugins can register request hooks that observe/mutate requests safely.
- [ ] Permissions enforced; unauthorized access attempts blocked/logged.
- [ ] Hook errors bubble up with plugin attribution + exit codes.
- [ ] Tests cover multiple plugins, mutation order, failure handling.

## Dependencies
- Blocks: PLUGCMD advanced features, SECBOX security model, enterprise policies.
- Blocked by: PLUGINAPI (base), HDRMGMT/VARMAPR (structures to mutate), CORECLI (context), TESTFIX.

## Rollout
- [ ] Behind flag? y
- [ ] Docs updated
- [ ] Changelog entry
