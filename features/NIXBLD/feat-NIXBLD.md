# Nix Build & Flake Support (NIXBLD)

## Goal
Provide Nix flake definitions + derivations to build/install `gql` reproducibly on NixOS/macOS, integrating with PKGREL artifacts and CI.

## User stories
- As a Nix user, I can run `nix run github:org/gql` to use the CLI without manual setup.
- As the release team, I can build/test the CLI via Nix to ensure hermetic builds.

## Assumptions
- Project is Node-based (maybe bundler). Need derivation capturing dependencies via lockfile.
- Nix packaging lives under `nix/` with flake exposing `packages.<system>.gql`.
- CI (GitHub Actions) can run `nix build` for validation.

## Open issues & risks
- Node modules may not have deterministic builds without patching; need to rely on `npmDepsHash` or `pnpm2nix` solution.
- Keeping flake updated with new targets requires discipline.
- Mac/Windows devs not using Nix should not be impacted.

## Clarifying questions
- Do we plan to publish to `nixpkgs` or maintain internal flake only?
- Should flake expose devShell with tooling (node, bun, ts-node)?
- How do we manage binary caching (Cachix)?

## Scope
**Include**
- `flake.nix` + `flake.lock` with packages/app outputs.
- Build instructions hooking into release pipeline (PKGREL) to produce tarballs via Nix.
- Optional devShell for contributors.
**Exclude**
- Non-flake legacy Nix expressions (unless needed for upstream submission).
- Cachix/binary cache hosting (document but out of scope).

## Design notes
- Use `node2nix`/`pnpm2nix` or manual derivation to bundle dependencies.
- Provide `nix develop` shell with Node, pnpm, jq for hacking.
- Document how release pipeline consumes `nix build` outputs.

## Tasks
- [ ] Implementation
- [ ] Docs/Help updates
- [ ] Tests:
  - [ ] Unit
  - [ ] Integration
  - [ ] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Acceptance criteria
- [ ] `nix build` produces working `gql` executable for supported systems.
- [ ] `nix run` launches CLI with --version.
- [ ] Dev shell available with project dependencies.
- [ ] CI job validates flake build to prevent drift.

## Dependencies
- Blocks: packaging parity (Nix users), release automation.
- Blocked by: PKGREL (build scripts), TELEMRY (if hooking instrumentation), CISETUP (Nix job), TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
