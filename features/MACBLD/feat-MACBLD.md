# macOS Build & Notarization (MACBLD)

## Goal
Produce signed/notarized macOS binaries (x64 + arm64) as part of release pipeline, ensuring Gatekeeper-friendly distribution via zip/tar and Homebrew taps.

## User stories
- As a macOS user, I can download/run `gql` without bypassing Gatekeeper warnings.
- As release engineering, I can notarize/sign binaries automatically during PKGREL run.

## Assumptions
- Build pipeline uses pkg/esbuild/Bun to produce single binary; codesign + notarization requires Apple Developer ID + API keys.
- CI has access to signing certificates/secrets (stored in GitHub Actions secrets or HSM).
- Artifacts uploaded to GitHub Releases/Homebrew formula.

## Open issues & risks
- Notarization requires zipped artifacts + stapling; pipeline complexity high.
- Dual-arch universal binary vs separate builds? Need decision.
- Handling entitlements + dependencies (if Node) to satisfy Gatekeeper.

## Clarifying questions
- Are we shipping universal binary or separate arm64/x64? If separate, do we provide universal tarball as well?
- Where do signing certificates live (local vs CI)?
- Do we support macOS 11+ only or earlier versions?

## Scope
**Include**
- Build scripts to create macOS binaries (arm64/x64), codesign them, submit for notarization, and staple tickets.
- Release artifact organization (tar.gz/zip naming) + checksum generation.
- Documentation for maintaining signing credentials + rotating them.
**Exclude**
- DMG installers (unless later requested).
- Mac App Store distribution.

## Design notes
- Use `gon` or native `xcrun altool/notarytool` for notarization automation.
- Provide fallback when notarization fails (fail release) and log actionable error.
- Keep secrets minimal; use short-lived App Store Connect API keys.

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
- [ ] Release pipeline outputs signed/notarized macOS binaries for both archs with checksums.
- [ ] Gatekeeper verifies binaries without prompts on supported macOS versions.
- [ ] Documentation covers credential setup + troubleshooting.
- [ ] CI ensures mac builds executed on mac runners.

## Dependencies
- Blocks: HOMEBRW formula distribution, general GA release readiness.
- Blocked by: PKGREL (build system), CISETUP (mac runners), SEMVER (versioning), TELEMRY (if instrumentation), TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
