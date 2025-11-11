# Continuous Integration

The `CI` workflow (see `.github/workflows/ci.yml`) runs automatically on pushes to `main` and all pull requests.

## Jobs

- **build-test**
  - Installs dependencies with `npm ci` (Node 18)
  - Runs `npm run ci:lint` (TypeScript no-emit type check)
  - Runs `npm run ci:test` (Vitest suite)
  - Runs `npm run ci:build` (TypeScript build) to ensure distributable output continues to compile
- **commitlint**
  - Validates every pull request commit message against the Conventional Commits spec using `@commitlint/config-conventional`

Mark the `CI` and `commitlint` checks as required in repository settings to guarantee consistent guardrails before merging.

## Local parity

```
npm install
npm run ci:verify
```

This mirrors what CI executes so contributors can fix issues before opening a PR.
