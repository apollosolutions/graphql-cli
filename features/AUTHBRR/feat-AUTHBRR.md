# Bearer Token Auth (AUTHBRR)

## Goal
Provide first-class support for Bearer token auth driven by config or CLI flags, integrating with OS keychain/env vars and header management to set `Authorization: Bearer <token>`.

## User stories
- As a user, I can store my API token in `GQ_TOKEN` or keychain and have `gql` automatically include it for configured endpoints.
- As an operator, I can rotate tokens without changing configs by referencing env vars.

## Assumptions
- HDRMGMT handles final header merge/redaction.
- CFGDISC exposes `auth.strategy: bearer` plus `env`/`command` fields for retrieving tokens.
- CLI may offer `--token` flag override.

## Open issues & risks
- Secure storage: do we integrate with macOS Keychain/Windows Credential Manager or rely on env vars? At least provide command to save token (maybe future STUDIOOP?).
- Need to avoid logging tokens; ensure diagnostics redacted.
- Token refresh/expiry? For bearer tokens likely static; advanced flows handled by OAuth feature.

## Clarifying questions
- Should we support `auth.command` to fetch token dynamically (e.g., 1Password CLI)?
- Do we prompt interactively when token missing?
- How do we handle per-endpoint tokens vs global default?

## Scope
**Include**
- Config schema + validation for bearer auth.
- Token retrieval from env var, CLI flag, optional command hook.
- Integration with HDRMGMT to set authorization header and redaction metadata.
**Exclude**
- OAuth dance/refresh (AUTHOA2 handles).
- API key header/in-query injection (AUTHAPIK).
- Telemetry of auth usage.

## Design notes
- Provide helper `resolveBearerToken(endpointConfig, cliOverrides)` returning token + source for logging.
- Fail fast with descriptive error if token missing when strategy required.
- Consider `gql auth login` helper later but not in MVP.

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
- [ ] Bearer tokens applied to requests when strategy enabled, with env/CLI overrides functioning.
- [ ] Missing token surfaces actionable error message.
- [ ] Tokens never printed in logs/help; redactions verified.
- [ ] Tests cover env var, CLI flag, command-based retrieval.

## Dependencies
- Blocks: downstream auth features, HDRMGMT integration, diagnostics referencing auth state.
- Blocked by: CFGDISC (config), HDRMGMT (headers), CORECLI (flags), TESTFIX (fixtures).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
