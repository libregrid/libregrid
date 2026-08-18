# Parity — Columns Tool Panel

**Source:** https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ · transcribed 2026-08-11
**Phase:** 3 · **Package:** `@libregrid/columns-tool-panel`
**Legend:** ✅ done+tested · 🟡 partial or deferred (gap noted) · ❌ not shipped (rationale noted)

## ColumnsToolPanelParams

| Property                     | Status | Notes                                                                                                                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `suppressColumnMove`         | ✅     | Removes native and CDK drag sources. This disables drag reorder and drag into Row Groups or Values. The labelled function buttons remain.                                             |
| `suppressRowGroups`          | ✅     | Hides the Row Groups section.                                                                                                                                                         |
| `suppressValues`             | ✅     | Hides the Values section.                                                                                                                                                             |
| `suppressPivots`             | ✅     | Hides the inert Column Labels (Pivot) section.                                                                                                                                        |
| `suppressPivotMode`          | ✅     | Hides the inert Pivot Mode section.                                                                                                                                                   |
| `suppressColumnFilter`       | ✅     | Hides the column search box.                                                                                                                                    |
| `suppressColumnSelectAll`    | ✅     | Hides the header select-all checkbox.                                                                                                                     |
| `suppressColumnExpandAll`    | ✅     | Hides the labelled expand-all and collapse-all controls.                                                                                                                              |
| `contractColumnSelection`    | ✅     | Column groups start collapsed.                                                                                                                                                        |
| `suppressSyncLayoutWithGrid` | ✅     | `syncLayoutWithGrid()` retains a custom layout when set.                                                                                                      |
| `buttons`                    | ✅     | `apply` enables deferred mode. `cancel` appears only with `apply`. Visibility and pinning defer. Group and value changes defer when their setter APIs exist. Reorder stays immediate. |

## ColDef Properties

| Property                   | Status | Notes                                                                               |
| -------------------------- | ------ | ----------------------------------------------------------------------------------- |
| `suppressColumnsToolPanel` | ✅     | Excluded from the tree and flat column list.                                        |
| `enableRowGroup`           | ✅     | Gates row-group buttons and native drops.                                           |
| `enablePivot`              | 🟡     | Pivot is deliberately inert until Phase 8; the panel does not offer pivot mutation. |
| `enableValue`              | ✅     | Gates Values buttons and native drops.                                              |
| `toolPanelClass`           | ✅     | String, string-array, and callback forms are applied to leaf rows.                  |
| `columnMenuItems`          | ✅     | Supported by the shared `@libregrid/menu` column-menu integration.                  |

## Grid Options

| Option                            | Status | Notes                                                                                                                           |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `functionsReadOnly`               | ✅     | Prevents row-group/value mutations in the panel and header row-group zone; pivot has no mutation UI.                            |
| `allowDragFromColumnsToolPanel`   | ❌     | The option is not read. Drag into the column-header area is not implemented, and the option does not block existing drag paths. |
| `dragAndDropImageComponent`       | ❌     | Native fallback and Material CDK drag are provided; custom drag-image components are not implemented.                           |
| `dragAndDropImageComponentParams` | ❌     | No custom drag-image component is implemented.                                                                                  |
| `rowGroupPanelShow`               | ✅     | `RowGroupingPanelModule` renders the header row-group zone for `always` and `onlyWhenGrouping`.                                 |
| `rowGroupPanelSuppressSort`       | ❌     | The option is not read. The standalone row-group panel does not provide sort indicators or sort actions.                        |

## IColumnToolPanel API

| Method                                | Status | Notes                                                                                                                              |
| ------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `setPivotModeSectionVisible(visible)` | ✅     | Shows or hides the inert Pivot Mode section.                                                                                     |
| `setRowGroupsSectionVisible(visible)` | ✅     | Shows or hides the functional Row Groups section.                                                                                  |
| `setValuesSectionVisible(visible)`    | ✅     | Shows or hides the functional Values section.                                                                                      |
| `setPivotSectionVisible(visible)`     | ✅     | Shows or hides the inert Column Labels (Pivot) section.                                                                            |
| `expandColumnGroups(groupIds?)`       | ✅     | Expands specified groups, or all groups.                                                                                           |
| `collapseColumnGroups(groupIds?)`     | ✅     | Collapses specified groups, or all groups.                                                                                         |
| `setColumnLayout(colDefs)`            | ✅     | Renders the supplied flat or grouped layout order.                                                                                 |
| `syncLayoutWithGrid()`                | ✅     | Clears a custom panel layout unless `suppressSyncLayoutWithGrid` is true.                                                          |
| `getState()`                          | ✅     | Returns expansion state and consumes `initialState.expandedGroupIds`. Side-bar state owns persistence.                             |

## Behaviour

| Requirement                                       | Status | Notes                                                                                                                                                    |
| ------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drag into Row Groups zone regroups the grid       | ✅     | Native HTML drop, labelled buttons, and column-header drags (via grid DragAndDropService drop targets) add eligible row-group columns through the public API. |
| Drag into Values zone applies aggregation         | ✅     | Native HTML drop and labelled buttons add eligible value columns through the public API.                                                                 |
| Pivot zone + pivot-mode toggle                    | ✅     | Pivot Mode toggle and Column Labels drop zone accept native/header/CDK drops; `enablePivot` gates eligibility.                                           |
| Header drag into standalone/toolbar drop zones    | ✅     | Zones self-register; `DropZoneDragTargetService` bridges them into `beans.dragAndDrop` for `HeaderCell` sources. Embedded toolbar zones get unique aria-labels. |
| Panel↔grid column state round-trip                | ✅     | Visibility, pinning, and movement use public APIs; grid events refresh the panel. Apply/Cancel defers visibility and pinning when configured.            |
| Column search/filter box                          | ✅     | Filters column labels and group names, expanding matching groups.                                                                                        |
| Indeterminate checkbox for mixed group visibility | ✅     | Group checkbox reflects mixed leaf visibility and toggles all leaves.                                                                                    |
| **Keyboard alternative to drag-drop**             | ✅     | Labelled move, group, value, remove, and reorder buttons provide the alternative. `@libregrid/material` maps CDK drops back to these same actions.       |
| Material drag-drop adapter                        | ✅     | Programmatic CDK `DragRef`/`DropListRef` instances decorate the neutral panel for reorder and Row Groups/Values/Pivot drops, and bridge into toolbar/header drop zones via the shared zone registry. |
| Column chooser shared with the Phase 1 menu item  | ✅     | `showColumnChooser()` and the `columnChooser` menu item use one `ColumnsToolPanel` implementation in a native DOM overlay.                               |
| Column chooser parameters                         | ✅     | Supports chooser layout and suppression parameters. The menu item forwards the selected column's `columnChooserParams`.                                  |
| Column chooser reduced sections                   | ✅     | The chooser always hides Row Groups, Values, Pivot Mode, and Column Labels.                                                                              |
| Standalone row-group panel                        | ✅     | Supports `always`, `onlyWhenGrouping`, remove, reorder, native drop, header drag, and `functionsReadOnly`.                                               |
| Cleanup                                           | ✅     | Side-bar, drag-adapter, and grid-listener cleanup are tested.                                                                    |
| Native fallback                                   | ✅     | Native HTML drag supports internal reorder and Row Groups or Values drops when no UI adapter is active.                                                  |
| Search-scoped visibility actions                  | ✅     | The header select-all checkbox (indeterminate when mixed) applies to the current column-label or group-label search result.                                                                   |
| Pinning controls                                  | ✅     | Leaf rows expose pin-left, pin-right, and unpin actions through the public Grid API.                                                                     |
| Deferred external synchronization                 | ✅     | Grid events refresh deferred snapshots before a later Apply action.                                                                                      |
| Reorder existing Row Groups and Values members    | 🟡     | The main panel can add or remove members but cannot reorder them. The standalone row-group panel can reorder row groups.                                 |
| Tool-panel state restore                          | ✅     | `initialState.expandedGroupIds` restores panel expansion; the Side Bar owns persistence.                                            |
