# Parity — AI Toolkit

> Planned 2026-08-23 (Phase 19) · implemented 2026-08-23 on `feature/ai-toolkit`.

**Source:** https://www.ag-grid.com/angular-data-grid/ai-toolkit/ · transcribed 2026-08-23 (API surface verified against `ag-grid-community@36.1.0` dist types)
**Phase:** 19 · **Package:** `@libregrid/ai-toolkit`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid API

| Requirement | Status | Notes |
|---|---|---|
| `getStructuredSchema(params?)` on `GridApi` | ✅ | Community-reserved slot (`gridApi.d.ts:1715`) filled by `AiToolkitModule.apiFunctions`; v1 features filter/sort/columnVisibility; filterability comes from the column's own `isFilterAllowed()`, so unconfigured columns are not advertised; live-grid integration spec |
| `StructuredSchemaParams.exclude` narrowing | ✅ | Per-feature exclusion from the generated schema (unit + integration) |
| Per-column `description` / `includeSetValues` | ✅ | Column hints + current filter values in the schema (`structuredSchema.unit.spec.ts`) |

## Providers (ADR 0006)

| Requirement | Status | Notes |
|---|---|---|
| Browser-local default (`NeedleWasmProvider`) | ✅ | Needle 2 WASM pinned at HF commit `98fbd95` (Apache-2.0); assets lazy-fetched, never bundled; weights cached cache-first in Cache Storage (`libregrid-needle-v1`, keyed by URL — repeat visits download nothing, stale generations swept); optional `scriptIntegrity` for SRI on the glue; one session per page, `needle_reset()` per request, engine re-initialises when context or tools change; real-browser round trip in the docs e2e |
| Optional OpenAI-compatible remote fallback | ✅ | Consumer endpoint; **off by default**, explicit opt-in (`OpenAiCompatibleProvider`) |
| Confidence gating + escalation | ✅ | `runToolkit`: below threshold → remote (if enabled) or clarification result. The fallback is gated on the same threshold, so escalation cannot apply an under-confident answer either; no guessed state change (unit-tested) |

## Tools

| Requirement | Status | Notes |
|---|---|---|
| `setSort` | ✅ | Applied through Community's state service (`setState`); visible effect asserted on a live grid |
| `setFilters` | 🟡 | Flat `{ column, values }` single-column shape (spike finding B) mapped to `filterModel`, merged over the current model in `toolCallToStatePatch`. **Requires an `agSetColumnFilter`** (`@libregrid/set-filter`): the emitted `filterType: 'set'` model is discarded silently by any other filter, so columns with a text/number filter are not yet supported. Live-grid coverage asserts the filter applies and that filtering a second column keeps the first |
| `setColumnVisibility` | ✅ | Visible effect asserted on a live grid |
| `resetGrid` | ✅ | Clears sort/filter/visibility sections in one `setState` |

## Context and scope

| Requirement | Status | Notes |
|---|---|---|
| Row values in model context | ❌ | ADR 0006: schema + current state only; the ~256-token Needle budget cannot hold row data regardless |
| Conversation state | ❌ | v1 is stateless, matching the Ag-Grid module contract; post-v1 candidate |
| Aggregation / pivot / row-group features | ❌ | Deferred past v1 (filter/sort/visibility/reset only); `exclude` support makes them additive later. `V1_FEATURES` is checked against Community's `StructuredSchemaFeature` union, so adding one is a compile-time change |
| Multiple tool calls per request | ❌ | `runToolkit` acts on the first call; the rest stay on `outcome.result.calls`. The catalogue no longer invites multi-call answers |
| Text/number filter columns in `setFilters` | ❌ | Set semantics only in v1 — see the `setFilters` row above |
| `columnSizing` feature | ❌ | Not in the v1 scope set |
