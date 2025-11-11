# Schema Cache Management (CACHSCM)

## Goal
Provide commands to inspect, invalidate, and clean schema cache entries (created by INTROS) so users can manage disk usage and refresh stale schemas.

## User stories
- As a developer, I can run `gql cache schemas list` to see which endpoints are cached, their TTL, and last fetched time.
- As support, I can instruct users to run `gql cache schemas clear --url https://api...` when schema drift causes issues.

## Assumptions
- INTROS stores cache files with metadata (url, headers hash, etag, timestamp).
- Cache directory path known (ENV or config) and accessible.
- CLI commands can delete files safely and respect OS permissions.

## Open issues & risks
- Need to avoid deleting caches currently in use by running commands; lock files? maybe skip due to short operations.
- Handling large caches gracefully (pagination or filtering output).
- Need to ensure removal of directories doesn't break concurrent reads.

## Clarifying questions
- Should we support `gql cache schemas prune --older-than 7d`? likely yes.
- Do we track hit/miss metrics and expose them?
- Should cache commands cover response cache too (CACHRES) or separate commands?

## Scope
**Include**
- CLI subcommands: `cache schemas list`, `cache schemas clear`, `cache schemas prune`.
- Metadata reporting (url, size, lastUsed, ttl, etag) from cache files.
- Hooks for INTROS to update metadata (last used timestamp) for accurate reporting.
**Exclude**
- Binary compression of cache entries (handled by INTROS implementation).
- Response cache mgmt (CACHRES handles).
- UI/TUI for cache inspection.

## Design notes
- Store metadata (JSON) alongside schema file for quick listing.
- Use table/JSON output via OUTTABL/OUTJSON for listing.
- Provide safety prompts before clearing all caches unless `--yes`.

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
- [ ] Users can list schema cache entries with relevant metadata.
- [ ] `clear` removes targeted entries and confirms action; tests verify file removal.
- [ ] `prune` removes entries older than TTL or user-specified threshold.
- [ ] Commands respect --json/--table output options.

## Dependencies
- Blocks: ops tooling, diagnostics.
- Blocked by: INTROS (cache format), OUTTABL/OUTJSON, CORECLI (command router), TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
