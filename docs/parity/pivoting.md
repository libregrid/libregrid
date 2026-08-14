# Parity — Pivoting

**Source:** https://www.ag-grid.com/angular-data-grid/pivoting/ · transcribed 2026-08-11
**Phase:** 8 · **Package:** `@libregrid/pivot`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `pivotMode` | ✅ | Client-side stage/result columns toggle with the grid option. |
| `pivotPanelShow` | ✅ | Header pivot zone honors `always`, `onlyWhenPivoting`, and `never`. |
| `pivotPanelSuppressSort` | 🟡 | Preserved as a strict-order signal; interactive pivot-label sorting is not yet implemented. |
| `sideBar` | ✅ | Provided by Phase 1; Columns panel pivot controls are functional. |
| `toolbar` (`agPivotPanelToolbarItem`) | 🟡 | Deferred to Phase 13 as planned. |
| `suppressAggFuncInHeader` | 🟡 | Generated headers use source display names; custom aggregate-function header formatting remains aggregation follow-up work. |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `pivot` | ✅ | Extracted into `pivotColsSvc` at column build. |
| `enablePivot` | ✅ | Enforced by native/CDK/tool-panel pivot actions. |
| `rowGroup` | ✅ | Phase 2 groups receive pivot intersection aggregates. |
| `aggFunc` | ✅ | Value columns supply result-column aggregation functions. |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `isPivotMode` | ✅ | Reports the `pivotMode` option. |
| `getPivotColumns` | ✅ | |
| `setPivotColumns` | ✅ | |
| `addPivotColumns` | ✅ | |
| `removePivotColumns` | ✅ | |
| `getPivotResultColumn` | ✅ | Lookup by `pivotKeys` + `valueColId`. |
| `setPivotResultColumns` | ✅ | Explicit result definitions persist across mode toggles. |
| `getPivotResultColumns` | ✅ | |

## Events

| Event | Status | Notes |
|---|---|---|
| `columnPivotChanged` | ✅ | Dispatched by `pivotColsSvc` and refreshes CSRM/panels. |
| `columnPivotModeChanged` | ✅ | Community ColumnModel dispatches it on `pivotMode` changes. |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Pivot result column generation | ✅ | Length-prefixed deterministic IDs; sorted key ordering. |
| Nested pivot column groups (multi-key) | ✅ | Built through Community's column-tree builder. |
| Pivot totals / grand totals | ✅ | Raw-leaf result aggregation at each group and root. |
| Column state preserved across pivot toggle | ✅ | Primaries remain parked; explicit definitions restore on re-enable. |
| High-cardinality guard | ✅ | `pivotMaxGeneratedColumns`; finite 100–500 cap recommended. |

> The docs page listed no events or callbacks. Verify against the live docs and `_PivotGridApi` when working Phase 8.
