# Test Harness

The repository uses [Vitest](https://vitest.dev) for both unit and integration coverage. Tests live under `tests/` with the following layout:

```
tests/
  fixtures/         # schema + introspection fixtures consumed by tests
  golden/           # expected CLI outputs maintained via UPDATE_GOLDENS
  integration/      # CLI-level tests that spawn handlers end-to-end
  unit/             # library helpers + fixture loaders
  utils/            # shared helpers (CLI runner, fixture loader, temp dirs, goldens)
```

## Commands

- `npm test` — runs the entire suite (unit + integration + golden comparisons).
- `npm run test:update` — regenerates golden files (sets `UPDATE_GOLDENS=1`). Use this when intentionally changing CLI text output.
- `npm run test:watch` — convenient loop while developing.

## Fixtures & Goldens

- Schema SDL files live under `tests/fixtures/schemas/` with matching introspection JSON in `tests/fixtures/introspection/` so features such as URLMODE can reuse them.
- Golden files in `tests/golden/` capture canonical CLI stdout/stderr for commands like `gql --help`. When updating, reviewers can inspect diffs to understand UX changes.
- Helpers in `tests/utils/` (e.g., `expectToMatchGolden`, `runCliCapture`, `withTempDir`) keep tests focused on behavior instead of plumbing. The `render-json` developer command also exists purely so tests (and humans) can exercise the JSON output pipeline without hitting a live GraphQL endpoint. `tests/integration/project-mode.test.ts` spins up a temporary `.gqrc.yml` + HTTP server to assert config-driven endpoint commands (aliases, disambiguation, documents/fragments, help) stay functional end-to-end, and `tests/integration/completions.test.ts` verifies `gql completions <shell>` emits snippets containing endpoint/operation metadata.

Always run `npm test` before sending a PR so CI (see `docs/ci.md`) produces the same results.
