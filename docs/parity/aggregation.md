# Parity — Aggregation

**Source:** https://www.ag-grid.com/angular-data-grid/aggregation/ · transcribed 2026-08-11
**Phase:** 2 · **Package:** `@libregrid/row-grouping`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `aggFuncs` | ✅ | Custom funcs registered at init; covered by integration test |
| `groupTotalRow` | ✅ | PR 2.4 — see `docs/parity/row-grouping.md` ("Sorting, Ordering & Totals") for the `footerSvc` implementation; integration-tested |
| `grandTotalRow` | 🟡 | PR 2.4 — inline `'top'`/`'bottom'` only; `'pinnedTop'`/`'pinnedBottom'` deferred (needs the pinned row model). Also required `AggregationStage` to aggregate the root node whenever `grandTotalRow` is set, regardless of `alwaysAggregateAtRootLevel` — there's otherwise nothing for the grand total to show |
| `suppressAggFuncInHeader` | ❌ | Not implemented — controls value-column header text (e.g. `"sum(Sales)"`), unrelated to the auto group column; not shipped — deferred post-1.0 |
| `aggregateOnlyChangedColumns` | 🟡 | Not implemented — aggStage always does a full traversal (documented in code); safe but not incremental |
| `suppressAggFilteredOnly` | ✅ | `filterAggStage` re-aggregates over all children when true; integration-tested |
| `groupAggFiltering` | 🟡 | Option read by stages; group-value filtering shipped with PR 2.5's `GroupFilterStage` (✅ in `docs/parity/row-grouping.md` "Group Aggregate Filtering"); retained 🟡 here pending this checklist's independent ✅ re-verification |
| `groupSuppressBlankHeader` | ✅ | PR 2.4 — free once `FooterService` links `groupNode.sibling`: Community's own `ValueService.displayIgnoresAggData` already gates on it; integration-tested |
| `suppressStickyTotalRow` | ❌ | Not implemented — total rows aren't sticky (`stickyRowSvc` is never registered), so this option is a no-op; sticky rows are a documented post-1.0 candidate (phase-13 13A); see `docs/parity/row-grouping.md` "Sticky rows" |
| `alwaysAggregateAtRootLevel` | ✅ | Root node aggregated when true; verified via `getRowNode(ROOT_NODE_ID)` |
| `getGroupRowAgg` | ✅ | Overrides per-column aggs; integration-tested |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `aggFunc` | ✅ | Read from colDef by `valueColsSvc.extractCol` |
| `initialAggFunc` | ✅ | Applied on first column creation only |
| `valueIndex` | 🟡 | Stored by `sortByPendingState`; multi-column pivot ordering matters in Phase 8 |
| `initialValueIndex` | 🟡 | Same as `valueIndex` |
| `enableValue` | ✅ | Becomes a value column with the default agg func and gates Phase 3 Values controls and native drops. |
| `allowedAggFuncs` | ✅ | `aggFuncSvc.getFuncNames` honours it |
| `defaultAggFunc` | ✅ | Preferred over the `'sum'` fallback |
| `showValuesAs` | ✅ | PR 2.5 shipped — the five built-in modes are integration-tested (`packages/row-grouping/src/showValuesAs.integration.spec.ts`) and demonstrated on the live `/row-grouping` docs route (see `row-grouping.md`) |
| `initialShowValuesAs` | ✅ | PR 2.5 shipped — create-only, per doc; implemented and integration-tested via `resolveColumn`'s `applyInitial` flag (✅ in `row-grouping.md`) |
| `showValuesAsDef` | 🟡 | PR 2.5 shipped — `precision`/`suppressHeaderIndicator` are read, but `modes` (custom mode registry / built-in overrides) is not implemented; see `docs/parity/row-grouping.md` |
| `enableShowValuesAs` | 🟡 | PR 2.5 shipped — read by `isMenuEligible`, but no column-menu entry point renders it yet (not wired into `@libregrid/menu`); see `docs/parity/row-grouping.md` "Column-menu integration" |

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
