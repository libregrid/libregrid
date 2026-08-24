# Parity — AI Toolkit

> Planned 2026-08-23 (Phase 19, docs-only) — implementation not started; all shipped-behavior rows ⬜.

**Source:** https://www.ag-grid.com/angular-data-grid/ai-toolkit/ · transcribed 2026-08-23 (API surface verified against `ag-grid-community@36.1.0` dist types)
**Phase:** 19 · **Package:** `@libregrid/ai-toolkit`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid API

| Requirement | Status | Notes |
|---|---|---|
| `getStructuredSchema(params?)` on `GridApi` | ⬜ | Community-reserved slot (`gridApi.d.ts:1715`, dist stub); v1 features filter/sort/columnVisibility |
| `StructuredSchemaParams.exclude` narrowing | ⬜ | Per-feature exclusion from the generated schema |
| Per-column `description` / `includeSetValues` | ⬜ | Column hints + current filter/sort values in the schema |

## Providers (ADR 0006)

| Requirement | Status | Notes |
|---|---|---|
| Browser-local default (`NeedleWasmProvider`) | ⬜ | Needle 2 WASM; assets lazy-loaded, never bundled; no network by default |
| Optional OpenAI-compatible remote fallback | ⬜ | Consumer endpoint; **off by default**, explicit opt-in |
| Confidence gating + escalation | ⬜ | Below threshold → remote (if enabled) or clarification result; no guessed state change |

## Tools

| Requirement | Status | Notes |
|---|---|---|
| `setSort` | ⬜ | Applied through Community's state service (`setState`) |
| `setFilters` | ⬜ | Flat `{ column, values }` single-column shape (spike finding B) mapped to `filterModel` over the Phase 6 filter surface; multiple calls per turn allowed |
| `setColumnVisibility` | ⬜ | |
| `resetGrid` | ⬜ | `propertiesToIgnore` / clear semantics |

## Context and scope

| Requirement | Status | Notes |
|---|---|---|
| Row values in model context | ❌ | ADR 0006: schema + current state only; the ~256-token Needle budget cannot hold row data regardless |
| Conversation state | ❌ | v1 is stateless, matching the Ag-Grid module contract; post-v1 candidate |
| Aggregation / pivot / row-group features | ❌ | Deferred past v1 (filter/sort/visibility/reset only); `exclude` support makes them additive later |
| `columnSizing` feature | ❌ | Not in the v1 scope set |
