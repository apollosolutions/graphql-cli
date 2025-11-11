# Until / Buffer Controls (UNTLBUF)

## Goal
Provide streaming controls like `--until <expr>` and `--buffer N` so users can stop subscriptions after conditions met or batch NDJSON/table output for better throughput.

## User stories
- As an SRE, I can run `gql api onUserUpdated --ndjson --until 'data.user.id==123'` to stop streaming once a condition hits.
- As a data engineer, I can buffer 100 events before flushing to disk to reduce disk churn (`--buffer 100`).

## Assumptions
- Works atop SUBWS/SUBSSE transports and OUTNDJS output.
- Condition language can reuse SELECTR/JMESPath/jq logic or simple JS expression.
- Buffering applies to streaming outputs only; for regular queries, it no-ops.

## Open issues & risks
- Need deterministic expression evaluation environment to avoid code injection; prefer declarative query language.
- Buffer flushing must handle signals/exit to avoid data loss.
- Interplay with `--until-time 30s` vs expression? may support both.

## Clarifying questions
- Should we support `--max-events` as shorthand for count-based stop?
- Do we let users choose expression engine (JMESPath vs JS)?
- How do we handle errors inside expression evaluation?

## Scope
**Include**
- Flags: `--until`, `--max-events`, `--buffer`, `--flush-interval` for streaming commands.
- Expression evaluation hooking into SELECTR or small DSL (maybe reuse `--select`).
- Buffer manager that accumulates events, applies selection, flushes via OUTNDJS/OUTTABL.
**Exclude**
- Persistent queueing or resume-on-restart semantics.
- Complex workflows (branching) beyond simple stop/buffer.
- Condition editing UI (TUI).

## Design notes
- Provide `StreamingController` that receives events and decide when to flush/exit.
- Support timeouts (`--until-time 60s`) to exit after duration even if condition not met.
- Document interplay with exit codes (if until condition not met before timeout -> non-zero?).

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
- [ ] `--until` stops streaming once condition true; tests cover field match + max events.
- [ ] Buffering flushes deterministically based on count/time and handles final flush on exit.
- [ ] Works with both SUBWS and SUBSSE transports.
- [ ] Errors/timeouts produce clear messages and exit codes.

## Dependencies
- Blocks: streaming UX (OUTNDJS, TUIBROW), diagnostics.
- Blocked by: SUBWS/SUBSSE transports, SELECTR (expression engine), CORECLI flags, TESTFIX.

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
