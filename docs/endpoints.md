# Endpoint Mode

When a `.gqlrc.yml|yaml|json` (or `gql.config.*`) file exists, every configured endpoint becomes a first-class CLI command. For example, with:

```yaml
version: 1
endpoints:
  api:
    url: https://api.example.com/graphql
    aliases:
      ls: users
    help:
      rename:
        user: getUser
      hide:
        - Query.internalTools
      preferKindOnConflict: mutation
```

you can run:

```
gql api users --fields "edges { node { id name } }"
gql api ls --var.limit 25
gql api user --var.id 123
```

## Operation resolution (DISAMBI)

- Omit `query|mutation|subscription`; gql inspects the schema and finds the root automatically.
- If multiple roots share the same field, `help.preferKindOnConflict` selects the default root (`query` when unspecified). Override per-call with `--kind query|mutation|subscription`.
- The CLI suggests nearby operation names when none match, using Levenshtein distance.
- Subscriptions are not yet supported in endpoint mode (URL mode with explicit `subscription` remains upcoming work).

## Aliases & rename (ALIASES, RENHIDE)

- `aliases` map short names (`ls`) to canonical operations (`users`). Aliases work everywhere—including execution and help output—and appear in the help footer.
- `help.rename` lets you rename operations for display. Users can invoke either the canonical field (`user`) or the renamed label (`getUser`); both resolve to the same GraphQL field.
- `help.hide` removes operations from endpoint help. Use `--show-hidden` with `gql <endpoint> --help` to reveal them during maintenance.
- `help.describe` overrides schema descriptions when you need richer summaries.

## Authored documents & fragments (DOCDOC)

- Use the `documents` and `fragments` arrays in `.gqrc.*` to point at your `.graphql` sources. Example:

  ```yaml
  endpoints:
    api:
      documents:
        - graphql/documents/**/*.graphql
      fragments:
        - graphql/fragments/**/*.graphql
  ```

- Each named operation within those files becomes addressable via `--doc <OperationName>`. When an operation shares the same name as the CLI command (e.g., `query user { ... }`), it is used automatically—no need for `--fields` or inline documents.
- Fragments discovered via the `fragments` globs are appended automatically so `...UserFields` just works.
- `--doc <path>` still accepts explicit file paths (relative to the current working directory or the config directory), and `--operation-name <name>` disambiguates when a file defines multiple operations.

## Help output (HELPEP)

- `gql api --help` renders grouped listings (Queries/Mutations/Subscriptions) with aligned columns and config-driven descriptions. Hidden operations stay hidden unless `--show-hidden` is passed.
- `gql api user --help` (or `gql help api user`) prints an operation detail card: GraphQL path, argument table, and common flags (`--var`, `--fields`, `--doc`, `--kind`, `--header`).
- Global help (`gql --help`) now includes endpoint commands automatically when configs are valid.
- `gql <endpoint> ops [--json|--kind|--match]` reuses the same schema metadata to list operations directly from the endpoint command without dropping into the global `ops` entry point. Flags match `gql ops list` so you can filter/stream JSON from either form.

## Flags & headers

Endpoint commands share the same flags as URL mode:

- `--var.<name>` or `--var.name=value` to set variables (including dotted input objects).
- `--fields "a,b"` or `--doc/--document` to control selections. Documents can be referenced by path, inline text, or by the operation names discovered from `documents` globs.
- `--operation-name <name>` selects an operation within the provided document (required only when the document defines multiple operations).
- `--header`/`-H` accepts `Key: Value` or `Key=Value` syntax. Repeat it to add multiple headers, and pass `--header Authorization=` (empty value) to strip a header inherited from `.gqlrc.*`. Config headers are merged first, CLI overrides are case-insensitive, and later entries win when duplicates appear.
- `--cache-ttl <ms>` to override introspection cache TTL for the current invocation.
- `--no-aliases` disables alias translation for a single run—handy when debugging conflicts or targeting canonical field names explicitly.
- `--select <expr>` filters the JSON response using JMESPath (e.g., `data.user.email`), and `--jq '<expr>'` pipes the (optionally-selected) payload through a local `jq` binary for advanced shaping. Set `GQL_JQ_BIN` to point at a custom jq executable if it is not on your PATH.
- `--format json|table|ndjson` chooses the final renderer. `table` mode expects the selected payload to be an array (tip: combine with `--select data.<list>`), while `ndjson` streams each array element on its own line; both table and ndjson modes cannot be paired with `--jq`.
- `--print-request` emits a diagnostic block on STDERR showing the HTTP method, URL, redacted headers, and GraphQL payload that gql is about to send. Sensitive headers (Authorization, API keys, tokens, secrets) are replaced with `***REDACTED***` so you can share the log safely when debugging.

Headers from the config apply to both schema introspection and execution; CLI headers apply per invocation.

## Limitations

- Subscriptions and streaming transports are still TODO (Phase 5).
- Endpoint documents currently match by operation name; ensure your authored operations are named consistently with CLI commands to benefit from automatic doc loading.
- Invalid configs block endpoint registration except when running `gql init`. Fix the config (error surface on command invocation) to restore endpoint commands.
