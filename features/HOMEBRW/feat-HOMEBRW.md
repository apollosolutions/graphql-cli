# Homebrew Distribution (HOMEBRW)

## Goal
Publish `gql` via a Homebrew tap (and optionally Homebrew/core) with formula automation, ensuring macOS/Linux users can `brew install gql` immediately after releases.

## User stories
- As a macOS/Linux user, I can install/upgrade `gql` via `brew install gql` or `brew upgrade` without manual downloads.
- As release engineering, I can run the release script to auto-update the tap with new version + checksums.

## Assumptions
- PKGREL already produces signed macOS binaries and Linux tarballs with checksums.
- Dedicated tap repo (e.g., `yourorg/homebrew-tap`) exists or will be created.
- GitHub Actions can commit/push formula updates using bot token.

## Open issues & risks
- Need to keep formula definitions (URL/checksum) accurate per release; automation critical.
- Homebrew/core acceptance requires strict guidelines; initial focus on custom tap.
- Bottle (prebuilt) support optional; may rely on `brew` to download tarball + install binary.

## Clarifying questions
- Are we targeting custom tap only or eventual homebrew-core inclusion?
- Do we support HEAD builds (`brew install --HEAD`)?
- Should formula also install manpage/completion files automatically?

## Scope
**Include**
- Tap repo scaffolding + formula template referencing GitHub Releases artifacts.
- Release automation to update formula (version, sha256) and optionally run `brew audit/test`.
- Instructions for users to add tap and install.
**Exclude**
- cask distribution (GUI). CLI only.
- Other package managers (NPM, winget) covered elsewhere.

## Design notes
- Use `brew tap-new` to initialize repo; store formula under `Formula/gql.rb`.
- Provide script (maybe part of PKGREL) that updates formula file and opens PR or pushes to tap.
- Ensure formula installs completions + manpage to appropriate directories if available.

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
- [ ] `brew install gql` works after running release script, pulling from tap.
- [ ] Formula includes completions/manpage install steps.
- [ ] Release automation updates tap with minimal manual steps.
- [ ] Documentation instructs users to add tap and install/upgrade.

## Dependencies
- Blocks: packaging completeness for macOS/Linux, docs.
- Blocked by: PKGREL (artifacts), MACBLD (signed binaries), MANPAGE (docs), CISETUP (brew tests).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
