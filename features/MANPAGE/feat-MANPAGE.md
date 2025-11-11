# Manpage & Docs Packaging (MANPAGE)

## Goal
Generate and ship a comprehensive `man gql` page (plus markdown/html docs) as part of release artifacts, ensuring offline documentation matches CLI capabilities.

## User stories
- As a user on a remote server, I can run `man gql` to learn usage without internet access.
- As a maintainer, the manpage builds automatically from CLI metadata so docs stay in sync with releases.

## Assumptions
- HELPX2/HELPEP provide structured metadata to feed doc generator.
- Build pipeline (PKGREL) can include generated manpages in packages/homebrew formula.
- Tooling available (ronn, mdroff, pandoc) to convert markdown to man format.

## Open issues & risks
- Need to keep doc generation deterministic for reproducible builds.
- Some packaging targets (Windows) don't use manpages; need alternative (HTML/markdown) docs.
- Localization? likely English-only at first.

## Clarifying questions
- Do we host HTML docs on website or only ship with repo/releases?
- Should manpage include advanced sections (examples, environment variables, exit codes)? (yes.)
- Where do we store generated files in repo vs build artifacts?

## Scope
**Include**
- Doc generator that transforms CLI metadata into markdown + manpage (ROFF) files.
- Build integration to produce docs during release (PKGREL) and include in packages.
- `gql docs build` command for local regeneration + tests to ensure `git status` clean.
**Exclude**
- Full docs website (maybe separate project).
- Video/tutorial content.

## Design notes
- Keep source templates in `/docs/` (Markdown) and convert via `ronn` or `pandoc` to man.
- Provide version stamping within manpage (gql X.Y.Z) automatically.
- Add CI check to ensure docs regenerated when CLI flags change.

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
- [ ] `gql docs build` produces up-to-date `gql.1` manpage + markdown docs with no manual editing.
- [ ] Release artifacts include manpage + markdown (Homebrew formula installs manpage).
- [ ] CI verifies docs are regenerated when CLI metadata changes.
- [ ] Users can run `man gql` after installing via supported package managers.

## Dependencies
- Blocks: packaging tasks (HOMEBRW, Linux distros), docs distribution.
- Blocked by: HELPX2 (metadata), PKGREL (release pipeline), CORECLI (version), TESTFIX (fixtures for golden docs).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
