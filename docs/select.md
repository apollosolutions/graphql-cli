# Output Selection (`SELECTR`)

Use `--select` to run [JMESPath](https://jmespath.org/) expressions against the full GraphQL JSON payload before it reaches stdout, and optionally chain `--jq` to pass the (possibly reduced) JSON through a `jq` program.

## Examples

```bash
# Grab just the list of user names
gql api users --limit 10 --select 'data.users[].name'

# Combine select + jq (select runs first)
gql api users --select data.users --jq '.[] | {id, email}'

# Target an arbitrary URL
gql https://api.example.com/graphql query me --select 'data.me'
```

## Behavior

- `--select <expr>` evaluates the expression using the `jmespath` npm module. Errors raise an `invalid_input` exit code with the parser message.
- The expression runs against the entire GraphQL response (including `errors`/`extensions`). Most use cases will inspect the `data` branch.
- Selection results are serialized back to JSON using the same pretty/compact heuristics as the base output pipeline.
- `--jq '<expr>'` shells out to `jq` (defaults to `jq` on `PATH`; override via `GQL_JQ_BIN=/custom/jq`). The selected JSON (or the original response when `--select` is omitted) is streamed to jq via stdin, and jq’s stdout replaces the CLI output.
- Any non-zero jq exit code or missing binary results in an `invalid_input` error with stderr forwarded for debugging.
- `--raw` output skips the GraphQL formatter entirely, so selectors/jq are disallowed when `--raw` is provided.
- `--format table` runs after `--select` and expects an array to render. Because jq replaces the final payload with arbitrary text, `--format table` and `--jq` are mutually exclusive. `--format ndjson` behaves similarly but emits one JSON object per line for streaming pipelines; it also conflicts with `--jq`.

## Tips

- Pipe friendly: the CLI still appends a newline unless `--newline=false` is introduced later, so downstream tools behave as expected.
- Combine with `--fields` / `--doc` to limit the GraphQL response size before selecting.
- Selections apply equally to endpoint mode, URL mode, `render-json` (developer helper), and any future commands that reuse the shared output pipeline.
