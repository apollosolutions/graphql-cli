# Advanced Completions v2 (COMPLX2)

## Goal
Extend shell completions to include argument flags, enum values, input object keys, documents, and context-aware suggestions (based on schema + config), building atop COMPLSH.

## User stories
- As a user, typing `gql api users --` suggests relevant flags (`--limit`, `--fields`, custom arguments) with descriptions.
- When entering enum arguments, hitting TAB offers valid enum values sourced from schema.

## Assumptions
- COMPLSH already outputs base scripts; COMPLX2 enriches data sources & generator.
- INTROS + VARMAPR provide metadata for arguments, enums, default values.
- Shells support dynamic completion functions (zsh compsys, bash programmable completion, fish functions).

## Open issues & risks
- Large schemas may produce huge completion data; need caching/per-shell script splitting.
- Need to ensure completions remain fast (maybe precompute JSON data file read by script).
- Windows PowerShell support may require separate implementation.

## Clarifying questions
- Do we support context-specific suggestions after `--doc` (file globs) or `--header` (key names)?
- Should completions trigger network calls (to refresh schema) or rely on cache only? (likely cache.)
- How do we version completion data to avoid stale suggestions after schema change? (maybe mtime check.)

## Scope
**Include**
- Enhanced completion data generator exporting arguments/enums per operation.
- Shell script updates to consume JSON data (maybe `gql completions --generate-data`).
- Optional PowerShell support if feasible.
**Exclude**
- Full fuzzy search/interactive completion UI.
- Autocompleting arbitrary GraphQL doc syntax.

## Design notes
- Store completion metadata in cache directory (shared with INTROS) keyed by endpoint + schema hash.
- Provide CLI command `gql completions refresh` to rebuild data manually.
- Document any environment variables required to point to completion data file.

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
- [ ] Shell completions suggest operation-specific flags and enum values contextually.
- [ ] Data refresh occurs automatically when schema cache changes or via manual command.
- [ ] Completions remain performant (<150ms) for typical schemas.
- [ ] Documentation updated with installation + refresh instructions.

## Dependencies
- Blocks: DX quality-of-life, STUDIOOP integration.
- Blocked by: COMPLSH baseline, INTROS metadata, VARMAPR, CORECLI command, TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
