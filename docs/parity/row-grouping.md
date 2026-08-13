# Parity — Row Grouping

**Source:** https://www.ag-grid.com/angular-data-grid/grouping/ · transcribed 2026-08-11
**Phase:** 2 · **Package:** `@libregrid/row-grouping`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `groupDisplayType` | 🟡 | PR 2.3 — only `'singleColumn'` (the default) is implemented; `'multipleColumns'`, `'groupRows'` and `'custom'` are not read at all |
| `autoGroupColumnDef` | ✅ | PR 2.3 — merged into the generated colDef by `AutoGenColsService`; `colId`/`showRowGroup` stay non-overridable |
| `groupRowRenderer` | ❌ | Only meaningful for `groupDisplayType: 'groupRows'` (full-width group rows), which isn't implemented — won't-do until that mode lands |
| `groupRowRendererParams` | ❌ | Same as `groupRowRenderer` |
| `showOpenedGroup` | ✅ | PR 2.3 — `ShowRowGroupColsValueService.getDisplayedNode` walks a leaf row up to its nearest group ancestor; integration-tested |
| `groupHideOpenParents` | 🟡 | PR 2.3 — `FlattenStage` hides an expanded group's own row and `ShowRowGroupColsValueService` substitutes its value onto the first child; only **one** hidden-ancestor level is substituted — a chain of 2+ consecutively-expanded hidden ancestors collapses onto one row but only the nearest one's value shows |
| `groupHideColumnsUntilExpanded` | ⬜ | Needs per-row column suppression across the whole row, not just the auto column — deferred |
| `groupHideParentOfSingleChild` | ✅ | PR 2.3 — `FlattenStage.resolveDisplayNode` elides a group whose only child is itself (or, for `'leafGroupsOnly'`, whose only child is a leaf); integration-tested |
| `initialGroupOrderComparator` | ⬜ | |
| `groupAllowUnbalanced` | ✅ | PR 2.3 — `GroupStage` attaches a row with a `null`/`undefined`/`''` value at a level directly under the parent instead of a `(Blanks)` bucket; integration-tested |
| `groupMaintainOrder` | ⬜ | Needs order tracking across `refreshModel` calls (the tree is rebuilt from scratch each time) — deferred |
| `groupDefaultExpanded` | ✅ | PR 2.2 — `-1`/number levels honoured at tree creation |
| `isGroupOpenByDefault` | ⬜ | |
| `suppressGroupRowsSticky` | ⬜ | Sticky group rows aren't implemented yet (PR 2.4) |
| `rowGroupPanelShow` | ⬜ | Row-group panel built in PR 2.5 |
| `rowGroupPanelSuppressSort` | ⬜ | |
| `pivotPanelSuppressSort` | ⬜ | Pivot panel arrives Phase 8 |
| `groupLockGroupColumns` | ⬜ | Column drag-lock pairs naturally with Phase 3's drag-and-drop tool panel — deferred |
| `groupHierarchyConfig` | ⬜ | |
| `suppressDragLeaveHidesColumns` | ⬜ | |
| `suppressGroupChangesColumnVisibility` | ⬜ | Suppresses a column-auto-hide-on-grouping behaviour we haven't implemented yet |
| `ssrmExpandAllAffectsAllRows` | ⬜ | SSRM semantics — Phase 9 |
| `refreshAfterGroupEdit` | ⬜ | |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `rowGroup` | ✅ | PR 2.1 — GroupStage creates group rows |
| `enableRowGroup` | ⬜ | Enables GUI grouping (tool panel, Phase 3) |

## Auto Group Column (PR 2.3)

| Item | Status | Notes |
|---|---|---|
| `autoColSvc` bean | ✅ | `AutoGenColsService` — generates the single auto-group `AgColumn` (`ColKind: 'auto-group'`) that `ColumnModel.refreshCols` splices in; reacts to `columnRowGroupChanged` |
| `showRowGroupCols` bean | ✅ | `ShowRowGroupColsService` — stamps `AgColumn.showRowGroupCol`; `interleaveSortedColumns`/`fillCoupledSortIndexMap`/`isGroupSortMixed` are minimal identity defaults pending the row-group-panel coupled-sort UI (PR 2.5) |
| `showRowGroupColValueSvc` bean | ✅ | `ShowRowGroupColsValueService` — the actual seam Community's `ValueService.getValueForDisplay` routes group-column values through |
| `expansionSvc` bean | ✅ | `ExpansionService` — `RowNode.setExpanded`/`.expanded`/`.isExpandable()` all delegate here; without it `setExpanded` is a silent no-op. `expandAll`/`resetExpansion`/`getExpansionState`/`setExpansionState` are minimal defaults — PR 2.4 owns the public `expandAll`/`collapseAll` API and full expansion-state persistence, and state persistence here depends on `RowNode.id`, which `GroupStage` does not yet stamp on group nodes |
| `agGroupCellRenderer` | ✅ | `GroupCellRenderer` — expand/collapse chevron (click, double-click unless `suppressDoubleClickExpand`, Enter unless `suppressEnterExpand`), value, child count (unless `suppressCount`), indentation (unless `suppressPadding`), `aria-expanded` |
| `GROUP_AUTO_COLUMN_ID` | ✅ | Community's literal (`'ag-Grid-AutoColumn'`) reused verbatim — required for interoperability, not invented |
| `cellRendererParams.innerRenderer` / `innerRendererParams` / `innerRendererSelector` | ⬜ | Not implemented |
| `cellRendererParams.checkbox` | ❌ | Deprecated upstream since v33 in favour of `rowSelection.checkboxLocation` — won't-do |
| `cellRendererParams.totalValueGetter` | ⬜ | Total/footer rows are PR 2.4 |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `expandAll` | ⬜ | PR 2.4 — `expansionSvc.expandAll`/`resetExpansion` exist as the underlying mechanism, not yet exposed as a public API function |
| `collapseAll` | ⬜ | PR 2.4 |
| `setRowGroupColumns` | ✅ | PR 2.2 — via `rowGroupColsSvc` |
| `addRowGroupColumns` | ✅ | |
| `removeRowGroupColumns` | ✅ | |
| `getRowGroupColumns` | ✅ | |
| `moveRowGroupColumn` | ✅ | |
| `getCellValue` (auto group column) | ✅ | PR 2.3 — routes through `showRowGroupColValueSvc`; integration-tested |

## Callbacks

| Callback | Status | Notes |
|---|---|---|
| `initialGroupOrderComparator` | ⬜ | |
| `isGroupOpenByDefault` | ⬜ | |

## Events

| Event | Status | Notes |
|---|---|---|
| `rowGroupOpened` | ⬜ | `expandedChanged` fires on the `RowNode` itself (consumed by `GroupCellRenderer`); the grid-level `rowGroupOpened` event is not yet dispatched |
| `expandOrCollapseAll` | ⬜ | PR 2.4 |
| `columnRowGroupChanged` | ✅ | Dispatched by `RowGroupColsService.dispatchColChange`; `AutoGenColsService` and `ShowRowGroupColsService` both react to it |

> The docs page did not enumerate API methods or events. The entries above are the expected surface — **verify against the live docs and the `_RowGroupingGridApi` type when working Phase 2**, and add anything missing.
