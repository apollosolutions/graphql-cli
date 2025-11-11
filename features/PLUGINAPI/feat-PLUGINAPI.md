# Plugin API (PLUGINAPI)

## Goal
Design and expose an extension API that lets third parties add commands, hooks, and output processors to `gql` without forking, respecting security boundaries.

## User stories
- As a platform team, we can ship an internal plugin that adds `gql audit ...` commands leveraging existing config + auth.
- As an integrator, I can register request/response hooks to log telemetry or enforce policies.

## Assumptions
- Core CLI (CORECLI) is modular enough to load plugins at startup (from `node_modules`, config `plugins`, or file paths).
- Plugins run in-process (Node modules) but may be sandboxed via SECBOX later.
- Plugin manifest declares required permissions/hooks.

## Open issues & risks
- Security: executing arbitrary plugins may exfiltrate tokens; need signed plugin registry or sandboxing.
- Versioning: plugin API must be semver-ed to avoid breakage.
- Loading order conflicts (multiple plugins hooking same command) need resolution rules.

## Clarifying questions
- How do users install/enable plugins? config file vs CLI `gql plugin add` command?
- Do we support remote plugins (download at runtime) or only local modules?
- What is the lifecycle of plugin hooks (init, beforeRequest, afterResponse, addCommand)?

## Scope
**Include**
- Plugin manifest schema + loader (resolve package, read metadata, instantiate hooks).
- Core hook points: command registration, pre/post request, output transformation, config augmentation.
- Error isolation so plugin failures report clearly and optionally disable plugin.
**Exclude**
- Plugin marketplace/registry (maybe future web service).
- Sandboxing isolation (SECBOX handles advanced isolation).
- Auto-updates.

## Design notes
- Provide TypeScript definitions for plugin interface and publish as part of SDK.
- Consider namespacing commands (`pluginName:command`) or allowing plugins to register new top-level commands.
- Maintain plugin compatibility matrix; store plugin metadata in cache for faster load.

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
- [ ] Plugins can register commands and hooks via documented interface.
- [ ] Misbehaving plugins fail gracefully with user-facing errors and optional disable instructions.
- [ ] Documentation + examples provided for building a plugin.
- [ ] Tests cover sample plugin hooking into command + request lifecycle.

## Dependencies
- Blocks: PLUGNREQ, PLUGCMD, SECBOX, ecosystem adoption.
- Blocked by: CORECLI modular architecture, TESTFIX, CISETUP, docs.

## Rollout
- [ ] Behind flag? y (initial beta)
- [ ] Docs updated
- [ ] Changelog entry
