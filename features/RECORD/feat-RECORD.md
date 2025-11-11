# Session Recorder (RECORD)

## Goal
Capture CLI sessions into reproducible flow files (`.gqflow.yaml`) describing commands, selections, outputs, and saved artifacts so teams can share or replay workflows.

## User stories
- As a power user, I run `gql record start --out onboarding.gqflow` to log subsequent commands and share with teammates.
- As an SRE, I can replay a recorded flow via `gql record run onboarding.gqflow` to reproduce incidents.

## Assumptions
- Recorder hooks into CORECLI command dispatcher to observe inputs/outputs.
- Flow files store commands, flags, environment hints, optional inline outputs or references.
- Replay uses existing CLI commands (not simulated) with optional prompts.

## Open issues & risks
- Need to redact secrets (headers, tokens) before writing flows.
- Long-running commands (subscriptions) may produce large outputs; consider sampling.
- Replay must confirm before executing dangerous operations (mutations) unless `--yes` provided.

## Clarifying questions
- Flow format: YAML vs JSON vs custom? plan shows YAML.
- Do we support editing flow files manually? (Yes, textual format.)
- Should recorder capture outputs fully or partial (hash + path)?

## Scope
**Include**
- Commands: `record start`, `record stop`, `record run <file>`, `record list`.
- Flow schema capturing command, args, selects, outputs (maybe file references) with metadata.
- Replay engine executing commands sequentially, supporting `select/save` steps per plan snippet.
**Exclude**
- Video/screen capture.
- Cloud storage of flows (users manage files themselves).

## Design notes
- Provide event emitter hooking into CLI to log command start/end, exit code, output path.
- Flow file should support comments + manual editing; include version number.
- Replay should support `--dry-run` to preview steps before executing.

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
- [ ] Recorder captures commands (with sanitized flags) and writes valid `.gqflow.yaml` files.
- [ ] Replay executes steps sequentially with options to pause/confirm; tests cover sample flow from plan.
- [ ] Secrets redacted or marked for manual fill-in.
- [ ] Feature behind flag until matured.

## Dependencies
- Blocks: workflow sharing, POLICYCI integration, DX improvements.
- Blocked by: CORECLI (hook points), OUTJSON (outputs), SELECTR (select steps), TELEMRY (maybe), TESTFIX.

## Rollout
- [ ] Behind flag? y
- [ ] Docs updated
- [ ] Changelog entry
