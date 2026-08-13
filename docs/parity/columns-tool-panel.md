# Parity — Columns Tool Panel

**Source:** https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ · transcribed 2026-08-11
**Phase:** 3 · **Package:** `@libregrid/columns-tool-panel`
**Legend:** ✅ done+tested · 🟡 partial or deferred (gap noted) · ❌ not shipped (rationale noted)

## ColumnsToolPanelParams

| Property | Status | Notes |
|---|---|---|
| `suppressColumnMove` | ✅ | Removes native and CDK drag/reorder controls. |
| `suppressRowGroups` | ✅ | Hides the Row Groups section. |
| `suppressValues` | ✅ | Hides the Values section. |
| `suppressPivots` | ✅ | Hides the inert Column Labels (Pivot) section. |
| `suppressPivotMode` | ✅ | Hides the inert Pivot Mode section. |
| `suppressColumnFilter` | ✅ | Hides the column search box. |
| `suppressColumnSelectAll` | ✅ | Hides Select all and Unselect all controls. |
| `suppressColumnExpandAll` | ✅ | Hides the labelled expand-all and collapse-all controls. |
| `contractColumnSelection` | ✅ | Column groups start collapsed. |
| `suppressSyncLayoutWithGrid` | 🟡 | `syncLayoutWithGrid()` retains a custom layout when set; no broader panel/grid-layout parity is implemented. |
| `buttons` | ✅ | `apply` and `cancel` defer and either commit or discard visibility, pinning, grouping, and value changes. |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `suppressColumnsToolPanel` | ✅ | Excluded from the tree and flat column list. |
| `enableRowGroup` | ✅ | Gates row-group buttons and native drops. |
| `enablePivot` | 🟡 | Pivot is deliberately inert until Phase 8; the panel does not offer pivot mutation. |
| `enableValue` | ✅ | Gates Values buttons and native drops. |
| `toolPanelClass` | ✅ | String, string-array, and callback forms are applied to leaf rows. |
| `columnMenuItems` | ✅ | Supported by the shared `@libregrid/menu` column-menu integration. |

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `functionsReadOnly` | ✅ | Prevents row-group/value mutations in the panel and header row-group zone; pivot has no mutation UI. |
| `allowDragFromColumnsToolPanel` | 🟡 | Panel-to-grid-header dragging is not implemented. Internal reorder and Row Groups/Values drops remain available because they do not leave the tool panel. |
| `dragAndDropImageComponent` | ❌ | Native fallback and Material CDK drag are provided; custom drag-image components are not implemented. |
| `dragAndDropImageComponentParams` | ❌ | No custom drag-image component is implemented. |
| `rowGroupPanelShow` | ✅ | `RowGroupingPanelModule` renders the header row-group zone for `always` and `onlyWhenGrouping`. |

## IColumnToolPanel API

| Method | Status | Notes |
|---|---|---|
| `setPivotModeSectionVisible(visible)` | ✅ | Shows or hides the inert Pivot Mode section. |
| `setRowGroupsSectionVisible(visible)` | ✅ | Shows or hides the functional Row Groups section. |
| `setValuesSectionVisible(visible)` | ✅ | Shows or hides the functional Values section. |
| `setPivotSectionVisible(visible)` | ✅ | Shows or hides the inert Column Labels (Pivot) section. |
| `expandColumnGroups(groupIds?)` | ✅ | Expands specified groups, or all groups. |
| `collapseColumnGroups(groupIds?)` | ✅ | Collapses specified groups, or all groups. |
| `setColumnLayout(colDefs)` | ✅ | Renders the supplied flat or grouped layout order. |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Drag into Row Groups zone regroups the grid | ✅ | Native HTML drop and labelled buttons add eligible row-group columns through the public API. |
| Drag into Values zone applies aggregation | ✅ | Native HTML drop and labelled buttons add eligible value columns through the public API. |
| Pivot zone + pivot-mode toggle | 🟡 | Both sections are visible but explicitly inert and labelled “Available in Phase 8”; no pivot behavior is shipped. |
| Panel↔grid column state round-trip | ✅ | Visibility, pinning, and movement use public APIs; grid events refresh the panel. Apply/Cancel defers visibility and pinning when configured. |
| Column search/filter box | ✅ | Filters column labels and group names, expanding matching groups. |
| Indeterminate checkbox for mixed group visibility | ✅ | Group checkbox reflects mixed leaf visibility and toggles all leaves. |
| **Keyboard alternative to drag-drop** | ✅ | Labelled move, group, value, remove, and reorder buttons provide the alternative. `@libregrid/material` maps CDK drops back to these same actions. |
| Material drag-drop adapter | ✅ | Programmatic CDK `DragRef`/`DropListRef` instances decorate the neutral panel for reorder and Row Groups/Values drops without duplicating panel state. |
| Column chooser shared with the Phase 1 menu item | ✅ | `showColumnChooser()` and the `columnChooser` menu item use one `ColumnsToolPanel` implementation in a native DOM overlay. |
