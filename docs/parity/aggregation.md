# Parity — Aggregation

**Source:** https://www.ag-grid.com/angular-data-grid/aggregation/ · transcribed 2026-08-11
**Phase:** 2 · **Package:** `@libregrid/row-grouping`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `aggFuncs` | ✅ | Custom funcs registered at init; covered by integration test |
| `groupTotalRow` | ⬜ | PR 2.4 |
| `grandTotalRow` | ⬜ | PR 2.4 |
| `suppressAggFuncInHeader` | ⬜ | Not a PR 2.3 item after all — it's value-column header text (`"sum(Sales)"`), unrelated to the auto group column; still open |
| `aggregateOnlyChangedColumns` | 🟡 | Not implemented — aggStage always does a full traversal (documented in code); safe but not incremental |
| `suppressAggFilteredOnly` | ✅ | `filterAggStage` re-aggregates over all children when true; integration-tested |
| `groupAggFiltering` | 🟡 | Option read by stages but group-value filtering lands with PR 2.5's full group filter |
| `groupSuppressBlankHeader` | ⬜ | PR 2.4 |
| `suppressStickyTotalRow` | ⬜ | PR 2.4 |
| `alwaysAggregateAtRootLevel` | ✅ | Root node aggregated when true; verified via `getRowNode(ROOT_NODE_ID)` |
| `getGroupRowAgg` | ✅ | Overrides per-column aggs; integration-tested |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `aggFunc` | ✅ | Read from colDef by `valueColsSvc.extractCol` |
| `initialAggFunc` | ✅ | Applied on first column creation only |
| `valueIndex` | 🟡 | Stored by `sortByPendingState`; multi-column pivot ordering matters in Phase 8 |
| `initialValueIndex` | 🟡 | Same as `valueIndex` |
| `enableValue` | ✅ | Becomes a value column with the default agg func |
| `allowedAggFuncs` | ✅ | `aggFuncSvc.getFuncNames` honours it |
| `defaultAggFunc` | ✅ | Preferred over the `'sum'` fallback |
| `showValuesAs` | ⬜ | PR 2.5 |
| `initialShowValuesAs` | ⬜ | PR 2.5 |
| `showValuesAsDef` | ⬜ | PR 2.5 |
| `enableShowValuesAs` | ⬜ | PR 2.5 — column-menu submenu |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `getValueColumns` | ✅ | Delegates to `valueColsSvc.columns` |
| `addValueColumns` | ✅ | Dispatches `columnValueChanged`; integration-tested |
| `removeValueColumns` | ✅ | |
| `setValueColumns` | ✅ | Replaces the set |
| `setColumnAggFunc` | ✅ | Switch verified sum → max in integration test |
| `addAggFuncs` | ✅ | Custom func usable by name immediately after |
| `clearAggFuncs` | ✅ | Clears grid-provided funcs too |
| `rowNode.getAggregatedChildren(colKey)` | 🟡 | Community `RowNode` method works over our tree; pivot-key filtering semantics arrive with Phase 8 |
| `rowNode.getAggregatedChildren(colKey, true)` | 🟡 | Same note |

## Built-in Aggregation Functions

| Function | Status | Notes |
|---|---|---|
| `sum` | ✅ | Unit-tested: `[]`, all-null, mixed-null, non-numeric, NaN, large |
| `min` | ✅ | |
| `max` | ✅ | |
| `count` | ✅ | Returns `IAggFuncResult`; child counts sum across levels |
| `avg` | ✅ | Weighted across nested levels via `{value, count}` wrapper — integration-tested |
| `first` | ✅ | |
| `last` | ✅ | |

## Callbacks

| Callback | Status | Notes |
|---|---|---|
| `getGroupRowAgg` | ✅ | |
