# Exit Codes

The CLI uses deterministic exit codes so scripts can distinguish between failure modes. The mapping is enforced centrally (see `features/ERRXIT/feat-ERRXIT.md`).

| Code | Name           | Description                                  |
|------|----------------|----------------------------------------------|
| 0    | success        | Command completed successfully.              |
| 2    | invalid_input  | CLI usage errors (bad flags, invalid JSON).  |
| 3    | schema_error   | Schema discovery or validation failures.     |
| 4    | graphql_error  | GraphQL execution returned `errors`.         |
| 5    | network_error  | HTTP/network/transport failures.             |
| 6    | internal_error | Unexpected crashes inside the CLI runtime.   |

Set `GQL_DEBUG=1` (or future `--debug`) to include stack traces for troubleshooting; otherwise errors stay concise. New commands should throw the appropriate error class from `src/errors/exit.ts` so ERRXIT can map them automatically.
