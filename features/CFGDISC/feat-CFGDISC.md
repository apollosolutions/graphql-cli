# Config Discovery & Loader (CFGDISC)

## Goal
Auto-discover `.gqlrc.*`/`gql.config.*` files from cwd → repo root, resolve environment substitutions, and surface endpoint definitions to command handlers with validation errors when configs are missing or malformed.

## User stories
- As a user inside a project, I can run `gql api users` without supplying URLs or headers manually because the CLI finds `.gqlrc.yml` automatically.
- As a maintainer, I get clear errors when configs are invalid, missing required fields, or reference env vars that are unset.

## Assumptions
- Supported file formats: YAML (`.yml/.yaml`) and JSON per spec section 5.
- Discovery precedence matches docs/plan order (`.gqlrc.yml`, `.gqlrc.yaml`, `.gqlrc.json`, `gql.config.yml/yaml/json`).
- Environment substitution syntax `${VAR}` / `${VAR:-default}` must be honored.

## Open issues & risks
- Repo root detection: need rules for when to stop ascending (git root vs filesystem root vs sentinel file?).
- Config versioning/migrations—plan assumes `version: 1`; need strategy for future schema upgrades.
- Sensitive env vars may be logged; ensure loader redacts values in error output.

## Clarifying questions
- Do we support multiple config files merged together or only the first match?
- Should local overrides (.gqlrc.local.yml) be supported?
- How do we surface validation errors: aggregated vs fail-fast on first problem?

## Scope
**Include**
- File discovery walker with caching to avoid repeated disk lookups.
- Parser that loads YAML/JSON, resolves env placeholders, and normalizes structure (default endpoint, headers, aliases, fragments, etc.).
- Validation layer producing actionable error messages with file path + field context.
- Public API consumed by endpoint commands to retrieve config + resolved endpoints.
**Exclude**
- Hot-reloading configs (future DX enhancement).
- Remote config fetching or secrets storage.
- CLI init command (handled by **INITCMD** later) that scaffolds configs.

## Design notes
- Cache discovery results per process run to avoid disk thrash when commands call loader multiple times.
- Provide typed representation (e.g., `Config`, `EndpointConfig`) for downstream features.
- Hook into INTROS cache by storing per-endpoint cache settings.
- Consider exposing diagnostic flag (`--print-config`) for debugging but keep off by default.

## Tasks
- [x] Implementation
- [x] Docs/Help updates (`docs/config.md`, `docs/plan.md`)
- [x] Tests:
  - [x] Unit (`tests/unit/config.loader.test.ts`)
  - [x] Integration (file-system discovery exercised via temp directories)
  - [x] Golden fixtures (n/a — no CLI surface yet)
- [x] Telemetry (n/a for config loader utility)
- [x] Feature flag (n/a — always on)

## Acceptance criteria
- [x] CLI finds config files by walking parent directories and respects precedence order.
- [x] Env substitution works with defaults and errors when required vars missing.
- [x] Validation errors cite file, path, and reason; tests cover malformed structures.
- [x] Endpoint-mode commands can retrieve config + default endpoint details via exported API (`resolveEndpoint` helper).

## Implementation notes (2025-11-10)
- Added `src/config/loader.ts`, which handles candidate discovery, `.git`-bounded directory walking, YAML/JSON parsing, env substitution (`${VAR}`/`${VAR:-default}`), and schema validation before returning typed configs plus `defaultEndpoint` metadata.
- Exposed public surface via `src/config/index.ts` so upcoming endpoint commands can `loadConfig()` and `resolveEndpoint()` without reimplementing parsing logic.
- Created `docs/config.md` that documents discovery order, validation rules, env substitution, and consumption examples; `docs/plan.md` now marks CFGDISC as shipped.
- Tests in `tests/unit/config.loader.test.ts` cover repo-root traversal, precedence, env substitution, validation failures, and endpoint resolution.

## Dependencies
- Blocks: HELPEP, DISAMBI, ALIASES, RENHIDE, AUTH*, HDRMGMT, INITCMD, MANPAGE references.
- Blocked by: CORECLI (structure), TESTFIX (fixtures), CISETUP (tests), INTROS (schema metadata for endpoints).

## Rollout
- [x] Behind flag? n
- [x] Docs updated
- [x] Changelog entry (`docs/changelog.md`)
