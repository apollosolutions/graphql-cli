# OAuth2 Client Credentials (AUTHOA2)

## Goal
Enable endpoints to use OAuth2 client credentials (and eventually other flows) by fetching access tokens via configured auth servers, caching them until expiry, and injecting into headers automatically.

## User stories
- As a platform engineer, I configure OAuth2 details (token URL, client ID/secret, scopes) so `gql api ...` acquires tokens automatically without manual copying.
- As an SRE, I can run `gql` against protected endpoints and let the CLI refresh tokens when expired.

## Assumptions
- HDRMGMT inserts resulting bearer token header.
- Secrets (client secret) stored via env vars or secure store; CLI should avoid persisting plaintext.
- HTTP client available to perform token request (POST) with retries/backoff (ties into RETRIES/TIMEOUT later).

## Open issues & risks
- Need secure storage for client secrets; may rely on env/secret managers initially.
- Token caching must handle concurrency + expiry; consider lockfile or in-memory with TTL.
- Some providers require mTLS or custom fields; scope for MVP limited to client credentials.

## Clarifying questions
- Do we support device code, auth code flows eventually? (future extension).
- Should we persist tokens on disk or memory-only per run?
- How do we let users supply additional token request params (audience, resource)?

## Scope
**Include**
- Config schema for OAuth2 client credentials (token URL, client_id, client_secret env ref, scopes, audience, headers).
- Token fetcher that caches tokens until expiry and refreshes as needed.
- Error handling + diagnostics (mask secrets, show HTTP response when debug enabled).
**Exclude**
- Interactive login flows (device code) for now.
- PKCE/auth code with browser callbacks (future STUDIOOP?).
- Non-HTTP token providers.

## Design notes
- Use standard form-encoded POST with basic auth or body credentials; support both.
- Store token metadata (expires_in) to refresh proactively.
- Provide CLI command `gql auth status` later maybe; but ensure API exposes token state for diagnostics.

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
- [ ] Endpoints with OAuth2 strategy successfully fetch and refresh tokens, injecting into requests.
- [ ] Secrets never logged; debug output redacts sensitive fields.
- [ ] Errors from auth server include response status/body snippet for troubleshooting.
- [ ] Tests simulate token fetch + refresh flows with mocked server.

## Dependencies
- Blocks: advanced auth/headers, enterprise adoption, diagnostics.
- Blocked by: CFGDISC (config), HDRMGMT (header injection), RETRIES/TIMEOUT (HTTP options), TESTFIX (fixtures).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
