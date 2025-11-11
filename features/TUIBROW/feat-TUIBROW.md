# Terminal Explorer (TUIBROW)

## Goal
Deliver an interactive terminal UI for browsing schemas, running operations, viewing results, and inspecting docs without typing full commands (similar to GraphiQL inside terminal).

## User stories
- As a developer, I launch `gql browse` to explore endpoints, filter operations, and execute queries interactively.
- As a support engineer, I can inspect schema types, fields, and recent history inside the TUI while reusing cached auth/config.

## Assumptions
- Built atop CFGDISC/INTROS metadata; operations executed via existing CLI pipeline.
- TUI built with libraries like `ink`, `blessed`, or `neo-blessed` for Node.
- Works best in full-featured terminals; fallback to CLI mode when not TTY.

## Open issues & risks
- Accessibility (screen reader) considerations.
- Need to avoid storing sensitive data when history saved; optional feature.
- Complexity high; stretch goal after GA.

## Clarifying questions
- Should TUI support editing GraphQL documents directly or only field selection UI?
- Do we support multiple endpoints at once (tabs)?
- How do we persist history/favorites?

## Scope
**Include**
- `gql browse` command launching TUI with panes: schema tree, docs, operation builder, result viewer.
- Integration with FIELDS/DOCDOC for building queries + fragments.
- Keyboard shortcuts for search, run, copy output.
**Exclude**
- Mouse-driven UI (maybe later).
- Web UI (Studio) integration beyond API usage.

## Design notes
- Provide pluggable data providers so TUI can reuse caching + operations from CLI.
- Offer read-only mode for schema exploration if execution disabled.
- Support theming/dark mode consistent with terminal colors.

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
- [ ] `gql browse` launches interactive UI listing endpoints/operations and can run queries.
- [ ] Users can search/filter schema, view docs, and inspect responses with syntax highlighting.
- [ ] Non-TTY environments gracefully exit with message.
- [ ] Feature flagged/off by default until stable.

## Dependencies
- Blocks: future UX (RECORD, LIVEQ) hooking into TUI.
- Blocked by: CFGDISC/INTROS/DOCDOC data, CORECLI command, OUTJSON/SELECTR for output, TESTFIX.

## Rollout
- [ ] Behind flag? y
- [ ] Docs updated
- [ ] Changelog entry
