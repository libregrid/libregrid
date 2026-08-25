# Handoff — AI Toolkit pure schema and BYOM gateway

**Date:** 2026-08-25

**Architecture decision:**
[ADR 0007](docs/adr/0007-pure-ai-schema-and-byom-gateway.md)

**Delivery plan:**
[AI Toolkit BYOM](docs/plans/ai-toolkit-byom.md)

## Current outcome

The experimental in-browser Needle/SmolLM runtime has been removed from the
published AI Toolkit. Local-model training is paused. The supported design is
now four small, separately installable packages:

| Package | Responsibility |
| --- | --- |
| `@libregrid/ai-toolkit` | Generate a strict JSON Schema from the current live grid capabilities. |
| `@libregrid/ai-protocol` | Define and validate the versioned, language-neutral `libregrid.ai/v1` wire contract. |
| `@libregrid/ai-client` | Snapshot state, call the application endpoint, revalidate, detect staleness, show a diff, and apply explicitly. |
| `@libregrid/ai-gateway` | Offer a portable server handler, provider port, OpenAI Responses adapter, deterministic mock, Node CLI, conformance CLI, and container. |

The browser never receives a provider key or chooses a model. The deploying
application owns user authentication, secret storage, provider/model choice,
and the endpoint boundary. It may deploy LibreGrid's Node gateway unchanged,
wrap its framework-neutral handler, or implement the OpenAPI contract in any
language.

## Public seams

```ts
// Live grid: one schema-generation API.
const schema = api.getStructuredSchema(params);

// Browser: one assistant factory, with an explicit proposal/apply boundary.
const assistant = createGridAssistant({ api, endpoint: '/v1/grid-command' });
const proposal = await assistant.run(command);
proposal.apply();

// Server: one provider port behind one Request -> Response handler.
const handler = createGridCommandHandler({ provider, authorize });
```

The stable operation is `POST /v1/grid-command`; health is `GET /health`.
`@libregrid/ai-protocol/openapi.json` is the interoperability source for Go,
Java, C#, Python, Rust, PHP, Ruby, or other server stacks.

## Safety properties

- The generated schema exposes only legal live column IDs, feature
  capabilities, filter operators, and opt-in set values.
- Every provider response is validated at the gateway and again in the
  browser.
- The client fingerprints schema plus current state and rejects stale results.
- The model cannot weaken the protected ignore baseline for unrelated or
  unavailable Grid State.
- A command produces a dry-run diff; applying is a separate explicit action.
- Gateway logs contain request IDs, result codes, and latency—not commands,
  schemas, state, credentials, or authorization headers.

## Verified evidence

As of 2026-08-25:

- Full Vitest: all 151 files passed; 1,141 tests passed and the one
  external-provider test was skipped.
- New-package coverage: 88.93% statements, 80.55% branches, 94.41% functions,
  and 94.67% lines; all repository thresholds pass.
- ESLint and `git diff --check`: pass.
- Full production workspace build: all 37 projects pass.
- Contamination and version checks: pass.
- Bundle purity and all consumer fixtures: pass. Clean AI artifacts measure
  26.8 KB toolkit, 18.7 KB protocol, 8.5 KB client, and 59.8 KB gateway
  including both self-contained CLIs.
- Docs AI Toolkit E2E: seven focused Chromium behavior/accessibility checks
  pass in light and dark modes.
- Gateway conformance passes through a real loopback HTTP server using the
  deterministic provider.
- Live-grid integration round-trips all seven schema features and the AG Grid
  36.1 `dateString` Advanced Filter discriminator; complete golden digests
  cover full, excluded, and capability-removed reference grids.
- Live OpenAI contract battery passed on 2026-08-25 after owner-approved
  egress: model `gpt-5.6`, eleven of eleven contract commands plus the local
  fixture test in 36.99 s.

## Live provider validation

The repository owner approved the synthetic egress on 2026-08-25 and the
battery passed: model `gpt-5.6`, eleven of eleven contract commands plus the
local fixture test, 36.99 s total. The payload is fully synthetic; no customer
data leaves the machine. Read `.secrets` through Node's `--env-file`; never
print or source the key into shell output:

```bash
node --env-file=.secrets node_modules/vitest/vitest.mjs run \
  packages/ai-gateway/src/openai.live.spec.ts
```

Without `OPENAI_API_KEY` in the environment the test skips itself.

## Commands

```bash
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npm run build
npm run lint
npm run test:all
npm run check:contamination
npm run check:versions
npm run check:budgets
```

The production Docs build fetches its configured Google Fonts CSS so it needs
network access. The gateway integration test needs permission to bind a
loopback-only ephemeral port.

## Historical training work

Needle 2 and SmolLM2 measurements remain in
`docs/reference/spike-results.md` and
`docs/plans/ai-toolkit-smollm2-v3.md`. They are evidence, not an active plan or
a package dependency. The old corpus generator filenames now stop immediately
with an ADR 0007 explanation so obsolete automation cannot silently target the
removed action runtime. Resuming model work requires a new architecture
decision and a generator built against the current protocol.
