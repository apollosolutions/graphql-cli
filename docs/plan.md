Multi-Phase Implementation Plan for gql

Convention: Each feature has a unique shortcode (5–8 chars) and its own tracker file:
features/feat-<SHORTCODE>.md (organized by shortcode).
Example: features/URLMODE/feat-URLMODE.md
Cross-references in this plan use shortcodes in bold.

⸻

Repository scaffolding

/docs/
  feat-<SHORTCODE>.md
/spec/                 # frozen spec + schema fixtures (SDL + introspection JSON)
/packages/             # build artifacts
/docs/                 # README, manpage, usage guides
/src/                  # CLI source


⸻

Phase 0 — Project Skeleton & Tooling

Summary
Lay the foundation: CLI entrypoint, command router, config loader stub, tests, CI, and packaging skeleton.

Features
	•	CORECLI — CLI bootstrap, command registry, flag parser. (DONE 2025-11-09)
	•	CISETUP — CI (lint/test/build), PR checks, conventional commits. (DONE 2025-11-09)
		•	TESTFIX — Test harness, golden fixtures, schema snapshots. (DONE 2025-11-09)
	•	PKGREL — Packaging pipeline (single binary or Node pkg), versioning.

Pseudocode (command registry skeleton)

// src/cli.ts
const registry = new CommandRegistry();

registry.register('help', helpHandler);
registry.register('completions', completionsHandler);
registry.register('init', initHandler);

// Ad-hoc URL entrypoint (Phase 1)
registry.register('<url> <kind> <opName>', urlModeHandler);

// Endpoint mode (Phase 2)
registry.register('<endpoint> [opName]', endpointModeHandler);

run(process.argv.slice(2));

Examples
	•	gql --help
	•	gql completions zsh

⸻

Phase 1 — MVP (Ad-hoc URL Mode)

Summary
Enable direct calls against any GraphQL URL when the user specifies the operation type. Add introspection + schema cache, flag→variable coercion, default selections, JSON output, and exit codes.

Features
		•	URLMODE — URL + query|mutation|subscription invocation. (DONE 2025-11-09)
	•	INTROS — Introspection + schema cache (TTL + ETag). (DONE 2025-11-09)
		•	VARMAPR — Flag→variable coercion (scalars, enums, lists, input objects). (DONE 2025-11-09)
		•	FIELDS — --fields selection + safe default scalar-leaf selection. (DONE 2025-11-09)
		•	OUTJSON — JSON output (pretty unless piped). (DONE 2025-11-09)
		•	ERRXIT — Exit codes mapping (2,3,4,5,6). (DONE 2025-11-09)

Pseudocode (ad-hoc invocation path)

async function urlModeHandler(argv) {
  const { url, kind, opName, flags } = parseUrlModeArgs(argv);
  const schema = await getSchemaCached(url, flags.headers); // **INTROS**
  const op = findRootOp(schema, kind, opName);              // validates **ERRXIT**
  const variables = coerceFlagsToVars(op.args, flags.vars); // **VARMAPR**

  const document = flags.doc ?? buildDoc(op, flags.fields); // **FIELDS**
  const res = await httpGraphQL(url, { document, variables, headers: flags.headers });
  printJson(res, { pretty: !isPiped() });                   // **OUTJSON**
  process.exit(mapExitCode(res));                           // **ERRXIT**
}

Example
	•	gql https://api.example.com/graphql query getUser --id 123 --fields "id,name"

⸻

Phase 2 — Config Discovery & Operation-Type-less Endpoint Commands

Summary
When .gqlrc.* exists, expose endpoints as top-level subcommands. Users run gql api users without specifying query|mutation|subscription. Generate rich endpoint help and resolve ambiguities via policy or prompt.

Features
	•	CFGDISC — Discover .gqlrc.yml|yaml|json (cwd→repo root); env subst ${VAR:-default}. (DONE 2025-11-10)
	•	HELPEP — Endpoint help grouped by Queries/Mutations/Subscriptions with descriptions. (DONE 2025-11-11)
	•	DISAMBI — Operation resolution by name; --kind override; conflict policy (prefer/prompt). (DONE 2025-11-11)
	•	ALIASES — Alias mapping (ls -> users). (DONE 2025-11-11)
	•	RENHIDE — help.rename, help.hide, help.describe. (DONE 2025-11-11)
	•	COMPLSH — Completions v1 (endpoints, op names). (DONE 2025-11-11)

Pseudocode (operation resolution without op type)

function resolveOperation(schema, name, opts) {
  const matches = roots(schema).filter(r => hasField(r, name)); // e.g., ['Query','Mutation']
  if (matches.length === 1) return { root: matches[0], field: name };
  if (matches.length === 0) throw suggestClosest(name, allRootNames(schema));

  if (opts.kind) return { root: capitalize(opts.kind), field: name };
  if (opts.policy.promptOnConflict && isTTY()) {
    return promptSelect(matches.map(m => ({ root: m, field: name })));
  }
  const prefer = opts.policy.preferKindOnConflict || 'Query';
  return { root: prefer, field: name };
}

Examples
	•	gql api --help
	•	gql api users --limit 25
	•	gql api reset --kind mutation

⸻

Phase 3 — Documents, Schema Utilities & Output Shaping

Summary
Support authored .graphql docs and fragments, schema print/save, operation list, and more output formats with shaping via --select and --jq.

Features
		•	DOCDOC — --doc/--operation-name, fragments load/validate. (DONE 2025-11-11)
	•	SCHEMAP — schema print|save (SDL/JSON). (DONE 2025-11-12)
	•	OPLIST — op list (filter by kind). (DONE 2025-11-12)
	•	SELECTR — --select (JMESPath-like) and --jq passthrough. (DONE 2025-11-12)
	•	OUTTABL — --format table with column inference. (DONE 2025-11-12)
	•	OUTNDJS — --format ndjson (stream lists). (DONE 2025-11-12)

Pseudocode (selection building)

function buildDoc(op, fieldsArg) {
  if (fieldsArg) return renderSelection(op.name, parseFields(fieldsArg));
  if (op.preAuthoredDoc) return op.preAuthoredDoc;
  return renderSelection(op.name, inferScalarLeafs(op.returnType)); // conservative default
}

	Examples
		•	gql api --doc ./queries/getUser.graphql --operation-name GetUser
		•	gql api users --select 'data.users[].name'
		•	gql api users --select data.users --format table
		•	gql api users --select data.users --format ndjson
		•	gql schema print --endpoint api --format sdl > schema.graphql
		•	gql ops list --endpoint api --json
		•	gql explore api --print

⸻

Phase 4 — Headers & Auth

Summary
Merge headers from config, CLI, and plugins; add bearer/apikey/oauth2 strategies; redact secrets in logs.

Features
	•	HDRMGMT — --header, headers file, merge & redaction. (DONE 2025-11-13)
	•	AUTHBRR — Bearer (env or auth login placeholder; keychain storage).
	•	AUTHAPIK — API key via header or query param.
	•	AUTHOA2 — OAuth2 Device/PKCE with refresh.

Pseudocode (header merge + redaction)

function buildHeaders(configHeaders, cliHeaders, pluginHeaders) {
  return { ...configHeaders, ...pluginHeaders, ...cliHeaders };
}
function redactForLog(h) {
  const secrets = ['authorization','x-api-key','authentication'];
  return Object.fromEntries(Object.entries(h).map(([k,v]) =>
    [k, secrets.includes(k.toLowerCase()) ? '***REDACTED***' : v]
  ));
}

Examples
	•	gql api me --header "X-Debug: 1"
	•	.gqlrc.yml with Authorization: "Bearer ${API_TOKEN}"

⸻

Phase 5 — Subscriptions & Streaming

Summary
Add WebSocket (and then SSE) transports; stream payloads as NDJSON, support --until and --buffer.

Features
	•	SUBWS — WebSocket (graphql-transport-ws) + reconnect/backoff.
	•	SUBSSE — SSE transport option.
	•	UNTLBUF — --until 'expr' halt condition, --buffer N batching.

Pseudocode (subscription loop)

async function runSubscription(client, { document, variables, untilExpr, bufferN }) {
  const buffer = [];
  for await (const payload of client.subscribe({ document, variables })) {
    if (bufferN) { buffer.push(payload); if (buffer.length < bufferN) continue; }
    const out = bufferN ? buffer.splice(0, buffer.length) : payload;
    printNdjson(out);
    if (untilExpr && matches(out, untilExpr)) break;
  }
  await client.close();
}

Examples
	•	gql api onUserUpdated --ndjson
	•	gql api onUserUpdated --until 'data.onUserUpdated.status=="DONE"' --buffer 10

⸻

Phase 6 — Pagination & Uploads

Summary
Built-ins for Relay cursor pagination and offset/limit patterns; GraphQL multipart file uploads.

Features
	•	RELAYPG — Relay pageInfo{hasNextPage,endCursor} walker.
	•	OFFSETPG — Offset/limit paginator (vars + step + max).
	•	UPLOADS — Multipart Upload scalar (--file @path, nested inputs).

Pseudocode (Relay paginator)

async function relayCollect(runOp, path, pageSize, limit) {
  let after = null, total = 0;
  while (true) {
    const vars = { first: pageSize, after };
    const res = await runOp(vars);
    const page = get(res, path); // e.g., data.usersConnection
    for (const edge of page.edges) {
      printNdjson(edge.node);
      if (++total >= limit) return;
    }
    if (!page.pageInfo.hasNextPage) return;
    after = page.pageInfo.endCursor;
  }
}

Examples
	•	gql api usersConnection --paginate relay --path data.usersConnection --limit 1000
	•	gql api uploadAvatar --userId 42 --file @./me.jpg --fields "success,url"

⸻

Phase 7 — Plugins

Summary
Public plugin API with lifecycle hooks for config/request/response and command injection; optional sandbox.

Features
	•	PLUGINAPI — JS/TS plugin interface.
	•	PLUGNREQ — Request/response mutation hooks.
	•	PLUGCMD — onDefineCommands to add commands.
	•	SECBOX — Optional sandbox (deny fs/net unless granted).

Pseudocode (hook bus)

class PluginBus {
  hooks = { onLoadConfig: [], onBeforeRequest: [], onAfterResponse: [], onDefineCommands: [] };
  use(plugin) { plugin.setup(this); }
  tap(name, fn) { this.hooks[name].push(fn); }
  async emit(name, arg) {
    for (const fn of this.hooks[name]) await fn(arg);
  }
}

Example plugin

export default {
  name: "x-request-id",
  setup(ctx) {
    ctx.hooks.onBeforeRequest(req => { req.headers["X-Request-Id"] = crypto.randomUUID(); });
  }
};


⸻

Phase 8 — Diagnostics, Performance & Resilience

Summary
Robust logging/trace, printable I/O with secret redaction, schema/result caching controls, HTTP/2, retries/backoff, per-request timeouts.

Features
	•	LOGTRCE — --log-level, --trace (DNS/TLS/req).
	•	PRINTIO — --print-request/--print-response (redact).
	•	CACHSCM — Cache tuning (dir, TTL, revalidation).
	•	CACHRES — Optional result cache (--cache-results key= ttl=).
	•	HTTP2 — HTTP/2 opt-in + keep-alive.
	•	RETRIES — Retries/backoff policy (global + endpoint).
	•	TIMEOUT — Per-request timeout override.

Pseudocode (retry with exponential backoff + jitter)

async function withRetry(fn, { attempts=3, baseMs=250 }) {
  let lastErr;
  for (let i=0; i<attempts; i++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      const delay = baseMs * (2 ** i) + Math.random() * 50;
      await wait(delay);
    }
  }
  throw lastErr;
}


⸻

Phase 9 — Developer Experience & Polish

Summary
Make it feel great: richer --help, smarter completions, gql init scaffold, optional studio open, and manpage sync.

Features
	•	HELPX2 — Operation help (required vars first, enum tables, examples).
	•	COMPLX2 — Completions for enum values & var names; auto --kind on ambiguous picks.
	•	INITCMD — gql init (probe URL, scaffold .gqlrc.yml, .env.example). (DONE 2025-11-09)
	•	STUDIOOP — studio open (optional browser explorer). (DONE 2025-11-12)
	•	MANPAGE — gql(1) manpage + --help sync.

Pseudocode (help render for operation)

function renderOpHelp(op) {
  return [
    `Usage: gql ${op.endpoint} ${op.cliName} [flags]`,
    ``,
    `GraphQL: ${op.root}.${op.name}`,
    `Variables:`,
    ...op.args.map(a => `  --${a.cliFlag} ${a.type}${a.required?'!':''}`),
    `Return: ${op.returnType}`,
    op.enums.length ? `Enums:\n  ${op.enums.join(', ')}` : ''
  ].join('\n');
}


⸻

Phase 10 — Packaging & Release Engineering

Summary
Deliver stable cross-platform binaries, Homebrew tap, and release semantics.

Features
	•	NIXBLD — Linux builds.
	•	MACBLD — macOS builds (universal; codesign optional).
	•	WINBLD — Windows builds.
	•	HOMEBRW — Homebrew formula + tap.
	•	SEMVER — Release policy, changelog, GH Releases.
	•	TELEMRY — Opt-in, minimal anonymous telemetry scaffold (off by default).

Example release script (pseudo)

./scripts/release.sh \
  --version $NEXT \
  --build linux,macos,windows \
  --publish github \
  --brew-tap yourorg/homebrew-tap


⸻

Phase 11 — Stretch (Post-GA)

Summary
Value-add after GA: TUI explorer, session recorder, live queries, defer/stream rendering, mock server from schema, and CI policies.

Features
	•	TUIBROW — Terminal UI explorer (gql browse).
	•	RECORD — Session recorder → .gqflow.yaml.
	•	LIVEQ — Live Queries support.
	•	DEFERST — @defer/@stream progressive rendering.
	•	MOCKSRV — Local mock server from schema.
	•	POLICYCI — CI policy hooks to block dangerous ops.

Example (recording flow YAML)

version: 1
steps:
  - run: gql api users --limit 100 --ndjson
  - select: 'name,email'
  - save: users.ndjson


⸻

Shortcode Index

Foundations: CORECLI, CISETUP, TESTFIX, PKGREL
MVP: URLMODE, INTROS, VARMAPR, FIELDS, OUTJSON, ERRXIT
Config/Endpoints: CFGDISC, HELPEP, DISAMBI, ALIASES, RENHIDE, COMPLSH
Docs/Schema/Output: DOCDOC, SCHEMAP, OPLIST, SELECTR, OUTTABL, OUTNDJS
Auth/Headers: HDRMGMT, AUTHBRR, AUTHAPIK, AUTHOA2
Streaming: SUBWS, SUBSSE, UNTLBUF
Pagination/Uploads: RELAYPG, OFFSETPG, UPLOADS
Plugins: PLUGINAPI, PLUGNREQ, PLUGCMD, SECBOX
Diagnostics/Perf: LOGTRCE, PRINTIO, CACHSCM, CACHRES, HTTP2, RETRIES, TIMEOUT
DX/Polish: HELPX2, COMPLX2, INITCMD, STUDIOOP, MANPAGE
Packaging/Release: NIXBLD, MACBLD, WINBLD, HOMEBRW, SEMVER, TELEMRY
Stretch: TUIBROW, RECORD, LIVEQ, DEFERST, MOCKSRV, POLICYCI

⸻

Dependencies (high-level)
	•	Phase 1 depends on Phase 0.
	•	Phase 2 depends on INTROS, CORECLI.
	•	Phase 3 depends on INTROS.
	•	Phase 4 depends on CFGDISC (for merged headers).
	•	Phase 5 depends on OUTNDJS (for streaming).
	•	Phase 6 depends on VARMAPR.
	•	Phase 7 depends on CORECLI.
	•	Phase 8 depends broadly on previous phases.
	•	Phase 9 depends on HELPEP, DOCDOC.
	•	Phase 10 depends on PKGREL.

⸻

Feature file template (paste into every features/<SHORTCODE>/feat-<SHORTCODE>.md)

# <Feature Name> (<SHORTCODE>)

## Goal
<1–2 lines>

## User stories
- As a <role>, I can …
- As a …

## Assumptions
- <Preconditions about inputs, environments, schemas, tooling, releases, etc.>
- <e.g., “Server supports standard introspection”>

## Open issues & risks
- <Known unknowns, edge cases, API variability, performance concerns, timelines>
- <Risk owner + mitigation>

## Clarifying questions
- <Concrete questions that must be answered by PM/Eng/Docs>
- <Blockers called out explicitly>

## Scope
**Include**
- …
**Exclude**
- …

## Design notes
- <Key data structures, interfaces, diagrams refs, decisions>

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
- [ ] <Behavioral checks; UX examples; error cases>
- [ ] <Performance/SLOs if relevant>

## Dependencies
- Blocks: <SHORTCODEs>
- Blocked by: <SHORTCODEs>

## Rollout
- [ ] Behind flag? y/n
- [ ] Docs updated
- [ ] Changelog entry


⸻

Milestone gates
	•	MVP Ship (Phases 0–1): URLMODE, INTROS, VARMAPR, OUTJSON, ERRXIT ✅
	•	Project Mode Ship (through Phase 2): CFGDISC, DISAMBI, HELPEP, COMPLSH ✅
	•	Dev-friendly Ship (through Phase 4): selections/docs/output/auth complete ✅
	•	GA (through Phase 10): packaging, manpage, completions, docs, release ✅
