Spec: gql — A CLI That Turns Any GraphQL Endpoint Into a Command-Line Interface

A single binary that shapeshifts itself around GraphQL schemas, turning them into living command-line surfaces: commands, subcommands, flags, and help screens, all derived automatically from introspection.

⸻

1. Purpose

gql allows users to interact with GraphQL endpoints from the command line with zero boilerplate.

It supports two modes:
	1.	Ad-hoc Mode
Run operations directly against any GraphQL endpoint by URL.
	2.	Project Mode
When a config file is present, gql auto-generates a fully navigable CLI UI.
⸻

2. High-Level Features
	•	Auto-generated subcommands from GraphQL introspection.
	•	No need to specify operation type for configured endpoints.
	•	Rich help system that lists all queries/mutations grouped and described.
	•	Automatic argument flags based on schema.
	•	Aliases, renaming, hiding, description overrides.
	•	Multiple endpoints defined per config.
	•	Headers, auth, caching, streaming, file uploads, pagination helpers.
	•	Table, JSON, NDJSON, raw output modes.
	•	Shell autocompletion with operation and enum value awareness.

⸻

3. UX Overview

3.1 Ad-hoc Mode (no config)

gql https://api.example.com/graphql query getUser --id 123
gql https://api.example.com/graphql mutation updateUser --id 123 --input.name Amanda
gql schema print --url https://api.example.com/graphql

3.2 Configured Endpoint Mode (operation-type–less)

Given .gqlrc.yml:

gql list
gql example --help
gql example users --limit 10            # auto-resolves operation type via schema
gql example updateUser --id 1 --input.name Amanda
gql example inviteUser --help

Users do not specify query/mutation/subscription. The tool infers it.

3.3 Schema Inspection

Use `gql schema <print|save>` to fetch schemas as SDL or introspection JSON with or without configs.

gql schema print --endpoint example --format json
gql schema save --url https://api.example.com/graphql --out schema.graphql

3.4 Operation Listing

`gql ops list` (or `gql <endpoint> ops`) enumerates available queries/mutations/subscriptions with descriptions, alias coverage, and argument metadata.

gql ops list --endpoint example --kind mutation
gql api ops --json --match user

3.5 Apollo Sandbox Explorer

`gql explore [<endpoint|url>]` opens https://studio.apollographql.com/sandbox/explorer with the selected GraphQL endpoint. It respects `.gqlrc.*` defaults, prints the URL when browsers are disabled (`GQL_NO_BROWSER=1`), and provides `--print` for SSH/CI workflows.

⸻

4. Operation Resolution (Configured Endpoints)

When user runs:

gql <endpoint> <operationName> [flags]

The resolver:
	1.	Looks up operationName across Query, Mutation, Subscription.
	2.	If only one match → use it.
	3.	If name appears in multiple root types:
	•	Apply per-endpoint config:
	•	preferKindOnConflict: query|mutation|subscription
	•	promptOnConflict: true|false
When true, interactive select if TTY.
	•	User can override manually with:

--kind query|mutation|subscription


	4.	If no match → suggest closest names.

All behavior is predictable and visible in --help.

⸻

5. Configuration File

5.1 Discovery

Files in priority order:
	•	.gqlrc.yml
	•	.gqlrc.yaml
	•	.gqlrc.json
	•	gql.config.yml|yaml|json

Path discovery ascends parent directories until repo root.

5.2 Config Schema

version: 1
defaultEndpoint: api

endpoints:
  api:
    url: https://api.example.com/graphql

    headers:
      Authorization: "Bearer ${GQ_TOKEN}"
      X-Tenant: "${TENANT_ID:-default}"

    auth:
      strategy: bearer      # none|bearer|apikey|oauth2|custom
      env: GQ_TOKEN

    request:
      timeoutMs: 20000
      retries:
        maxAttempts: 3
        backoff: exponential
        baseMs: 250

    cache:
      introspectionTTL: 3600

    features:
      relayPagination: true
      fileUploads: true
      liveQueries: false

    aliases:
      ls: "users"
      saveUser: "updateUser"

    fragments:
      - ./graphql/fragments/*.graphql
    documents:
      - ./graphql/operations/**/*.graphql

    help:
      groupOrder: [Queries, Mutations, Subscriptions]
      hide:
        - Mutation.deleteUser
      rename:
        users: "listUsers"
      describe:
        users: "List users with paging & filtering"
      preferKindOnConflict: query
      promptOnConflict: false

telemetry:
  enabled: false

output:
  format: table
  pretty: true

cache:
  dir: "~/.gql/cache"

Headers from configs are canonicalized (case-insensitive) and merged with CLI overrides supplied via `-H/--header` flags. CLI syntax accepts either `Name: Value` or `Name=Value`, and an empty value (e.g., `--header Authorization=`) explicitly removes a header inherited from config. Later CLI entries override earlier ones.

⸻

6. Help System (Auto-Generated)

6.1 Global Help

gql --help

Shows top-level commands, endpoints from config, and ad-hoc usage examples.

6.2 Endpoint Help (gql api --help)

Usage: gql example [operation] [flags]

Endpoint: example
URL: https://api.example.com/graphql

Queries:
  listUsers             List users with paging & filtering
  getUser               (schema description)
  me                    (schema description)

Mutations:
  updateUser            (schema description)
  inviteUser            (schema description)

Subscriptions:
  onUserUpdated         (schema description)

Aliases:
  ls -> users
  saveUser -> updateUser

Flags:
  --header "K:V"
  --kind query|mutation|subscription
  --format json|table|ndjson|raw
  --jq 'expr'
  --select 'path'
  ...

Hidden operations do not appear; renamed operations appear under the new name.
Help output automatically applies subtle ANSI colors (headings, command names, hints) when stdout supports it, honoring `NO_COLOR`/`FORCE_COLOR` so transcripts stay readable. The global menu now groups commands into Ad-hoc mode, Endpoints, Internal commands, and a short "Help / How to use" guide for quick discovery.

6.3 Operation Help (gql api updateUser --help)

Usage: gql api updateUser [flags]

GraphQL: Mutation.updateUser
Description:
  Update a user’s fields

Variables:
  --id ID!                         Required
  --input.name String
  --input.email String
  --input.flags [String]
  --input.address.city String

Return:
  User

Enums:
  Role = [ADMIN, EDITOR, VIEWER]

Examples:
  gql api updateUser --id 123 --input.name Amanda
  gql api updateUser --id 123 --input='{"name":"Amanda"}'


⸻

7. Command Grammar

7.1 Configured Endpoint Mode

gql <endpoint> <operationName> [--var value] [flags]
gql <endpoint> --help
gql <endpoint> <operation> --help
gql <endpoint> op list

7.2 Ad-Hoc Mode

gql <url> query|getUser ...   # explicit op type required

7.3 Universal Flags
	•	--header
	•	--timeout-ms
	•	--retries
	•	--format
	•	--jq
	•	--select
	•	--raw
	•	--http2
	•	--ws / --sse
	•	--print-request
	•	--print-response

⸻

8. Argument Mapping

GraphQL type → CLI flag maps:

GraphQL Type	Input Form
Scalar	--id 123, --name "Alice"
Enum	--role ADMIN
Input Object	--input.name Alice or full JSON --input '{"name":"Alice"}'
Lists	--tags a --tags b or JSON array
Upload	--file @./path/to/file.jpg

Deep input objects use dotted flags:

--input.address.city "Berlin"


⸻

9. Selections & Documents

Three ways:
	1.	--fields "id,name,profile{id}"
	2.	--doc ./path/to/operation.graphql
	3.	No fields provided → safe auto-generated scalar leaf selection.

Fragments from config directories loaded automatically.

⸻

10. Output Modes
	•	json (pretty unless piped)
	•	table (auto column inference)
	•	ndjson (stream items, one JSON object per line)
	•	raw
	•	--select (JMESPath) to pluck payload subsets before printing
	•	--jq passthrough using the local jq binary (override via GQL_JQ_BIN)

⸻

11. Subscriptions & Streaming

gql api onUserUpdated --ndjson

Supports WebSocket or SSE. Can batch with --buffer. Can halt with --until 'expr'.

⸻

12. Pagination Helpers

Relay:

gql api usersConnection --paginate relay --path data.usersConnection --limit 500

Offset/limit:

gql api items --paginate offset --offset-var offset --limit-var limit


⸻

13. Introspection & Caching
	•	Introspects once per TTL, cached by URL+header-hash.
	•	Saves to ${cache.dir}/schemas/<sha>.json.
	•	Supports ETag revalidation.
	•	Builds index:

byRoot: { Query, Mutation, Subscription }
byName: { operationName: ['Query'] }



⸻

14. Auth

Strategies:
	•	none
	•	bearer
	•	apikey
	•	oauth2

Supports OS keychain for safe token storage.

⸻

15. Logging & Diagnostics
	•	--log-level: silent|error|warn|info|debug
	•	--trace: timing for DNS/TLS/HTTP
	•	--print-request
	•	--print-response (redacted)
	•	GQ_DEBUG=1 env var for internals

`--print-request` emits a concise block (method, URL, redacted headers, GraphQL body) before each HTTP call so field teams can troubleshoot auth failures or caching behavior without copying sensitive tokens.
⸻

16. Tests
	•	Resolution tests (unique, conflict, hidden, renamed).
	•	Help generation tests.
	•	Argument coercion tests.
	•	Pagination, subscription, introspection parsing.
	•	Plugin hooks integration.
	•	Regression on schema drift.

⸻

17. MVP Checklist
	•	Ad-hoc URL mode.
	•	Config file discovery.
	•	Endpoint-based commands without operation type.
	•	Operation resolution across Query/Mutation.
	•	Auto help generation per endpoint and per operation.
	•	Argument → variable mapping with dotted flags.
	•	Output modes.
	•	Caching for introspection.
	•	Basic auth (bearer/env).

⸻

18. Future Enhancements
	•	TUI explorer (gql explore).
`--print-request` logs the outgoing HTTP method, URL, headers, and GraphQL payload to STDERR before the network call. Sensitive headers (Authorization, API keys, tokens, secrets, cookies) are automatically replaced with `***REDACTED***` so users can safely share the diagnostics output.
