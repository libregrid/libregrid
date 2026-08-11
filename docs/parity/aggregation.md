# Parity — Aggregation

**Source:** https://www.ag-grid.com/angular-data-grid/aggregation/ · transcribed 2026-08-11
**Phase:** 2 · **Package:** `@libregrid/row-grouping`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `aggFuncs` | ⬜ | Map of name → function for custom aggs |
| `groupTotalRow` | ⬜ | Aggregate row within groups at a given position |
| `grandTotalRow` | ⬜ | Grand total at a given grid location |
| `suppressAggFuncInHeader` | ⬜ | Omits function name from headers |
| `aggregateOnlyChangedColumns` | ⬜ | Verify untouched columns are genuinely not recomputed |
| `suppressAggFilteredOnly` | ⬜ | Aggregations unaffected by filtering |
| `groupAggFiltering` | ⬜ | Whether filters apply to aggregated group values |
| `groupSuppressBlankHeader` | ⬜ | |
| `suppressStickyTotalRow` | ⬜ | |
| `alwaysAggregateAtRootLevel` | ⬜ | |
| `getGroupRowAgg` | ⬜ | Callback for multi-column aggregation |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `aggFunc` | ⬜ | |
| `initialAggFunc` | ⬜ | Applies only on column creation |
| `valueIndex` | ⬜ | Column order in multi-column pivot aggregation |
| `initialValueIndex` | ⬜ | |
| `enableValue` | ⬜ | Enables GUI aggregation (tool panel, Phase 3) |
| `allowedAggFuncs` | ⬜ | Restricts GUI selection per column |
| `defaultAggFunc` | ⬜ | |
| `showValuesAs` | ⬜ | PR 2.5 |
| `initialShowValuesAs` | ⬜ | PR 2.5 |
| `showValuesAsDef` | ⬜ | PR 2.5 |
| `enableShowValuesAs` | ⬜ | PR 2.5 — column-menu submenu |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `getValueColumns` | ⬜ | |
| `addValueColumns` | ⬜ | |
| `removeValueColumns` | ⬜ | |
| `setValueColumns` | ⬜ | |
| `setColumnAggFunc` | ⬜ | |
| `addAggFuncs` | ⬜ | |
| `clearAggFuncs` | ⬜ | Clears grid-provided funcs too |
| `rowNode.getAggregatedChildren(colKey)` | ⬜ | Immediate contributing children |
| `rowNode.getAggregatedChildren(colKey, true)` | ⬜ | All descendant leaves |

## Built-in Aggregation Functions

| Function | Status | Notes |
|---|---|---|
| `sum` | ⬜ | Test `[]`, all-null, mixed-null, non-numeric |
| `min` | ⬜ | |
| `max` | ⬜ | |
| `count` | ⬜ | |
| `avg` | ⬜ | Verify weighting across nested levels |
| `first` | ⬜ | |
| `last` | ⬜ | |

## Callbacks

| Callback | Status | Notes |
|---|---|---|
| `getGroupRowAgg` | ⬜ | |
