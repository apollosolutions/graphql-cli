# Ad-hoc URL Mode (URLMODE)

## Goal
Let users invoke any GraphQL endpoint directly via `gql <url> <operationType> <operationName> [flags]`, handling schema introspection/cache, flag→variable coercion, document generation, execution, and JSON output.

## User stories
- As a developer testing APIs, I can run `gql https://api.example.com/graphql query getUser --id 123` without setting up config files and immediately inspect results.
- As an SRE debugging prod, I can supply `--fields` or `--doc` plus custom headers/env vars to inspect responses on demand.

## Assumptions
- INTROS feature delivers schema caching (TTL + ETag) the handler can reuse.
- VARMAPR converts CLI flags into variables for scalar/enum/list/input types; URLMODE focuses on wiring, not coercion logic.
- OUTJSON + ERRXIT features provide the output formatting and exit code mapper; URLMODE calls into them.

## Open issues & risks
- Need clear policy when users omit `--fields`; default scalar-leaf selection must avoid huge selection sets (ties into **FIELDS** feature).
- Handling non-2xx HTTP responses must map to specific exit codes (**ERRXIT**) and include useful error messages.
- Schema changes could invalidate cached introspection; need to surface `--no-cache` or ETag revalidation path.

## Clarifying questions
- Should URLMODE support subscription operations in MVP or defer to streaming work (Phase 5)?
- Do we expose `--headers` inline JSON, `-H key:value`, or rely on config env vars only?
- How should the CLI prompt for missing required variables? fail fast vs interactive?

## Scope
**Include**
- Argument parser branch that recognizes `<url> <kind> <operationName>` invocation when the first arg looks like a URL.
- Schema retrieval using INTROS cache + HTTP client, with fallback to live introspection if cache miss/stale.
- Document construction: use provided `--fields` or `--doc`; fallback to default builder from FIELDS feature.
- HTTP execution via fetch-like client supporting headers, timeouts, and capturing raw request/response for diagnostics toggles.
- JSON output path calling OUTJSON and exit code mapping via ERRXIT.
**Exclude**
- Config-driven endpoints (Phase 2 CFGDISC/HELPEP).
- Advanced pagination helpers, streaming/subscriptions, or file uploads (Phase 4–5).
- Telemetry, analytics, or persistent history (later phases).

## Design notes
- Follow plan pseudocode in `docs/plan.md` for `urlModeHandler`: parse args, fetch schema, find root op, coerce vars, build document, execute, print JSON, map exit codes.
- Introduce helper `findRootOp(schema, kind, opName)` leveraging INTROS indexes; ensure validation errors bubble with actionable messages.
- Support `--fields "id,name"` and nested selections plus safe defaults when omitted; rely on FIELDS feature for actual builder implementation.
- Allow repeated `--var.key value` or JSON blobs to pass variables; delegate to VARMAPR but ensure CLI wire-up exists.

## Tasks
- [x] Implementation
- [x] Docs/Help updates
- [x] Tests:
  - [x] Unit
  - [x] Integration
  - [ ] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Implementation notes (2025-11-09)
- Added `runUrlMode` (`src/urlmode/index.ts`), which stitches INTROS, VARMAPR, FIELDS, OUTJSON, and ERRXIT together: fetch schema (cached), validate operation/arguments, coerce variables, build docs (`--fields`, default selection, or `--doc` override), execute via fetch, and return GraphQL results.
- Replaced the placeholder CLI command with a real implementation (`src/commands/url-mode.ts`). It supports headers (`--header "Key: Value"`), variable flags (`--var.id 123`, dotted for nested), `--fields`, `--doc`, and `--cache-ttl`. Output is rendered through OUTJSON; GraphQL errors now trigger exit code 4 after the JSON payload is printed.
- Introduced `docs/urlmode.md` describing end-user usage and wiring.
- Tests cover: helper behavior (`tests/integration/urlmode.test.ts`), CLI end-to-end execution against a mock GraphQL HTTP server (`tests/integration/cli-basic.test.ts`), variable validation failures, and network error handling.
- Golden outputs remain unchanged except for the removed placeholder file; JSON responses are asserted inline instead of via snapshot.

## Acceptance criteria
- [x] `gql <url> query <name>` executes against a mock GraphQL server using cached schema and returns JSON output with correct exit codes.
- [x] Missing required variables produce clear errors and non-zero exit via ERRXIT mapping.
- [x] `--fields` and `--doc` override the default selection with validation for invalid fields.
- [x] Tests cover success + error flows, including schema cache hit/miss and HTTP error mapping.

## Dependencies
- Blocks: INTROS, VARMAPR, FIELDS, OUTJSON, ERRXIT rely on it for end-to-end CLI path.
- Blocked by: CORECLI (command registry), TESTFIX (harness), CISETUP (pipeline), INTROS/VARMAPR/FIELDS delivering their pieces.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
