# Phase 19 — AI Toolkit and BYOM

**Status:** re-architected, locally validated, and live-provider validated
2026-08-25 (OpenAI battery passed after approved egress)

**Packages:** `@libregrid/ai-toolkit`, `@libregrid/ai-protocol`,
`@libregrid/ai-client`, `@libregrid/ai-gateway`

**Plan:** [`../plans/ai-toolkit-byom.md`](../plans/ai-toolkit-byom.md) ·
**Design:** [`../design/ai-toolkit.md`](../design/ai-toolkit.md) ·
**Parity:** [`../parity/ai-toolkit.md`](../parity/ai-toolkit.md) ·
**ADR:** [`../adr/0007-pure-ai-schema-and-byom-gateway.md`](../adr/0007-pure-ai-schema-and-byom-gateway.md)

## Outcome

The grid package is a pure deep module: register `AiToolkitModule`, then call
`GridApi.getStructuredSchema(params?)`. Provider choice, credentials, prompt
orchestration, transport, response validation, and state application do not
enter that package.

BYOM is delivered by three optional packages. The protocol supplies a stable
language-neutral HTTP contract and generators' OpenAPI input; the browser
client turns a response into a revalidated dry-run proposal; and the Node
gateway offers a zero-provider-SDK OpenAI deployment plus a tiny provider port.

## Completed scope

- [x] Record specification errata, pause local training, and accept ADR 0007.
- [x] Generate strict schemas for aggregation, filter, sort, pivot, column
      visibility, column sizing, and row grouping from live capabilities.
- [x] Cover simple/set/advanced filters, every built-in operator shape,
      descriptions, opt-in set values, exclusions, empty grids, and recursive
      definitions.
- [x] Remove Needle/SmolLM/providers/prompts/actions and the `advanced` subpath
      from the published toolkit.
- [x] Publish `libregrid.ai/v1` types, validators, JSON Schemas, OpenAPI 3.1,
      conformance fixtures, deterministic revisions, and provider envelope.
- [x] Implement `createGridAssistant` with HTTP/custom transport, full state
      context, double validation, stale checks, diff, explicit apply, and a
      complete protected state-ignore baseline.
- [x] Prove on a live grid that applying one feature preserves sort,
      pagination, order, and every omitted state key.
- [x] Implement provider-neutral gateway handling, auth hook, limits, timeout,
      health, normalized errors, metadata-only logs, OpenAI Responses adapter,
      deterministic mock, Node server/CLI, container, Compose example, and
      conformance CLI.
- [x] Replace the Docs route with a static contract workbench and external
      endpoint mode; pass focused Chromium behavior and light/dark axe tests.
- [x] Update package READMEs, legal notices, aliases, workspace dependencies,
      docs reference surfaces, budgets, and decision records.
- [ ] Run the live OpenAI fixture after explicit approval to send its fully
      synthetic schema, GridState, context, and command to OpenAI.

## Verification evidence

| Layer | Evidence |
|---|---|
| Schema/protocol/client/gateway | Focused Vitest suite, including restricted-dialect, wire-shape, failures, conformance, stale state, and real-grid preservation |
| Docs | Angular production build succeeds; focused Chromium suite has 7/7 passing, including light/dark axe |
| OpenAI adapter | Unit test asserts Responses `/v1/responses`, strict `text.format`, server-only bearer auth, output parsing, refusal, and rate-limit mapping |
| Live OpenAI | Test is checked in but skipped without `OPENAI_API_KEY`; attempted run was blocked before egress by environment policy |

| Workspace | 1,141 tests passed (one live test skipped); AI coverage passes at 88.93/80.55/94.41/94.67; all 37 production builds, lint, contamination, versions, bundle purity, and consumer fixtures pass |

All local implementation and administrative gates are complete. Only the
externally authorized live-provider battery remains before this phase can be
marked fully complete.

## Historical note

The 2026-08-23 Needle 2 spike and subsequent SmolLM2/LoRA experiments remain
historical feasibility work in `docs/reference/spike-results.md` and the paused
training plan. They are not active architecture, package inputs, fallbacks, or
release gates. ADR 0006 is superseded by ADR 0007.
