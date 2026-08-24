# Parity — AI Toolkit

> Planned 2026-08-23 (Phase 19) · implemented 2026-08-23 on `feature/ai-toolkit`.

**Source:** https://www.ag-grid.com/angular-data-grid/ai-toolkit/ · transcribed 2026-08-23 (API surface verified against `ag-grid-community@36.1.0` dist types)
**Phase:** 19 · **Package:** `@libregrid/ai-toolkit`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid API

| Requirement | Status | Notes |
|---|---|---|
| `getStructuredSchema(params?)` on `GridApi` | ✅ | Community-reserved slot (`gridApi.d.ts:1715`) filled by `AiToolkitModule.apiFunctions`; v1 features filter/sort/columnVisibility; live-grid integration spec |
| `StructuredSchemaParams.exclude` narrowing | ✅ | Per-feature exclusion from the generated schema (unit + integration) |
| Per-column `description` / `includeSetValues` | ✅ | Column hints + current filter values in the schema (`structuredSchema.unit.spec.ts`) |

## Providers (ADR 0006)

| Requirement | Status | Notes |
|---|---|---|
| Browser-local default (`NeedleWasmProvider`) | ✅ | Needle 2 WASM pinned at HF commit `98fbd95` (Apache-2.0); assets lazy-fetched, never bundled; weights cached cache-first in Cache Storage (`libregrid-needle-v1`, keyed by URL — repeat visits download nothing); one session per page, `needle_reset()` per request, engine re-initialises when context or tools change; real-browser round trip in the docs e2e |
| Optional OpenAI-compatible remote fallback | ✅ | Consumer endpoint; **off by default**, explicit opt-in (`OpenAiCompatibleProvider`) |
| Confidence gating + escalation | ✅ | `runToolkit`: below threshold → remote (if enabled) or clarification result; no guessed state change (unit-tested) |

## Tools

| Requirement | Status | Notes |
|---|---|---|
| `setSort` | ✅ | Applied through Community's state service (`setState`); visible effect asserted on a live grid |
| `setFilters` | ✅ | Flat `{ column, values }` single-column shape (spike finding B) mapped to `filterModel`; merge-over-current-model in `applyToolCall`. Note: jsdom never instantiates header filter UIs, so set-filter models only become visible where the column's filter accepts them (real browsers) — mapping + merge covered by unit tests |
| `setColumnVisibility` | ✅ | Visible effect asserted on a live grid |
| `resetGrid` | ✅ | Clears sort/filter/visibility sections in one `setState` |

## Context and scope

| Requirement | Status | Notes |
|---|---|---|
| Row values in model context | ❌ | ADR 0006: schema + current state only; the ~256-token Needle budget cannot hold row data regardless |
| Conversation state | ❌ | v1 is stateless, matching the Ag-Grid module contract; post-v1 candidate |
| Aggregation / pivot / row-group features | ❌ | Deferred past v1 (filter/sort/visibility/reset only); `exclude` support makes them additive later |
| `columnSizing` feature | ❌ | Not in the v1 scope set |
