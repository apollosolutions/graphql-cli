# Windows Build & Installer (WINBLD)

## Goal
Ship Windows-friendly binaries/installers (zip + optional MSI/winget manifest) with proper code signing, path setup, and PowerShell completion support.

## User stories
- As a Windows developer, I can install `gql` via winget or downloaded zip and run it from PowerShell/Cmd.
- As release engineering, I can sign binaries with Authenticode certificates and publish to GitHub Releases/winget.

## Assumptions
- Build pipeline can run on Windows runners to produce `.exe` (pkg/PKG) or standalone Node binary.
- Code signing certificate (Authenticode) available in secure store (Azure Key Vault, GitHub secrets).
- PowerShell completion script provided by COMPLSH/COMPLX2.

## Open issues & risks
- Need to ensure dependencies packaged for Windows (OpenSSL, etc.).
- MSI/winget packaging adds complexity; may start with zip + manual winget manifest.
- Path + shim installation must not require admin privileges when possible.

## Clarifying questions
- Are we targeting winget, Scoop, or both? (start with winget + zipped binary.)
- Do we provide MSI installer? (maybe later; initial zipped exe + instructions.)
- Where do signing certs live and how rotated?

## Scope
**Include**
- Build scripts for Windows x64 (and arm64 if needed), signing with Authenticode.
- Packaging zipped artifacts + winget manifest generation automation.
- Documentation for installing/completions on Windows.
**Exclude**
- Chocolatey packaging (maybe later).
- UI installers beyond MSI (if we skip).

## Design notes
- Use GitHub Actions Windows runners; rely on `signtool`/Azure Sign to sign exe.
- Automate winget PR creation (YAML) referencing new version + checksums.
- Provide instructions for adding completions to PowerShell profile.

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
- [ ] Windows binaries built, signed, zipped per release with checksums.
- [ ] Winget (or chosen package manager) manifests updated automatically.
- [ ] Install docs verified on Windows (path/completion setup).
- [ ] CI confirms Windows builds succeed.

## Dependencies
- Blocks: cross-platform GA readiness, packaging parity.
- Blocked by: PKGREL (build pipeline), CISETUP (Windows runners), TELEMRY (instrumentation), TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
