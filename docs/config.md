# Config Discovery (`CFGDISC`)

`src/config/loader.ts` owns discovery, parsing, and validation of project configs. It exposes a `loadConfig` helper that commands (and tests) can call to obtain endpoint metadata plus default endpoint selection.

## Discovery rules

1. Candidate filenames are checked in this order for every directory: `.gqlrc.yml`, `.gqlrc.yaml`, `.gqlrc.json`, `gql.config.yml`, `gql.config.yaml`, `gql.config.json`.
2. Search starts at the provided `cwd` (defaults to `process.cwd()`), then walks parent directories until either a `.git/` directory is found (repo root) or the filesystem root is reached.
3. The first matching file wins; discovery results are cached per-process to avoid repeated disk I/O.
4. When no config is found, `loadConfig` throws `ConfigNotFoundError` with a friendly hint to run `gql init`.

## File format

- Supported formats: YAML (`.yml`/`.yaml`) and JSON.
- Required fields:
  - `version: 1`
  - `endpoints` map with at least one entry containing `url`.
- Optional fields include `defaultEndpoint`, `headers`, `auth`, `request`, `cache`, `features`, `aliases`, `fragments`, `documents`, and `help` (rename/hide/describe metadata).
- Top-level `telemetry`, `output`, and `cache` blocks gain light validation so downstream features can trust their shape.

## Environment substitution

Every string value is scanned for `${VAR}` or `${VAR:-default}` placeholders:

- `${API_TOKEN}` must have a corresponding `env.API_TOKEN` set (passed via `loadConfig({ env })` or read from `process.env`). Missing vars throw `ConfigValidationError` with a pointer such as `endpoints.api.headers.Authorization`.
- `${TENANT_ID:-public}` falls back to `public` when the env var is absent.
- Arrays and nested objects inherit the same substitution rules; results are materialized into plain JS objects so they can be serialized or mutated safely.

## Validation

`loadConfig` normalizes the parsed file into typed structures and fails fast on:

- Unknown `version` values.
- Non-object `endpoints`, missing `url`s, or empty endpoint maps.
- `defaultEndpoint` names that do not match a defined endpoint.
- Non-string headers/aliases/fragments, non-boolean feature flags, etc.

Error messages always include the file path plus the failing pointer (`endpoints.api.url`, `telemetry.enabled`, etc.) to simplify debugging malformed configs.

## Consuming the API

```ts
import { loadConfig, resolveEndpoint } from '../config';

const { config } = await loadConfig();
const { name, config: endpoint } = resolveEndpoint(config, userSuppliedName);

console.log(`Connecting to ${name} at ${endpoint.url}`);
```

See `tests/unit/config.loader.test.ts` for concrete fixtures that exercise discovery, env substitution, and validation behavior end-to-end.
