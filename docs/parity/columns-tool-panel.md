# Parity — Columns Tool Panel

**Source:** https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ · transcribed 2026-08-11
**Phase:** 3 · **Package:** `@libregrid/columns-tool-panel`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## ColumnsToolPanelParams

| Property | Status | Notes |
|---|---|---|
| `suppressColumnMove` | ⬜ | |
| `suppressRowGroups` | ⬜ | |
| `suppressValues` | ⬜ | |
| `suppressPivots` | ⬜ | Column Labels section |
| `suppressPivotMode` | ⬜ | |
| `suppressColumnFilter` | ⬜ | |
| `suppressColumnSelectAll` | ⬜ | |
| `suppressColumnExpandAll` | ⬜ | |
| `contractColumnSelection` | ⬜ | Groups start contracted |
| `suppressSyncLayoutWithGrid` | ⬜ | |
| `buttons` | ⬜ | `ColumnToolPanelAction[]` at panel bottom |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `suppressColumnsToolPanel` | ⬜ | |
| `enableRowGroup` | ⬜ | Drag to Row Groups |
| `enablePivot` | ⬜ | Drag to Column Labels |
| `enableValue` | ⬜ | Drag to Values |
| `toolPanelClass` | ⬜ | `string \| string[] \| function` |
| `columnMenuItems` | ⬜ | Shared with `@libregrid/menu` |

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `functionsReadOnly` | ⬜ | Blocks GUI changes to grouping/pivot/agg |
| `allowDragFromColumnsToolPanel` | ⬜ | |
| `dragAndDropImageComponent` | ⬜ | |
| `dragAndDropImageComponentParams` | ⬜ | |
| `rowGroupPanelShow` | ⬜ | Standalone row-group panel |

## IColumnToolPanel API

| Method | Status | Notes |
|---|---|---|
| `setPivotModeSectionVisible(visible)` | ⬜ | |
| `setRowGroupsSectionVisible(visible)` | ⬜ | |
| `setValuesSectionVisible(visible)` | ⬜ | |
| `setPivotSectionVisible(visible)` | ⬜ | |
| `expandColumnGroups(groupIds?)` | ⬜ | |
| `collapseColumnGroups(groupIds?)` | ⬜ | |
| `setColumnLayout(colDefs)` | ⬜ | |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Drag into Row Groups zone regroups the grid | ⬜ | |
| Drag into Values zone applies aggregation | ⬜ | |
| Pivot zone + pivot-mode toggle | ⬜ | Inert until Phase 8 |
| Panel↔grid column state round-trip | ⬜ | Reorder, visibility, pinning |
| Column search/filter box | ⬜ | |
| Indeterminate checkbox for mixed group visibility | ⬜ | |
| **Keyboard alternative to drag-drop** | ⬜ | CDK supports this — implement it |
| Column chooser shared with the Phase 1 menu item | ⬜ | One implementation, not two |
