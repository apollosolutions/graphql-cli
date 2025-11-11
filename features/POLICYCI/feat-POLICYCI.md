# CI Policy Enforcement (POLICYCI)

## Goal
Provide policy hooks and CI integrations to block unsafe GraphQL operations (e.g., deleting data) from being added to safelists or executed in automation, leveraging plugins or config rules.

## User stories
- As a security engineer, I define policy rules so CI fails when a new operation matches forbidden patterns (mutations touching certain fields).
- As a DevOps engineer, I can run `gql policy check` locally before pushing to ensure flows comply.

## Assumptions
- Policies defined via config file (YAML/JS) referencing schema metadata, operation docs, maybe Studio data.
- CLI can run in CI headless, outputting JSON results + exit codes for gating.
- Plugins (PLUGINAPI/PLUGNREQ) may provide additional enforcement logic.

## Open issues & risks
- Need flexible rule language (maybe JSONPath/JMESPath) for matching operations.
- Policies must stay current with schema changes; consider referencing fields by name/type.
- False positives could block deploys; rules should support severity levels (warn vs error).

## Clarifying questions
- Do we integrate with Apollo Studio checks or operate entirely locally?
- Should rules support referencing environment context (branch, actor)?
- How do we distribute shared policy sets across repos?

## Scope
**Include**
- Policy definition format + loader, referencing operations from DOCDOC/OPLIST or Studio.
- CLI command `gql policy check [--json]` for local/CI use, plus GitHub Action sample.
- Integration with RECORD/STUDIOOP to reuse recorded flows for policy verification.
**Exclude**
- Runtime enforcement during CLI execution (unless hooking via plugins) beyond warnings.
- GraphQL server-side enforcement (out of scope).

## Design notes
- Provide built-in rule types: forbid operation name patterns, limit selection depth, restrict arguments, require headers.
- Support custom JS rules via plugin interface.
- Output structured report (pass/fail, violated rules, severity) for CI consumption.

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
- [ ] Policy files parsed/validated; invalid rules produce actionable errors.
- [ ] `gql policy check` exits non-zero when critical rules violated; supports JSON report for CI.
- [ ] Sample GitHub Action provided to run policy checks on PRs.
- [ ] Tests cover built-in rules + custom rule plugin.

## Dependencies
- Blocks: enterprise governance, plugin sandbox (SECBOX), STUDIOOP integration.
- Blocked by: PLUGINAPI (extensibility), DOCDOC/OPLIST (operation metadata), CORECLI command, TESTFIX.

## Rollout
- [ ] Behind flag? y
- [ ] Docs updated
- [ ] Changelog entry
