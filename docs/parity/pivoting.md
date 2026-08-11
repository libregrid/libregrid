# Parity — Pivoting

**Source:** https://www.ag-grid.com/angular-data-grid/pivoting/ · transcribed 2026-08-11
**Phase:** 8 · **Package:** `@libregrid/pivot`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `pivotMode` | ⬜ | |
| `pivotPanelShow` | ⬜ | `'always' \| 'onlyWhenPivoting' \| 'never'` |
| `pivotPanelSuppressSort` | ⬜ | |
| `sideBar` | ⬜ | Provided by Phase 1 |
| `toolbar` (`agPivotPanelToolbarItem`) | ⬜ | Toolbar lands Phase 13 |
| `suppressAggFuncInHeader` | ⬜ | Shared with aggregation |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `pivot` | ⬜ | Marks a column as a pivot column |
| `enablePivot` | ⬜ | Allows GUI pivoting via tool panel |
| `rowGroup` | ⬜ | Phase 2 — required alongside aggregation |
| `aggFunc` | ⬜ | Phase 2 — only aggregated rows show when pivoting |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `isPivotMode` | ⬜ | |
| `getPivotColumns` | ⬜ | |
| `setPivotColumns` | ⬜ | |
| `addPivotColumns` | ⬜ | |
| `removePivotColumns` | ⬜ | |
| `getPivotResultColumn` | ⬜ | Lookup by `pivotKeys` + `valueColId` |
| `setPivotResultColumns` | ⬜ | Explicit result column defs |
| `getPivotResultColumns` | ⬜ | |

## Events

| Event | Status | Notes |
|---|---|---|
| `columnPivotChanged` | ⬜ | Not enumerated on the docs page — verify |
| `columnPivotModeChanged` | ⬜ | Not enumerated on the docs page — verify |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Pivot result column generation | ⬜ | Deterministic IDs and ordering |
| Nested pivot column groups (multi-key) | ⬜ | |
| Pivot totals / grand totals | ⬜ | |
| Column state preserved across pivot toggle | ⬜ | |
| High-cardinality guard | ⬜ | Document a practical column limit |

> The docs page listed no events or callbacks. Verify against the live docs and `_PivotGridApi` when working Phase 8.
