# Variable Mapping (VARMAPR)

`src/vars/coerce.ts` converts CLI-provided flag values into GraphQL variables using schema-aware coercion. Highlights:

- Supports scalars (`String`, `Int`, `Float`, `Boolean`, `ID`) plus enums, lists, and nested input objects.
- Flags can target nested fields via dotted syntax, e.g. `--vars.input.name Jess` becomes `input.name` in the mapper.
- Lists accept repeated flags (arrays) or comma-separated strings when `splitLists` is enabled (default behavior).
- Validation errors throw `InvalidArgsError`, which flows through ERRXIT to produce exit code `2` with actionable messaging.

Example usage (within future URL/endpoint commands):

```ts
const variables = coerceVariables(variableDefs, {
  'input.name': 'Jess',
  'input.roles': ['ADMIN', 'VIEWER'],
  'input.contact.email': 'jess@example.com',
});
```

See `tests/unit/varmapr.test.ts` for additional scenarios and expectations.
