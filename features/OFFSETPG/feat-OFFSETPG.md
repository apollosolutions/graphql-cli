# Offset/Limit Pagination Helpers (OFFSETPG)

## Goal
Add helpers to iterate through REST-style offset/limit GraphQL patterns by automatically updating variables (`offset`, `limit`, `page`) and aggregating results until desired count reached.

## User stories
- As a user, I can run `gql api items --paginate offset --limit-var limit --offset-var offset --limit 1000` to fetch multiple pages without manual scripting.
- As an analyst, I can stream results via NDJSON while pagination helper keeps calling API until `--limit` satisfied.

## Assumptions
- Target operations accept numeric pagination args; defaults can be read from config or CLI.
- VARMAPR handles per-request variable injection; helper updates offset each loop.
- Works with both ad-hoc URL invocation and endpoint commands.

## Open issues & risks
- Need detection for termination when server returns fewer records than requested.
- Some APIs use page numbers + pageSize; helper must support both patterns.
- Rate limiting/backoff interplay with RETRIES/TIMEOUT.

## Clarifying questions
- Should we support per-page concurrency (parallel fetch)? likely later.
- Do we allow custom stop conditions (e.g., field value) or rely on NO data returned? maybe interplay with UNTLBUF.
- How do we surface progress stats (rows fetched, requests made)?

## Scope
**Include**
- Flags: `--paginate offset`, `--offset-var`, `--limit-var`, `--page-var`, `--page-size`, `--limit`, `--max-pages`.
- Loop controller that updates variables each iteration until termination condition met.
- Output streaming via OUTNDJS/OUTTABL.
**Exclude**
- Cursor-based pagination (RELAYPG handles).
- Multi-tenant parallelization.
- Automatic dedupe/resume data stores.

## Design notes
- Provide both offset+limit and page+pageSize patterns; maybe detect based on provided flags.
- Summaries after run (# requests, final offset) for user feedback.
- Integrate with RETRIES/TIMEOUT for resilience.

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
- [ ] Helper performs repeated requests updating offset/page until limit reached or data exhausted.
- [ ] Supports both offset+limit and page+size patterns via flags.
- [ ] Errors when required vars missing or invalid types.
- [ ] Works with NDJSON/table outputs and respects other streaming flags.

## Dependencies
- Blocks: advanced export workflows, automation scripts.
- Blocked by: VARMAPR, SELECTR/OUTNDJS, CORECLI flags, TESTFIX, RETRIES/TIMEOUT for reliability.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
