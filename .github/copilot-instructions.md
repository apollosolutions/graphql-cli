## gql Project AI Coding Guidance

Purpose: Enable AI agents to quickly contribute to the GraphQL CLI that turns schemas + config into endpoint-specific terminal commands.

### Core Architecture & Required References
- Entry point: `src/index.ts` -> `runCliFromProcess` in `src/cli.ts`.
- Dynamic command set: Static commands (help, completions, init, render-json, url-mode) registered first; endpoint commands generated at runtime from loaded config & introspected schema (`project/endpoint-command.ts`).
- Command execution funnel: `CommandRegistry.run()` parses argv (via `yargs-parser`), resolves a command (direct name, alias, or matcher), invokes handler with `CommandContext` and standardized error mapping.
- Endpoint command pipeline: config -> introspection cache (`introspection/`) -> operation index -> document resolution (optional) -> URL-mode executor (`urlmode/`) -> response formatting (`output/json.ts`).
- Config discovery walks upward from CWD; supports `.gqlrc.{yml,yaml,json}` & `gql.config.{yml,yaml,json}`. Environment variable placeholders `${VAR}` / `${VAR:-default}` resolved early.
- BEFORE feature work: read `spec/spec.md` (overall product spec) and `docs/plan.md` (current roadmap/plan) to align with intended behaviors and avoid duplicating deprecated paths.
- ALWAYS update related markdown docs when code changes: global docs in `docs/`, spec in `spec/spec.md`, plan in `docs/plan.md`, and any impacted `features/feat-*.md` files.

### Key Domains & Responsibilities
- `config/loader.ts`: Strict validation; any malformed values produce `ConfigValidationError` (mapped to exit code 2). Agents adding config fields MUST extend validation logic here (parse + type checks) and update interfaces.
- `project/endpoint-command.ts`: Central for translating schema fields into CLI operations, alias resolution, help rendering, selection set building, header + variable merging, and error surfacing.
- `documents/`: Glob + parse user GraphQL docs/fragments. Ensures uniqueness and named operations; fragments-only constraint enforced.
- `fields/`: Lightweight field selection mini-language (`a,b { nested { leaf } }`) -> parsed tokens -> validated selection tree -> rendered GraphQL selection set.
- `urlmode/`: Builds minimal operation documents when no explicit `--doc` given. Coerces variables against schema types before network request.
- `vars/coerce.ts`: Detailed coercion & validation of CLI flag values to schema input types (list splitting, nested input objects via dotted flags). Any enhancement to variable handling belongs here.
- `errors/exit.ts`: Central error taxonomy + mapping (set `GQL_DEBUG=1` to expose stack). Use existing subclasses instead of generic errors.
- `introspection/`: Caches schema by hash of URL + headers; supports TTL + ETag revalidation.

### Conventions & Patterns
- Command definition contract: `CommandDefinition` requires `name`, `summary`, `handler`; optionally `renderHelp`, `usage`, `examples`, `aliases`, `matcher`. Add new commands by `registry.register(buildXCommand())` in `createRegistry()` before endpoint registration if they’re global.
- Endpoint help customization via config `help.rename`, `help.describe`, `help.hide`, `help.groupOrder`, `help.preferKindOnConflict`. Maintain these transformation lookups inside `endpoint-command.ts`.
- Flags parsing rules: Dot-notation captured as nested objects (yargs-parser config `'dot-notation': true`). For variables, stick to `--var.<name>=value` or grouped object flags (`--var foo=1 --var bar=2`).
- Headers: Two syntaxes depending on path (`init.ts` allows `Key: Value` or `Key=Value`; runtime operations expect `--header "Name: Value"`). Keep parsing consistent with existing helpers.
- Selection building depth limit default is 3; include `__typename` unless explicitly disabled.
- Avoid introducing subscription behavior—currently guarded; any future support should extend `normalizeOperationKind` & endpoint command checks.

### Testing & Workflows
- Build: `npm run build` (TypeScript -> `dist/`). Strict TS settings; lint script is compile-only (`tsc --noEmit`).
- Tests: `npm test` (Vitest). Golden outputs under `tests/golden/`; update expectation with `npm run test:update` setting `UPDATE_GOLDENS=1`.
- Watch: `npm run test:watch` for iterative development.
- Run locally: after build, invoke `./dist/index.js` or installed bin `gql` with sample commands.
- Config scaffolding: Use `gql init --yes` for non-interactive defaults. Generated `.gqlrc.yml` includes sample docs/fragments; rely on those patterns for new scaffolds.

### Error Handling Strategy
- Throw `InvalidArgsError` for user input & flag issues; `NetworkError` for fetch failures; `GraphQLExecutionError` when response includes errors; `SchemaError` for introspection/schema anomalies; `InternalError` only for unexpected states.
- Never swallow errors silently—handlers rely on registry’s catch block to format output.

### Extending Functionality (Examples & Doc Sync)
- New global flag affecting output formatting: Extend `output/json.ts` to read `process.env` or a parsed flag; then thread through `runCli` IO options.
- Adding retry/backoff strategy: Implement logic in `http/client.ts`, source config from `endpoint.request.retries.*` (already parsed), ensure errors bubble via `NetworkError`.
- Additional document discovery mode: Extend `DocumentStore.init()` or add a new resolver in `documents/resolve.ts` ensuring uniqueness + naming constraints remain enforced.
- When extending any area, append or revise the corresponding `features/feat-*.md` file (create one if missing) and, if scope-wide, update `spec/spec.md` & `docs/plan.md` to reflect new assumptions or milestones.

### Gotchas / Edge Cases
- Multiple operations in a single document require `--operation-name`; auto-selection logic errors intentionally when ambiguous.
- Aliases cannot chain (validated). When debugging canonical names use `--no-aliases`.
- Introspection cache TTL units: config uses seconds; converted to ms in runtime.
- Variable lists: Comma-splitting only performed for scalar lists unless `splitLists` overridden; ensure consistent handling if adding composite parsing.
- Pretty JSON default toggles by TTY + `GQL_PRETTY` env; avoid forcing formatting unconditionally.

### Agent Guidance & Documentation Hygiene
- Before modifying cross-cutting behavior (parsing, output, error codes), locate existing abstraction and extend rather than duplicating.
- Uphold strict config validation; any new fields require reciprocal parse + interface + error messaging.
- Keep changes minimal; do not add runtime dependencies unless essential (current footprint intentionally lean).
- Treat markdown files as first-class: every merged behavioral change should have a doc reflection (spec revision, plan progress note, or feature file update). Missing doc updates are considered incomplete work.

### Quick Start Example
1. Run `gql init --yes` to scaffold config & docs.
2. Execute an operation: `gql api node --fields "id,__typename" --var.id=123`.
3. Supply a full doc: `gql api node --doc graphql/operations/SampleQuery.graphql --operation-name SampleQuery --var.id=123`.

---
Feedback: Clarify unclear sections or request deeper coverage (e.g., tests layout, plugin architecture) and this file can be iterated.