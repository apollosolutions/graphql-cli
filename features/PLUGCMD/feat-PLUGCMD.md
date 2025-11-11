# Plugin Commands (PLUGCMD)

## Goal
Allow plugins to register custom CLI commands/subcommands with their own flags, help text, and execution logic, leveraging the same command registry as built-in features.

## User stories
- As an internal tools team, we ship a plugin that adds `gql audit run <policy>` and reuses CFGDISC/INTROS to inspect schemas.
- As a partner, I can add `gql deploy` command packaged as plugin, showing up in `gql --help` with proper docs.

## Assumptions
- PLUGINAPI provides registration entrypoints and HELPEP/COMPLSH can read plugin-provided metadata.
- Plugins declare conflicts/command names to avoid collisions.
- Commands run in same process; errors go through ERRXIT pipeline.

## Open issues & risks
- Need namespace strategy so plugin command names don't override core commands unless allowed.
- Help/completions must include plugin commands dynamically.
- Plugins may require additional dependencies; ensure they are bundled or lazy-loaded.

## Clarifying questions
- Do we allow plugin commands at top level only or also nested under endpoints?
- Should plugin commands support streaming outputs and reuse OUTJSON/NDJSON pipeline automatically?
- How do we handle version mismatch when plugin expects features not yet shipped?

## Scope
**Include**
- APIs for plugins to register commands (name, description, options, handler).
- Help/completion integration so plugin commands appear with metadata.
- Error isolation and telemetry hooks for plugin commands.
**Exclude**
- Remote command execution (plugins run locally).
- Permission prompts beyond base plugin manifest.
- UI for plugin marketplace.

## Design notes
- Provide typed helper: `context.commands.register({ name, description, options, run })`.
- Enforce naming conventions (kebab-case) and allow namespacing `pluginName:cmd`.
- Document best practices (async handlers, logging, tests) with sample repo.

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
- [ ] Plugins can add commands visible in `gql --help`/completions.
- [ ] Command handlers receive same context objects as core commands.
- [ ] Failures in plugin commands mapped to ERRXIT codes with plugin attribution.
- [ ] Tests cover sample plugin registering command + CLI invocation.

## Dependencies
- Blocks: plugin ecosystem adoption, STUDIOOP integration.
- Blocked by: PLUGINAPI (foundation), HELPEP/COMPLSH (metadata), CORECLI (registry), TESTFIX.

## Rollout
- [ ] Behind flag? y
- [ ] Docs updated
- [ ] Changelog entry
