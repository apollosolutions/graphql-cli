# Authored Documents & Fragments (DOCDOC)

## Goal
Support user-authored `.graphql` documents/fragments referenced by config or CLI flags so complex operations can be reused with full GraphQL syntax (variables, fragments, directives).

## User stories
- As a developer, I can store operations under `./graphql/queries/*.graphql` and reference them via `gql api users --doc ./graphql/queries/users.graphql`.
- As a team, we configure document/glob paths in `.gqlrc.yml` so the CLI auto-discovers named docs and exposes them as commands.

## Assumptions
- CFGDISC already loads `documents` and `fragments` paths from config.
- FIELDS/URLMODE still provide auto-selection fallback when no doc specified.
- File globbing respects gitignore-style patterns using fast glob library.

## Open issues & risks
- Need to decide caching strategy for parsed documents/fragments to avoid re-reading disk each run.
- Schema drift may invalidate stored docs; want validation warnings early (OPLIST + tests?).
- Large doc forests may slow startup; consider watchman-style caching later.

## Clarifying questions
- Do we support doc naming (e.g., `documents: [{ name: getUsers, path: ... }]`) for referencing without file path?
- Should CLI auto-generate commands from docs (like `gql api doc getUsers`)? part of Phase 3 OPLIST maybe.
- How do we handle GraphQL imports (#import) if teams rely on them?

## Scope
**Include**
- Document loader that reads `.graphql` files, resolves fragments, and validates operation names vs schema.
- CLI flags/config to reference docs by path or configured nickname.
- Integration with FIELDS/URLMODE: `--doc` bypasses auto-generated document.
**Exclude**
- GraphQL project bundlers/transpilers.
- Editor integration (LS plugins).
- Automatic doc generation from schema (OPLIST handles listing only).

## Design notes
- Use `graphql` package parser to ensure accurate AST; cache parsed results keyed by file mtime.
- Provide helpful errors when doc references unknown fragments or mismatched variables.
- Consider storing doc metadata (operation type/name) for COMPLSH + help output.

## Tasks
- [x] Implementation (`src/documents/*`, `src/project/endpoint-command.ts`, `src/commands/url-mode.ts`, `src/urlmode/index.ts`)
- [x] Docs/Help updates (`docs/endpoints.md`, `docs/urlmode.md`, `docs/tests.md`, `docs/plan.md`, `docs/changelog.md`)
- [x] Tests:
  - [x] Unit (`tests/unit/documents.store.test.ts`)
  - [x] Integration (`tests/integration/cli-basic.test.ts`, `tests/integration/project-mode.test.ts`)
  - [x] Golden fixtures (n/a)
- [x] Telemetry (n/a)
- [x] Feature flag (n/a — enabled by default)

## Acceptance criteria
- [x] `--doc <path|string>` executes using the provided document; `--operation-name` selects a named operation when needed. URL mode + endpoint commands cover fragments/variables via tests.
- [x] Config-defined document directories (`documents`/`fragments`) auto-load relative to the config root and validate operation names up front.
- [x] Fragments discovered from config globs are appended to every document resolution so shared fragment files "just work".
- [x] Document metadata is cached per process and reused by endpoint commands, keeping generation under a second even for many documents.

## Implementation notes (2025-11-11)
- Added `DocumentStore` + `resolveDocumentInput` utilities that parse `.graphql` files, enforce naming rules, dedupe operations, and append fragment bundles. Stores are created per endpoint based on `.gqrc` globs.
- Both URL mode and endpoint commands now honor `--doc`/`--operation-name`, support inline GraphQL strings, and pass through `operationName` when sending the HTTP request.
- Endpoint commands automatically use authored docs when the GraphQL operation name matches the CLI command; otherwise, users can reference docs by name or path. Integration tests assert fragments appear in the emitted query.

## Dependencies
- Blocks: SCHEMAP (doc validation), OPLIST (operation listing), SELECTR (doc awareness).
- Blocked by: CFGDISC (config paths), INTROS (schema for validation), TESTFIX (fixtures), CORECLI (flags).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
