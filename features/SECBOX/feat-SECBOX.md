# Plugin Sandboxing & Permissions (SECBOX)

## Goal
Provide sandboxing/permission controls for plugins so administrators can restrict access to sensitive data (tokens, files, network) and review requested capabilities before enabling plugins.

## User stories
- As a security engineer, I can require plugins to declare permissions (e.g., `readHeaders`, `writeFiles`) and deny ones that look risky.
- As an admin, I can run `gql plugins status` to see which plugins are enabled, their versions, and granted permissions.

## Assumptions
- PLUGINAPI + PLUGNREQ/PLUGCMD exist; SECBOX adds guardrails.
- Running inside Node runtime; sandboxing may rely on vm contexts or subprocess isolation depending on risk.
- Permission decisions stored in config or trust policy file.

## Open issues & risks
- Implementing strong isolation in Node is non-trivial; may start with soft permissions (policy enforcement) before full sandbox.
- Need UX for granting/revoking permissions (interactive prompt vs config editing).
- Compatibility: some plugins may require native modules; sandbox might break them.

## Clarifying questions
- Do we provide signed plugin registry/trust store for verifying plugin authenticity?
- Should we support enterprise policy files that pre-approve certain permissions?
- How do we audit plugin actions for compliance?

## Scope
**Include**
- Permission manifest schema + validator.
- Policy enforcement: deny plugin load if permissions not granted; allow CLI flags to override (`--allow-plugin ...`).
- Audit/reporting commands (list plugins, permissions, timestamps).
**Exclude**
- Full OS-level sandboxing (namespaces) for now.
- Network isolation per plugin (maybe later via spawned workers).
- Automatic plugin updates.

## Design notes
- Start with capability categories: `command`, `request`, `filesystem`, `env`, `network`.
- Provide config file `.gqlplugins.json` storing approvals per plugin version.
- Log plugin usage events for auditing.

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
- [ ] Plugins declare permissions; CLI refuses to load unless permissions granted via config/flag.
- [ ] Admin commands show plugin status + granted permissions.
- [ ] Violations (plugin attempts unauthorized action) block execution with clear error.
- [ ] Tests cover approval workflow + enforcement.

## Dependencies
- Blocks: enterprise plugin adoption, POLICYCI integration.
- Blocked by: PLUGINAPI, PLUGNREQ/CMD infrastructure, CORECLI config loader, TESTFIX.

## Rollout
- [ ] Behind flag? y
- [ ] Docs updated
- [ ] Changelog entry
