# Explorer Shortcut (`explore`)

`gql explore [<endpoint|url>]` opens the Apollo Sandbox Explorer pointed at any GraphQL endpoint. It works with both ad-hoc URLs and endpoints defined in `.gqlrc.*`.

## Examples

```bash
# Open sandbox for an arbitrary URL
gql explore https://api.example.com/graphql

# Use the default endpoint from .gqlrc.yml
gql explore

# Target a named endpoint
gql explore --endpoint admin
```

The command launches the default browser with a URL like:

```
https://studio.apollographql.com/sandbox/explorer?endpoint=<encodedGraphQLUrl>
```

## Flags & environment variables

- `--endpoint <name>` — choose an endpoint from `.gqlrc.*` (defaults to `defaultEndpoint`).
- `--url <url>` — specify an explicit GraphQL endpoint.
- `--print` — skip opening the browser and just print the sandbox URL (handy for remote sessions).
- `GQL_NO_BROWSER=1` — disable browser launching globally (tests/CI). The command still prints the sandbox link so you can open it manually.

## Platform notes

The CLI invokes `open` (macOS), `xdg-open` (Linux), or `cmd /c start` (Windows). If those commands fail, the URL is printed so you can copy it yourself.
