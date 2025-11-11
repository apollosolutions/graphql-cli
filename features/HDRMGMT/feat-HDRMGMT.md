# Header Management (HDRMGMT)

## Goal
Give users ergonomic ways to define, override, and inspect HTTP headers per request (global flags, per-endpoint config, env vars) with merge rules and redaction for diagnostics output.

## User stories
- As a user, I can set default headers in `.gqlrc.yml` and override them at runtime via `-H "X-Tenant:foo"` or `--header key=value`.
- As a troubleshooter, I can run `--print-request` to view outgoing headers with secrets redacted.

## Assumptions
- CFGDISC already loads `headers` from config; HDRMGMT handles merging CLI overrides, env substitution, and redaction.
- Auth features (AUTHBRR/APIKey/OAuth) plug into header stack by adding `Authorization` or other fields.
- CLI parser supports repeated `-H` flags.

## Open issues & risks
- Need deterministic merge order: CLI overrides > endpoint config > global defaults.
- Redaction rules must handle custom headers (Authorization, X-Api-Key) to avoid leaking secrets in logs.
- Users may need to remove headers (e.g., `--header Authorization=`); support nulling semantics.

## Clarifying questions
- Should we support header presets/profiles per environment?
- Do we allow referencing files for header values (e.g., `@token.txt`)?
- How do we expose effective headers for debugging (command to print)?

## Scope
**Include**
- Header builder utilities combining config + CLI + auth outputs.
- Flag syntax `-H key:value`, `--header key=value`, `--header-json '{"X": "Y"}'` as needed.
- Redaction logic for diagnostics/telemetry.
- Validation errors for malformed header syntax.
**Exclude**
- Cookie jar management.
- HTTP/2 pseudo header tuning (belongs to HTTP2 feature).
- Rate limiting/backoff decisions (RETRIES/TIMEOUT handle).

## Design notes
- Provide `buildHeaders(endpointConfig, cliOverrides, authContext)` returning `{ headers, redactedHeaders }`.
- Keep header names case-insensitive; store canonicalized form.
- Document precedence + removal semantics.

## Tasks
- [x] Implementation
- [x] Docs/Help updates
- [x] Tests:
  - [x] Unit
  - [x] Integration
  - [x] Golden fixtures (if applicable) *(n/a)*
- [x] Telemetry (if enabled) *(n/a)*
- [x] Feature flag (if applicable) *(n/a)*

## Implementation notes (2025-11-13)
- Added `src/http/headers.ts` to parse directives, canonicalize names, merge layers, and emit `{ headers, redacted }` so every command (URL mode, endpoint mode, schema/ops targets, and `gql init`) shares the same precedence and validation rules. CLI overrides now accept both `Key: Value` and `Key=Value`, case-insensitive overrides respect the order they were provided, and `--header Authorization=` removes inherited headers.
- Introduced `src/http/diagnostics.ts` plus a `--print-request` flag that prints the HTTP method, URL, redacted headers, and GraphQL payload to STDERR before execution. Sensitive headers (Authorization/api keys/tokens/secrets) are masked as `***REDACTED***` automatically.
- Updated docs (spec, endpoints/urlmode guides, changelog, plan) to describe header syntax/removal and the new diagnostics flag. The feature tracker + changelog now mark HDRMGMT as shipped.
- Coverage: new `tests/unit/headers.test.ts` locks in parsing/merging/redaction, URL-mode + project-mode integration tests assert `--print-request` output and header removal, and existing suites continue to pass without golden updates.

## Acceptance criteria
- [x] Header merging respects precedence rules and handles removals.
- [x] CLI overrides validated (reject missing colon/equal) with helpful errors.
- [x] `--print-request`/diagnostics show redacted headers (Authorization masked).
- [x] Auth modules integrate via shared builder. *(Future auth features will push layers into the shared builder.)*

## Dependencies
- Blocks: AUTHBRR, AUTHAPIK, AUTHOA2, diagnostics (PRINTIO), RETRIES (header hash for cache), INTROS (ETag).
- Blocked by: CFGDISC (config), CORECLI (flags), TESTFIX (fixtures).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
