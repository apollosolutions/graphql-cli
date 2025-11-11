# URL Mode

`gql <url> <query|mutation> <operationName>` executes GraphQL operations directly against any endpoint without a config file. For config-driven endpoints (friendly subcommands, aliases, rename/hide metadata), see `docs/endpoints.md`.

Example:

```
gql https://example.com/graphql query user --var.id 1 --fields "name,email"
```

Key behaviors:

- Schemas are fetched via `src/introspection/index.ts` and cached (TTL + ETag) to keep repeated calls fast.
- Variables are provided via `--var.<name>` flags (nested input objects allowed via dot notation) and coerced according to the schema (`src/vars/coerce.ts`).
- Selections default to scalar leaves; override with `--fields` (comma/braces mini-language) or `--doc` to supply an entire document. When `--doc` references a file containing multiple operations, use `--operation-name <name>` to pick the one to execute. The flag also accepts inline GraphQL strings for quick experiments.
- Responses stream through the OUTJSON formatter, so results appear as JSON on stdout. GraphQL errors still print in the payload, but the command exits with code `4`.
- Add `--select <expr>` to pluck a subset of the JSON payload via [JMESPath](https://jmespath.org/) (e.g., `--select data.user.name`). Chain `--jq '<jq expr>'` afterward to run the selected JSON through a local `jq` binary (set `GQL_JQ_BIN` to override the executable path).
- Use `--format table` to render array responses as ASCII tables. This runs after `--select`, so a common pattern is `--select data.users --format table`. Table output cannot be combined with `--jq`.
- Use `--format ndjson` to stream each array element as a standalone JSON line—perfect for piping into Unix tools or storing as logs. Combine with `--select data.<list>` to target the right array. Like table output, ndjson is incompatible with `--jq`.

## Headers & Diagnostics

- `--header`/`-H` accepts either `Key: Value` or `Key=Value` syntax. Repeat the flag to add multiple headers; CLI overrides are case-insensitive and evaluated in order, so later entries win. Passing `--header Authorization=` removes a header inherited from config discovery.
- `--print-request` mirrors the exact HTTP request to STDERR—method, URL, headers, and GraphQL payload—before the network call happens. Secrets such as Authorization/API key/token headers are automatically replaced with `***REDACTED***`, making it safe to share logs when debugging authentication issues.
