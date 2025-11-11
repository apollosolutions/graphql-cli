# Enhanced Help Experience (HELPX2)

## Goal
Polish the global/command help UX with syntax-highlighted examples, contextual tips, pagination hints, and machine-readable output (`--help=json`) building on HELPEP foundations.

## User stories
- As a new user, `gql --help` shows curated examples, environment hints, and directs me to docs quickly.
- As a tooling author, I can run `gql --help=json` to extract command metadata programmatically.

## Assumptions
- HELPEP already lists endpoints/operations; HELPX2 enriches content + formats.
- Core CLI supports detecting terminal width and color support.
- COMPLSH + MANPAGE share metadata with help generator.

## Open issues & risks
- Need to avoid overwhelming users with walls of text; require collapsible sections or toggles (maybe `--verbose-help`).
- JSON help output may leak internal details; ensure stable schema.
- Example commands should remain up to date; consider templating based on config.

## Clarifying questions
- Should we integrate with `less`/pager automatically for long help output?
- How do we handle localization? (likely English-only initially.)
- Do we include environment variable reference section by default?

## Scope
**Include**
- Help renderer improvements: syntax highlighting, example sections, environment variable tables, `--help=json`.
- `--help=verbose` or `GQL_HELP_MODE` env to toggle extra details.
- Integration with docs/manpage generation pipeline so content reuses same metadata.
**Exclude**
- Interactive help search (TUI) beyond potential pager integration.
- External doc sync.

## Design notes
- Use `chalk`/`kleur` for color but detect TTY & `NO_COLOR` env.
- JSON help output should include commands, descriptions, flags, arguments, endpoints, env vars.
- Provide tests comparing rendered help (strip ANSI) to fixtures.

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
- [ ] `gql --help` shows enriched formatting + curated examples; tests guard formatting.
- [ ] `--help=json` outputs machine-readable metadata consumed by docs tooling.
- [ ] Pager integration works for long help (auto env detection or `--pager` flag).
- [ ] Hidden/renamed operations still respected.

## Dependencies
- Blocks: MANPAGE generation, docs tooling, DX polish.
- Blocked by: HELPEP, CFGDISC metadata, CORECLI (flag handling), TESTFIX (fixtures).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
