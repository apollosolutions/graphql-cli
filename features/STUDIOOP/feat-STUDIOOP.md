# Apollo Studio Operation Import (STUDIOOP)

> Status: Initial "explore" command shipped (2025-11-12) to open Apollo Sandbox for any endpoint. Remaining Studio pull/sync work stays in scope for future milestones.

## Goal
Integrate with Apollo Studio (or similar registries) to pull operation documents, schemas, and metrics directly into `gql`, enabling commands like `gql studio pull` and operation playback.

## User stories
- As a developer using Apollo Studio, I can run `gql studio pull mygraph` to download registered operations + schema into my local project.
- As a reviewer, I can inspect operation metrics or variants via CLI commands (read-only) to debug performance.

## Assumptions
- Apollo Studio API accessible with API keys; HDRMGMT/AUTH features handle headers.
- DOCDOC/SCHEMAP/OPLIST can ingest downloaded docs + schemas.
- Feature may start with read-only operations (pull) before push/metrics updates.

## Open issues & risks
- Need to handle authentication securely (API keys) and respect rate limits.
- Graph registry APIs may change; need versioned client.
- Some users may not use Apollo Studio; feature should be optional.

## Clarifying questions
- Which Studio endpoints to support first? (graphs.list, graphs.fetchSchema, graphs.operations?)
- Do we allow pushing new operations or only pulling? (initial focus on pull.)
- Should we integrate with operation safelists automatically?

## Scope
**Include**
- `gql studio pull` command: downloads schema (SDL/JSON) + registered operations into configured dirs.
- Config section for Studio (graph ref, variant, API key env var).
- Optional `gql studio ops list` to view registry operations with stats.
**Exclude**
- Mutating registry (publish check) initially.
- Non-Apollo registries (maybe future plugin?).
- UI for conflict resolution (manual editing for now).

## Design notes
- Reuse OUTTABL/OUTJSON for listing operations + metrics.
- Cache Studio downloads similar to INTROS caches but stored separately.
- Provide tests using mocked Studio API responses.

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
- [ ] `gql studio pull` fetches schema + operations into configured directories, respecting auth + caching.
- [ ] CLI surfaces clear errors when API key missing or graph not found.
- [ ] Operation listing command shows metrics (if available) and supports JSON/table output.
- [ ] Tests cover API interactions via mocked responses.

## Dependencies
- Blocks: docs workflows (auto sync), policy enforcement (POLICYCI), analytics.
- Blocked by: HDRMGMT/AUTH (API key), DOCDOC/SCHEMAP (storage), CORECLI command additions, TESTFIX.

## Rollout
- [ ] Behind flag? y (opt-in)
- [ ] Docs updated
- [ ] Changelog entry
