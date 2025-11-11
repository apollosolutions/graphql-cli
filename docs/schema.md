# Schema Inspection (`SCHEMAP`)

`gql schema [print|save]` fetches the current schema via introspection and renders it as SDL or the raw JSON document. It works for both config-driven endpoints and ad-hoc URLs, reusing the same cache + header plumbing as URL/endpoint mode.

## Examples

```bash
# Print SDL for any URL
gql schema print https://api.example.com/graphql

# Save SDL for the default endpoint defined in .gqlrc.yml
gql schema save --endpoint api --out schema.graphql

# Emit raw introspection JSON and refresh the cache
gql schema print --format json --refresh --url https://api.example.com/graphql
```

## Flags

- `--url <url>` — Target an explicit GraphQL endpoint (bypasses configs).
- `--endpoint <name>` — Use a named endpoint from `.gqlrc.*` (defaults to the config’s `defaultEndpoint`).
- `--format sdl|json` — Choose SDL (default) or introspection JSON.
- `--out <file>` — Write output to disk. Required for `schema save`; optional for `schema print` (which still streams SDL/JSON to stdout).
- `--refresh` — Ignore cached introspection results for this run (forces TTL `0`).
- `--cache-ttl <ms>` — Override the introspection TTL used for the call.
- `--header "Key: Value"` — Add/override HTTP headers (merged with config headers when targeting endpoints).

When saving, the CLI creates parent directories as needed and reports the absolute file path. Status messages go to `stderr` when `schema print` is also streaming SDL/JSON so scripts can keep piping the schema while still seeing file writes.

## Implementation notes

- Powered by `loadIntrospectionJSON` in `src/introspection/index.ts`, so cached ETag responses are respected even when only JSON output is requested.
- Tests in `tests/integration/schema-command.test.ts` cover URL usage, config defaults, JSON output, and file writing.
- Global help (`gql --help`) now lists the `schema` command, and completion scripts pick it up automatically because it shares the standard command registry.
