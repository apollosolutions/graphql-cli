# API Key Auth (AUTHAPIK)

## Goal
Support API key authentication strategies where tokens are injected as custom headers or query parameters, configurable per endpoint with secure env storage similar to bearer auth.

## User stories
- As a developer, I configure `auth.strategy: apikey` with `header: X-API-Key` and env var reference so each request automatically includes the key.
- As an integrator, I can choose to send the API key via query string (`?key=`) when backend expects it.

## Assumptions
- HDRMGMT handles header injection; for query param injection we modify request builder before HTTP call.
- CFGDISC schema includes API key options (header name, query param name, env var, prefix/suffix).
- Keys stored in env vars or external command, similar to AUTHBRR.

## Open issues & risks
- Query param keys may appear in logs/URLs; need redaction support.
- Some providers require both header + param; ensure config supports multi-target injection.
- Should we support base64 or hash transformations of keys before sending?

## Clarifying questions
- Do we allow referencing secret files (e.g., `@apikey.txt`)?
- How to support multiple keys per endpoint (different roles)? maybe future.
- Should CLI provide `gql auth set apikey` helper? not now.

## Scope
**Include**
- Config schema + validation for API key strategy (header vs query param, env var resolution, optional prefix `Token `).
- Integration with request builder to append header/query parameter.
- Redaction + diagnostics similar to bearer.
**Exclude**
- HMAC signing or more complex auth flows (custom plugin or SECBOX later).
- Rate limit/backoff logic tied to API key usage.

## Design notes
- Provide `resolveApiKey(config, overrides)` returning `{ value, placement }`.
- For query param injection, ensure proper URL encoding and respect existing query string.
- Support CLI override flag `--api-key` for quick testing.

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
- [ ] API key applied in correct location (header/param) based on config, with env/CLI overrides functioning.
- [ ] Keys redacted in diagnostics/logging.
- [ ] Missing key yields clear error.
- [ ] Tests cover header + query param placements and override precedence.

## Dependencies
- Blocks: advanced auth features, HDRMGMT integration, diagnostics.
- Blocked by: CFGDISC, HDRMGMT, request builder (URLMODE/endpoint), TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
