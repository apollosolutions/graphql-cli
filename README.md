# gql

`gql` is a GraphQL-first command-line tool that dynamically re-exports your schema as commands. It adapts to any GraphQL schema—auto-generated endpoint subcommands, strongly-typed flags, rich help, and configurable output—so you can interact with operations the same way you run any shell command.

## Key capabilities
- **Dual modes:** Run against any URL (`gql https://⟨url⟩ query|mutation <op>`) or point it at a project config to expose named endpoints (`gql <endpoint> <operation>`).
- **Schema-aware CLI surface:** Introspection drives command, flag, selection, and help generation with deep input coercion, alias/rename/hidden metadata, auto fragments, and default scalar-leaf selections.
- **Document & selection tooling:** Use `--fields`, authored `.graphql` files (`--doc`, `--operation-name`), `--select` (JMESPath), and `--jq` to shape responses, or switch output formats (`json`, `table`, `ndjson`, `raw`).
- **Robust execution helpers:** Built-in introspection caching (TTL + ETag), header merging, bearer/apikey/oauth2 hooks, log/trace flags, and pagination helpers (relay/offset) keep repeated workflows fast and debuggable.
- **Dev-friendly UX:** `gql ops list` enumerates queries/mutations, `gql schema print|save` dumps SDL/JSON, `gql <endpoint> --help` groups operations by root type, and `gql init --yes` bootstraps `.gqlrc.*`.

## Getting started

### Prerequisites
- Node.js 18 or later (see `engines.node` in `package.json`).

### Install & build
```
npm install          # installs dependencies
npm run build        # compiles src/ → dist/
npx gql --help       # run the freshly built CLI
```

### Testing
```
npm run lint            # type-check only via tsc
npm run test            # Vitest suites
npm run test:update     # regenerate golden fixtures (set UPDATE_GOLDENS=1)
npm run test:watch      # keep Vitest running in watch mode
```

## Usage overview

### Ad-hoc URL mode
Use `gql <url> <kind> <operation>` when no config lives in your workspace. You must tell `gql` whether the operation is a query, mutation, or subscription:
```
gql https://api.example.com/graphql query getUser --var.id=1 --fields "id,name"
gql https://api.example.com/graphql mutation updateUser --doc ./graphql/updateUser.graphql --operation-name UpdateUser --var.input.name=Sam
gql https://api.example.com/graphql query me --select 'data.me.email' --jq '.[0]'
```
Flags like `--header`, `--fields`, `--doc`, `--select`, `--jq`, `--cache-ttl`, and `--timeout-ms` behave consistently with configured endpoints.

### Endpoint mode (`.gqlrc.yml`)
Drop a `.gqlrc.*` (YAML or JSON) into your project to expose endpoint commands without specifying operation kinds. Discovery climbs toward the repo root and merges headers/auth/request/cache/features/help metadata.

An endpoint declaration looks like this:
```yaml
version: 1
endpoints:
  example:
    url: https://api.example.com/graphql
    headers:
      Authorization: "Bearer ${API_TOKEN}"
    aliases:
      ls: listUsers
    documents:
      - graphql/operations/**/*.graphql
    fragments:
      - graphql/fragments/**/*.graphql
    help:
      rename:
        listUsers: "List all users"
      hide:
        - Mutation.internalSecret
    request:
      timeoutMs: 20000
```
`gql example --help` now shows grouped Queries/Mutations/Subscriptions, descriptions, aliases, and flag guidance. `gql ops list --endpoint example` mirrors that metadata and can emit JSON or filter by kind/match.

## Apollo GraphOS example

Use the Apollo GraphOS Platform API as a real endpoint by naming it `apollo` in your config:
```yaml
version: 1
endpoints:
  apollo:
    url: https://api.apollographql.com/api/graphql
    headers:
      apollographql-client-name: "test"
      apollographql-client-version: "test"
      Access-Control-Allow-Origin: "*"
    help:
      rename:
        graph: "Graph details"
      describe:
        graphs: "List all registered graphs"
```

With that setup you can:

```
# inspect what the CLI exposes for Apollo GraphOS
gql apollo ops --json --match graph

# view schema SDL for offline reference
gql schema print --endpoint apollo --format sdl > graphos-schema.graphql

# run a GraphOS operation once you know its name
gql apollo graphs --fields "nodes { id name variants { name } }" --select 'data.graphs.nodes[]'
gql apollo graph --var.id=graph-id --fields "id name lastDeployment { version }"
```

Replace `graphs` / `graph` with whichever fields appear in your GraphOS schema; `gql ops list` shows every available name, description, and alias. Commands respect aliases, `help.rename` overrides, environment substitution, and merged headers.

## Development notes
- `gql init --yes` scaffolds a `.gqlrc.yml`, sample docs, and `.env.example`.
- Document changes live under `docs/*.md` (e.g., `docs/config.md`, `docs/endpoints.md`, `docs/urlmode.md`, `docs/ops.md`, `docs/plan.md`) and subfeature files in `features/`.
- The CLI entrypoint is `src/index.ts`; runtime routing flows through `src/cli.ts` → `src/command-registry.ts`.
- Configuration validation and env substitution happen in `src/config/loader.ts`; introspection caching lives in `src/introspection/`.
- Document discovery and selection building are handled in `src/documents/` and `src/fields/`, while execution flows through `src/urlmode/` and `src/project/endpoint-command.ts`.

## Further reading
- `docs/plan.md` — roadmap and phased feature plan.
- `docs/config.md` — config discovery, schema, and substitution rules.
- `docs/endpoints.md`, `docs/urlmode.md`, and `docs/ops.md` — usage patterns for each mode.
- `docs/fields.md`, `docs/variables.md`, `docs/select.md` — how selection/variables/output shaping works.
- `spec/spec.md` — frozen product spec and UX commitments.

## Contribution
Ensure new features extend existing abstractions, keep `config/loader.ts` in sync when adding fields, and update documentation (`docs/*.md`, `spec/spec.md`, `docs/plan.md`, feature trackers) plus tests/goldens as needed.
