## Agents Guide for `gql`

Purpose: Help AI agents and automation quickly contribute to the GraphQL CLI that turns schemas + config into endpoint-specific terminal commands.

### Architecture Map
- Entry: `src/index.ts` -> `runCliFromProcess` in `src/cli.ts`.
- Commands: Global commands registered first in `createRegistry()`; endpoint-specific command generated per configured endpoint in `project/endpoint-command.ts`.
- Execution path: argv -> `command-registry.ts` (parse + resolve) -> handler -> errors mapped via `errors/exit.ts`.
- Endpoint pipeline: config (`config/loader.ts`) -> schema introspection cache (`introspection/`) -> operation index -> document resolution (`documents/`) -> execution via URL mode (`urlmode/`) -> output formatting (`output/json.ts`).
 - Before feature work: read `spec/spec.md` (product spec) and `docs/plan.md` (roadmap/plan) to align with intended behavior and avoid deprecated paths.

### Day-1 Dev Tasks
- Build: `npm run build` (TypeScript -> `dist/`).
- Tests: `npm test` (Vitest). Update goldens with `npm run test:update` (uses `UPDATE_GOLDENS=1`).
- Watch tests: `npm run test:watch`.
- Try locally: after build, run `./dist/index.js` or installed bin `gql`.
- Scaffolding: `gql init --yes` writes `.gqlrc.yml`, sample docs, and optional `.env.example`.
 - Keep docs in sync: when changing behavior, update `docs/*.md`, `spec/spec.md`, `docs/plan.md`, and any affected `features/feat-*.md`.

### Where To Change What
- Config parsing/validation: `src/config/loader.ts`. Any new config fields must include parse + type checks; errors use `ConfigValidationError`.
- Endpoint command behavior: `src/project/endpoint-command.ts` (aliases, help rendering, variable/header merging, selection building, error surfacing).
- Document discovery/parsing: `src/documents/` (`store.ts`, `resolve.ts`). Enforces fragments-only in `fragments` and unique, named operations.
- Field selection mini-language: `src/fields/` (`parser.ts`, `builder.ts`). Default depth limit 3, includes `__typename` unless disabled.
- URL-mode execution (when no `--doc`): `src/urlmode/index.ts` builds minimal docs, coerces variables.
- Variable coercion from flags: `src/vars/coerce.ts` (dotted flags -> nested objects, list splitting rules).
- Output formatting: `src/output/json.ts` (pretty by TTY or `GQL_PRETTY=1`).
- Introspection cache: `src/introspection/index.ts` (TTL seconds in config -> ms at runtime, ETag revalidation).

### Conventions & Constraints
- Command contract: `CommandDefinition` requires `name`, `summary`, `handler`; optional `renderHelp`, `usage`, `examples`, `aliases`, `matcher`.
- Flags parsing: `yargs-parser` with `'dot-notation': true`; variables via `--var.<name>=value` or grouped `--var key=value`.
- Headers: runtime `--header "Name: Value"`. Init command accepts `Key: Value` or `Key=Value` and writes to config.
- Subscriptions are intentionally disabled. Extending support must go through `normalizeOperationKind` and endpoint checks.
- Errors: Throw `InvalidArgsError` for flags/usage; `NetworkError` for fetch; `GraphQLExecutionError` when response has errors; `SchemaError` for schema issues; reserve `InternalError` for unexpected states.

### Testing & Debugging Tips
- Build failures: run `npm run lint` (compile-only via `tsc --noEmit`).
- Show stacks: set `GQL_DEBUG=1` to include stack traces in error output.
- Goldens live under `tests/golden/`; update intentionally with `npm run test:update`.

### Gotchas
- Multiple operations in one document require `--operation-name`; otherwise error by design.
- Aliases cannot chain (validated in config); use `--no-aliases` to debug canonical names.
- Selection defaults: object returns require subfields; scalar-only types error without `--fields`.
- List coercion splits comma-separated values only for scalar lists unless overridden.

### Example Workflows
- Generate config + docs: `gql init --yes`
- Run a field with custom selection: `gql api node --fields "id,__typename" --var.id=123`
- Run from a full doc: `gql api node --doc graphql/operations/SampleQuery.graphql --operation-name SampleQuery --var.id=123`

### PR Checklist (Agents)
- Extend the existing abstraction (don’t duplicate) and keep footprint lean.
- Update `config/loader.ts` types + validation when adding config fields.
- Maintain error taxonomy; ensure handlers let registry mapping format output.
- Add/adjust tests and update goldens when output changes are intended.
 - Documentation hygiene: reflect changes in `spec/spec.md`, `docs/plan.md`, and relevant `features/feat-*.md`; include brief change notes in the PR description.