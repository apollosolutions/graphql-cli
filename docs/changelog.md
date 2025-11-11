# Changelog

## 2025-11-10

- CFGDISC: introduces `src/config/loader.ts`, `docs/config.md`, and supporting tests to auto-discover `.gqlrc.*`/`gql.config.*` files, resolve env placeholders, and expose typed endpoint metadata via `loadConfig()` / `resolveEndpoint()`. This unblocks Phase 2 commands that depend on project-aware configs.

## 2025-11-11

- HELPEP/DISAMBI/ALIASES/RENHIDE: endpoint commands (`gql <endpoint> ...`) now auto-register from configs, list operations with rename/hide/alias metadata, support `--show-hidden`, and resolve operations without needing query/mutation prefixes (configurable preference + `--kind` override). See `src/project/endpoint-command.ts`, `docs/endpoints.md`, and `tests/integration/project-mode.test.ts` for coverage.
- DOCDOC: `--doc` now loads `.graphql` files (or inline docs) with optional `--operation-name`, config-defined `documents`/`fragments` globs are parsed and auto-applied when names match CLI commands, and fragments are appended automatically. See `src/documents/*`, `docs/endpoints.md`, the new `tests/unit/documents.store.test.ts`, and the expanded project-mode tests for examples.
- COMPLSH: `gql completions <shell>` now emits real bash/zsh/fish scripts populated with endpoint + operation suggestions (respecting rename/hide/alias metadata). Documentation lives in `docs/completions.md`, and `tests/integration/completions.test.ts` ensures snippets capture dynamic data.

## 2025-11-12

- SCHEMAP: adds `gql schema [print|save]` (see `src/commands/schema.ts`) so users can print SDL or introspection JSON for either explicit URLs or configured endpoints, with `--out`, `--format`, `--header`, and `--refresh` support. Documentation now lives in `docs/schema.md`, the plan/spec/features files are updated, the CLI help golden gained the new command, and integration coverage exists in `tests/integration/schema-command.test.ts`. Introspection helpers expose `loadIntrospectionJSON` so commands can reuse cached results without rebuilding schemas twice.
- OPLIST: introduces `gql ops list` plus the endpoint-local `gql <endpoint> ops` shortcut to enumerate schema operations with alias/rename metadata, argument signatures, and JSON output for automation. See `src/commands/ops.ts`, `src/ops/list.ts`, and `docs/ops.md`; coverage lives in `tests/integration/ops-command.test.ts`.
- SELECTR: `--select` (JMESPath) and `--jq` flags now shape responses before printing. The shared output layer (`writeGraphQLResponse`) powers URL mode, endpoint mode, and `render-json`, and the new `docs/select.md` explains usage plus the `GQL_JQ_BIN` override. Selection/jq behavior is tested via `tests/integration/render-json.test.ts`.
- OUTTABL: pass `--format table` (optionally after `--select`) to render array responses as ASCII tables. This works across URL mode, endpoint commands, and `render-json`; table output is documented in `docs/urlmode.md`, `docs/endpoints.md`, and the SELECTR guide, with coverage in `tests/integration/render-json.test.ts` and `tests/integration/cli-basic.test.ts`.
- OUTNDJS: `--format ndjson` emits one JSON document per line (after any `--select`), making it trivial to pipe GraphQL results into Unix tooling. Docs across URL/endpoint/select guides describe usage, and tests in `tests/integration/render-json.test.ts` plus `tests/integration/cli-basic.test.ts` lock in behavior.
- HELP-COLOR: help output (global, per-command, endpoint) now uses subtle ANSI colors to highlight headings, command names, and tips. Colors auto-disable when stdout isn’t a TTY or `NO_COLOR=1` (use `FORCE_COLOR` to override).
- HELP-SECTIONS: the global `gql --help` menu now groups information into "Ad-hoc mode", "Endpoints", "Internal commands", and a dedicated "Help / How to use the CLI" section so users can locate relevant commands faster. A placeholder message appears when no endpoints are registered.

## 2025-11-13

- HDRMGMT: centralized header utilities (`src/http/headers.ts`) now canonicalize config headers, merge CLI overrides (`-H/--header` accepts both `Key: Value` and `Key=Value`), support removals via `--header Authorization=`, and expose a redacted mirror for diagnostics. URL mode, endpoint commands, and config discovery all share the builder so behavior stays consistent, `gql init` validates the richer syntax, and config defaults honor case-insensitive lookups. A new `--print-request` flag mirrors each HTTP request (method, URL, redacted headers, GraphQL body) to STDERR, masking secrets automatically so support teams can troubleshoot without leaking tokens. Tests cover header parsing/merging plus the diagnostics output, and the docs/spec/plan/feature tracker were updated accordingly.
