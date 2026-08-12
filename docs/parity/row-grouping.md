# Parity — Row Grouping

**Source:** https://www.ag-grid.com/angular-data-grid/grouping/ · transcribed 2026-08-11
**Phase:** 2 · **Package:** `@libregrid/row-grouping`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `groupDisplayType` | ⬜ | |
| `autoGroupColumnDef` | ⬜ | |
| `groupRowRenderer` | ⬜ | |
| `groupRowRendererParams` | ⬜ | |
| `showOpenedGroup` | ⬜ | |
| `groupHideOpenParents` | ⬜ | Interacts with `showOpenedGroup` |
| `groupHideColumnsUntilExpanded` | ⬜ | |
| `groupHideParentOfSingleChild` | ⬜ | |
| `initialGroupOrderComparator` | ⬜ | |
| `groupAllowUnbalanced` | ⬜ | |
| `groupMaintainOrder` | ⬜ | |
| `groupDefaultExpanded` | ✅ | PR 2.2 — `-1`/number levels honoured at tree creation |
| `isGroupOpenByDefault` | ⬜ | |
| `suppressGroupRowsSticky` | ⬜ | |
| `rowGroupPanelShow` | ⬜ | Row-group panel built in PR 2.5 |
| `rowGroupPanelSuppressSort` | ⬜ | |
| `pivotPanelSuppressSort` | ⬜ | Pivot panel arrives Phase 8 |
| `groupLockGroupColumns` | ⬜ | |
| `groupHierarchyConfig` | ⬜ | |
| `suppressDragLeaveHidesColumns` | ⬜ | |
| `suppressGroupChangesColumnVisibility` | ⬜ | |
| `ssrmExpandAllAffectsAllRows` | ⬜ | SSRM semantics — Phase 9 |
| `refreshAfterGroupEdit` | ⬜ | |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `rowGroup` | ✅ | PR 2.1 — GroupStage creates group rows |
| `enableRowGroup` | ⬜ | Enables GUI grouping (tool panel, Phase 3) |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `expandAll` | ⬜ | PR 2.4 |
| `collapseAll` | ⬜ | PR 2.4 |
| `setRowGroupColumns` | ✅ | PR 2.2 — via `rowGroupColsSvc` |
| `addRowGroupColumns` | ✅ | |
| `removeRowGroupColumns` | ✅ | |
| `getRowGroupColumns` | ✅ | |
| `moveRowGroupColumn` | ✅ | |

## Callbacks

| Callback | Status | Notes |
|---|---|---|
| `initialGroupOrderComparator` | ⬜ | |
| `isGroupOpenByDefault` | ⬜ | |

## Events

| Event | Status | Notes |
|---|---|---|
| `rowGroupOpened` | ⬜ | |
| `expandOrCollapseAll` | ⬜ | |
| `columnRowGroupChanged` | ⬜ | |

> The docs page did not enumerate API methods or events. The entries above are the expected surface — **verify against the live docs and the `_RowGroupingGridApi` type when working Phase 2**, and add anything missing.
