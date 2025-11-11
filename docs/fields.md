# Field Selection Helpers

`src/fields/parser.ts` implements the `--fields` mini-language:

- Comma-separated field names with optional whitespace (`id, name`).
- Nested selections using braces (`profile { id, contact { email } }`).
- Errors include context (unexpected tokens, missing braces) and bubble up via `InvalidArgsError` once commands adopt the helpers.

`src/fields/builder.ts` consumes parsed selections plus schema metadata to emit GraphQL documents:

- `buildDocumentFromFields(schema, rootType, selections)` validates that requested fields exist and ensures object fields include sub-selections.
- `buildDefaultSelection(schema, rootType, { depthLimit })` auto-picks scalar/enum leaves (and `__typename`) within a configurable depth, which URL mode can use when users omit `--fields`.

Unit tests in `tests/unit/fields.*.test.ts` provide reference cases for both parsing and default selection behavior. Downstream commands should pass GraphQL `GraphQLObjectType` references (e.g., query root) from introspection to keep validation truthful.
