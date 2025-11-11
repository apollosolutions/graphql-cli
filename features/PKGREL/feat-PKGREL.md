# Packaging & Release Pipeline (PKGREL)

## Goal
Create a reproducible build + release pipeline that emits installable artifacts (npm package and/or single binaries per OS) with versioning, changelog automation, and distribution channels ready for GA.

## User stories
- As a user, I can install `gql` via a published npm package or download platform-specific binaries from GitHub Releases/Homebrew without manual builds.
- As a release manager, I can bump versions, generate changelogs, build artifacts, and publish them through a single scripted entrypoint with consistent metadata.

## Assumptions
- Primary distribution starts with npm (Node users) plus prebuilt binaries for macOS/Linux (Windows optional later), likely via pkg, ncc, or similar bundler.
- Semantic versioning (SemVer) is required; release notes derived from conventional commits.
- CI environment already configured (**CISETUP**) and can provide signing secrets or tokens when needed.

## Open issues & risks
- Selecting the bundling tool impacts binary size and platform coverage (pkg, esbuild, Rust rewrite, etc.).
- Code signing/notarization for macOS and Windows may require org-owned certificates; need timeline and owners.
- Release automation must handle large GraphQL schema fixtures without bloating bundles (tree-shaking/testing assets exclusion).

## Clarifying questions
- Which artifact formats are mandatory for GA (npm, tar.gz, Homebrew Formula, Scoop, Docker image)?
- Do we require reproducible builds/attestations (SLSA) or SBOM generation at launch?
- Should release channels include nightly/canary builds or only tagged releases?

## Scope
**Include**
- Build scripts that bundle the CLI, prune dev-only deps, and emit artifacts per target OS/arch.
- Release automation script (e.g., `scripts/release.sh` per plan) that handles version bump, changelog generation, tag creation, build, and publish.
- Storage/distribution wiring: GitHub Releases uploads, npm publish, and Homebrew tap skeleton referenced in `docs/plan.md`.
- Documentation describing install methods and release workflow for maintainers.
**Exclude**
- Telemetry/metrics toggles (Phase 8 `TELEMRY`).
- Advanced installers (MSI, Debian packages) unless required later.
- Release gate policies (belongs to **POLICYCI** in Phase 11).

## Design notes
- Mirror the sample command in `docs/plan.md` (`./scripts/release.sh --version $NEXT --build ... --publish ...`) for a single entrypoint; accept dry-run mode for testing.
- Use conventional commits + changelog generator (e.g., Changesets, Release Please) so manual editing stays minimal.
- Ensure artifact version metadata is embedded in the binary (`gql --version`).
- Keep build tooling modular so future runtimes (Rust rewrite) can reuse the release script interface.

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
- [ ] `npm run build` (or release script) produces installable artifacts for at least Linux + macOS (arm64/x64) with correct version stamping.
- [ ] Release workflow bumps version, updates changelog, tags repository, and uploads artifacts in a single automated pass.
- [ ] Install docs explain how to fetch binaries/package and verify checksums.
- [ ] Dry-run release demonstrated in CI to ensure the pipeline stays green between official releases.

## Dependencies
- Blocks: HOMEBRW, NIXBLD, WINBLD, MANPAGE, SEMVER, TELEMRY (they all rely on release plumbing).
- Blocked by: CORECLI (buildable CLI), CISETUP (reusable pipeline), TESTFIX (confidence before publishing).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
