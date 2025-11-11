# Versioning & Changelog (SEMVER)

## Goal
Enforce semantic versioning (SemVer) for the CLI with automated version bumps, changelog generation, and release tagging via tooling like Changesets or Release Please.

## User stories
- As a maintainer, I run a single command that bumps version, updates CHANGELOG.md, tags release, and triggers builds.
- As a user, I can read changelog entries grouped by feature/fix/breaking change for every version.

## Assumptions
- Conventional commits (CISETUP) already enforced for commit metadata.
- Release pipeline (PKGREL) consumes version + changelog info.
- Repo includes `CHANGELOG.md` tracked in git.

## Open issues & risks
- Need to coordinate with release automation to avoid double-tagging.
- Breaking change detection relies on metadata (labels or commit types); ensure process defined.
- Contributors must learn workflow (e.g., running `changeset` CLI) to queue version bumps.

## Clarifying questions
- Use Changesets vs Release Please vs custom script? choose soon.
- How to handle prerelease tags (beta/rc)?
- Should docs/manpage embed version automatically? (likely yes.)

## Scope
**Include**
- Versioning tool config + docs (Changesets or similar) integrated with CI.
- CHANGELOG template + automation to append entries grouped by category.
- Release script integration to read version + changelog and create git tags.
**Exclude**
- Marketing blog posts for releases.
- Translating changelog.

## Design notes
- Prefer Changesets for multi-package readiness; configure to open release PR summarizing changes.
- Ensure version appears in CLI (`gql --version`), package.json, and generated artifacts.
- Provide guidance for breaking changes (manual note required).

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
- [ ] Version bumps + changelog entries automated via chosen tool; release PR created with summary.
- [ ] `gql --version` matches package version + git tag.
- [ ] Process documented for contributors (how to add changeset, categories, breaking flags).
- [ ] CI verifies changelog + version updated before release.

## Dependencies
- Blocks: PKGREL release script, docs (MANPAGE) referencing versions.
- Blocked by: CISETUP (workflow), CORECLI (version flag), TESTFIX (maybe version tests).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
