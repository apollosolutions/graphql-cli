# Operation Listings (`OPLIST`)

Use `gql ops list` to inspect the operations exposed by either a configured endpoint or an ad-hoc URL. Results are grouped by root type with schema descriptions, alias coverage, and argument metadata so newcomers (or CI pipelines) can audit what the CLI can execute.

## Examples

```bash
# List everything for the default endpoint from .gqlrc.yml
gql ops list

# Filter by endpoint name and show only mutations
gql ops list --endpoint admin --kind mutation

# Hit an arbitrary URL without a config
gql ops list https://api.example.com/graphql

# Stream JSON for automation
gql ops list --json --match user

# Endpoint-local variant (same flags apply)
gql api ops --show-hidden --json
```

## Flags

- `--endpoint <name>` — Choose a named endpoint from `.gqlrc.*` (defaults to `defaultEndpoint`).
- `--url <url>` — Inspect any GraphQL endpoint without a config.
- `--kind query|mutation|subscription` — Filter by root type (subscriptions are included for schemas that expose them, even though execution isn’t wired yet).
- `--match <text>` — Case-insensitive substring match against canonical names, display names, and aliases.
- `--show-hidden` — Include operations suppressed by `help.hide`.
- `--json` — Emit a structured payload:

```jsonc
{
  "target": { "label": "api", "url": "https://...", "endpoint": "api" },
  "operations": [
    {
      "canonicalName": "user",
      "displayName": "getUser",
      "kind": "query",
      "description": "List users with paging",
      "descriptionSource": "config",
      "hidden": false,
      "aliases": ["ls"],
      "args": [
        { "name": "id", "type": "ID!", "required": true }
      ]
    }
  ]
}
```

The endpoint-local form (`gql <endpoint> ops ...`) behaves identically and reuses any already-loaded schema cache, so it’s instantaneous after the first invocation.

## Notes

- Hidden operations stay hidden unless `--show-hidden` is set; this mirrors endpoint help.
- Display names and descriptions respect `help.rename` / `help.describe` overrides, and aliases list the friendly shorthands defined in config.
- For ad-hoc URLs, alias/rename metadata is unavailable, so canonical names are shown as-is and `descriptionSource` is `schema` (or `none` when the schema omits descriptions).
