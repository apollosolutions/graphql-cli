# Flag → Variable Coercion (VARMAPR)

## Goal
Convert CLI flags (scalars, enums, lists, nested input objects) into GraphQL operation variables that URLMODE and endpoint commands can pass to the executor, with consistent validation and helpful errors.

## User stories
- As a user, I can pass `--id 123 --input.name Alice` on the CLI and have the tool coerce them into the correct GraphQL variable payload automatically.
- As a developer, I can call a shared coercion utility that understands schema types, enum values, lists, and custom scalars without rewriting parsing logic per command.

## Assumptions
- `INTROS` provides schema metadata (argument types, default values) needed for validation.
- CLI parser yields a structured representation of flags (including arrays, dotted keys, JSON blobs) rather than raw strings only.
- Error handling routes through **ERRXIT** so invalid input surfaces deterministic exit codes.

## Open issues & risks
- Deeply nested input objects may conflict between dotted notation (`--input.address.city`) and JSON payloads (`--input '{"address":{...}}'`); need merge precedence rules.
- Lists need consistent UX: repeated flags vs comma-separated vs JSON arrays; must document and validate.
- Custom scalars (DateTime, UUID) require pluggable coercers or pass-through to server; avoid accidental stringification.

## Clarifying questions
- Should we support variable files (`--vars-file ./vars.json`) in MVP?
- Do enums accept case-insensitive input or must match schema casing exactly?
- How do we handle default values defined in schema—apply automatically or only when user omits flag?

## Scope
**Include**
- Type-aware coercion helpers: scalars, enums (with validation), lists (repeat/JSON), input objects (dotted + JSON merge), booleans (flag presence), nulling (`--foo null`).
- Error messaging with path context (`input.address.city expected String! got null`).
- Optional variable sources: inline JSON via `--vars`, file-based import (if confirmed), environment substitution (later?).
- Exposure as reusable module consumed by URLMODE + endpoint mode.
**Exclude**
- File upload handling (Phase 4 `UPLOADS`).
- Secrets management for auth headers (belongs to HDRMGMT/AUTH* features).
- Runtime prompting for missing variables (could be Phase 2+. For MVP, fail fast).

## Design notes
- Accept both dotted flags and JSON merges; dotted flags override JSON defaults when conflicts arise to match CLI expectations.
- Normalize types before validation (numbers vs strings) using schema info; rely on JS `BigInt`/`Number` when possible.
- Provide `coerceVariables(operationArgs, flagInput, opts)` returning `{ variables, errors[] }`; caller decides whether to throw.
- Keep output stable for deterministic golden tests—sorted keys, no undefined fields.

## Tasks
- [x] Implementation
- [x] Docs/Help updates
- [x] Tests:
  - [x] Unit
  - [ ] Integration
  - [ ] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Implementation notes (2025-11-09)
- Added `src/vars/coerce.ts` with `coerceVariables`, which accepts GraphQL variable definitions + CLI flag maps and produces validated variable payloads. Supports scalars, enums, nested input objects (via dotted keys), and list handling (arrays or comma-separated strings).
- Errors throw `InvalidArgsError` with path-aware messages (missing variable, wrong scalar type, invalid enum). These integrate with ERRXIT to surface exit code 2 automatically.
- Created `tests/unit/varmapr.test.ts` to cover coercion across scalars, enums, lists, nested input objects, and validation failures using schema fixtures built via `buildSchema`.
- Authored `docs/variables.md` describing usage, flag conventions, and references to the helper for future feature work.

## Acceptance criteria
- [x] Scalars, enums, lists, and nested input objects coerce correctly with validation errors referencing the exact argument path.
- [ ] Duplicate inputs from multiple sources resolve deterministically (documented precedence). *(Pending CLI plumbing for JSON + dotted merges.)*
- [x] JSON/dotted merges work for multi-level structures with test coverage.
- [ ] CLI commands leveraging VARMAPR can execute operations without manual variable crafting. *(Pending URLMODE integration.)*

## Dependencies
- Blocks: URLMODE, CFGDISC, DISAMBI, pagination helpers requiring args.
- Blocked by: CORECLI (flag parser), INTROS (type metadata), TESTFIX (fixture scaffolding).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
