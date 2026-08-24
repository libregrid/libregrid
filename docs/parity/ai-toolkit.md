# Parity — AI Toolkit

> Shipped 2026-08-23 (Phase 19); end-user command pipeline added 2026-08-24.

**Source:** https://www.ag-grid.com/angular-data-grid/ai-toolkit/ · transcribed 2026-08-23 (API surface verified against `ag-grid-community@36.1.0` dist types)
**Phase:** 19 · **Package:** `@libregrid/ai-toolkit`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid API

| Requirement | Status | Notes |
|---|---|---|
| `getStructuredSchema(params?)` on `GridApi` | ✅ | Community-reserved slot (`gridApi.d.ts:1715`) filled by `AiToolkitModule.apiFunctions`; v1 features filter/sort/columnVisibility; filterability comes from the column's own `isFilterAllowed()`, so unconfigured columns are not advertised; live-grid integration spec |
| `StructuredSchemaParams.exclude` narrowing | ✅ | Per-feature exclusion from the generated schema (unit + integration) |
| Per-column `description` / `includeSetValues` | ✅ | Column hints + current filter values in the schema (`structuredSchema.unit.spec.ts`) |
| End-user `applyAiCommand(api, prompt, options?)` | ✅ | Public-`GridApi` pipeline snapshots the live grid, builds a capability-scoped environment, completes, decodes, validates, recompiles and applies atomically; invalid, unsupported, off-topic and cancelled requests return a typed `not-applied` result |

## Providers (ADR 0006)

| Requirement | Status | Notes |
|---|---|---|
| Browser-local default (`NeedleWasmProvider`) | ✅ | Needle 2 WASM pinned at HF commit `98fbd95` (Apache-2.0); assets lazy-fetched, never bundled; weights cached cache-first in Cache Storage (`libregrid-needle-v1`, keyed by URL — repeat visits download nothing, stale generations swept); optional `scriptIntegrity` for SRI on the glue; one session per page, `needle_reset()` per request, engine re-initialises when context or tools change; real-browser round trip in the docs e2e |
| Remote OpenAI-compatible / Anthropic provider | ✅ | `applyAiCommand` accepts `{ remote: { schema, baseUrl, model, apiKey } }`; it appends the standard Chat Completions or Messages endpoint and maps shared function schemas to the selected tool-use wire format. **Off by default**; custom providers remain available from `@libregrid/ai-toolkit/advanced` |
| Confidence gating | ✅ | A stated low confidence returns `not-applied`; an absent score is allowed after full plan validation because fine-tuned Needle artifacts do not report confidence. No guessed state change (unit + integration tested) |

## Tools

| Requirement | Status | Notes |
|---|---|---|
| `setSort` | ✅ | Applied through Community's state service (`setState`); visible effect asserted on a live grid |
| Typed filters | ✅ | Text, number, date, boolean, and set operators are restricted to each live column's resolved data type and filter capability. The compiler merges filter changes over current state, so unrelated column filters remain intact; cross-column AND is supported, while OR remains out of scope |
| `setColumnVisibility` | ✅ | Visible effect asserted on a live grid |
| `resetGrid` | ✅ | Clears sort/filter/visibility sections in one `setState` |

## Context and scope

| Requirement | Status | Notes |
|---|---|---|
| Row values in model context | ❌ | ADR 0006: schema + current state only; the ~256-token Needle budget cannot hold row data regardless |
| Conversation state | ❌ | v1 is stateless, matching the Ag-Grid module contract; post-v1 candidate |
| Aggregation / pivot / row-group features | ❌ | Deferred past v1 (filter/sort/visibility/reset only); `exclude` support makes them additive later. `V1_FEATURES` is checked against Community's `StructuredSchemaFeature` union, so adding one is a compile-time change |
| Cross-column filter OR | ❌ | Requires `AdvancedFilterModel` and `enableAdvancedFilter`; v1 deliberately supports typed per-column filters combined with AND only |
| `columnSizing` feature | ❌ | Not in the v1 scope set |
