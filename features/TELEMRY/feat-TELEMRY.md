# Telemetry & Usage Analytics (TELEMRY)

## Goal
Implement opt-in telemetry that captures anonymized usage metrics (commands run, success/failure, latency buckets) to inform product decisions, with clear consent, data storage, and opt-out controls.

## User stories
- As a product manager, I can review aggregated metrics on CLI command usage (URL mode vs endpoint mode, top flags) to prioritize features.
- As a user, I can opt in/out easily (`gql telemetry enable/disable`) and view collected data.

## Assumptions
- Default stance likely opt-out until user opts in (or during init prompt) to respect privacy.
- Data sent to Apollo-controlled endpoint with authentication + batching.
- Logs/telemetry must exclude sensitive data (URLs, tokens, variables) unless explicitly allowed.

## Open issues & risks
- Regulatory/privacy compliance (GDPR, SOC2) requires clear consent + data deletion paths.
- Need to ensure telemetry never blocks command execution (send async, best-effort).
- Provide offline queue handling when network unavailable.

## Clarifying questions
- Opt-in policy? (During `gql init` or first run.)
- Data payload schema: what fields are safe/useful (command name, duration, exit code, environment OS)?
- How do we surface telemetry status (`gql telemetry status`)?

## Scope
**Include**
- Telemetry manager handling consent state, config storage, event batching, HTTP sending with retries/backoff.
- CLI commands: `gql telemetry enable|disable|status|report`.
- Documentation/privacy statement listing collected fields + endpoints.
**Exclude**
- Personal data collection beyond minimal OS/runtime info.
- Third-party analytics SDK integration (custom lightweight client instead).

## Design notes
- Store consent + device ID in config directory (UUID). Provide command to reset/delete data.
- Events contain hashed endpoint IDs rather than raw URLs to protect privacy.
- Use background worker (Promise) with best-effort send; failure should not impact exit code.

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
- [ ] Users can enable/disable telemetry with clear messaging; default state documented.
- [ ] Collected data excludes sensitive fields; logs confirm redaction.
- [ ] Events sent asynchronously with batching, retries, and offline queue.
- [ ] Privacy statement + docs shipped outlining data usage + opt-out steps.

## Dependencies
- Blocks: product analytics, POLICYCI (maybe), DX research.
- Blocked by: CORECLI (command + config storage), LOGTRCE (metrics), PKGREL (version info for telemetry), TESTFIX.

## Rollout
- [ ] Behind flag? y (gradual rollout)
- [ ] Docs updated
- [ ] Changelog entry
