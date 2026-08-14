# Parity — Column Menu

**Source:** https://www.ag-grid.com/angular-data-grid/column-menu/ · transcribed 2026-08-11
**Phase:** 1 · **Package:** `@libregrid/menu`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option               | Status | Notes                                                                  |
| -------------------- | ------ | ---------------------------------------------------------------------- |
| `columnMenu`         | 🟡     | `'legacy' \| 'new'` — option parsed; both formats supported by factory |
| `suppressMenuHide`   | 🟡     | Default behaviour differs by menu type                                 |
| `getColumnMenuItems` | ✅     | Applies across all menu surfaces                                       |
| `getMainMenuItems`   | ✅     | Legacy — column menu only                                              |
| `postProcessPopup`   | 🟡     | PopupService handles; not explicitly tested                            |
| `popupParent`        | 🟡     | PopupService respects it                                               |

## ColDef Properties

| Property                     | Status | Notes                                                                                                                                       |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `suppressHeaderMenuButton`   | ✅     | Enforced by the `enterpriseMenuFactory` header integration                                                                                  |
| `suppressHeaderFilterButton` | ✅     | Enforced before opening the header filter popup                                                                                           |
| `suppressHeaderContextMenu`  | ✅     | Enforced before opening a header context menu                                                                                              |
| `columnMenuItems`            | ✅     | Takes precedence over `mainMenuItems`                                                                                                       |
| `mainMenuItems`              | ✅     | Legacy                                                                                                                                      |
| `columnChooserParams`        | 🟡     | Passed to the shared chooser panel. The supported layout and suppression parameters work. The native DOM overlay does not use PopupService. |
| `menuTabs`                   | 🟡     | Legacy menu format only                                                                                                                     |

## API Methods

| Method                     | Status | Notes                                                                                                |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `showColumnMenu(colKey)`   | ✅     | Opens LibreGrid's column menu through Community's MenuService                                        |
| `showColumnChooser()`      | ✅     | `ColumnsToolPanelModule` owns this API and opens the shared ColumnsToolPanel in a native DOM dialog. |
| `hideColumnChooser()`      | ✅     | `ColumnsToolPanelModule` owns this API and removes the shared native DOM dialog.                     |
| `showColumnFilter(colKey)` | 🟡     | Delegates to Community's MenuService                                                                 |
| `hideColumnFilter()`       | 🟡     | Delegates to Community's MenuService                                                                 |
| `hidePopupMenu()`          | ✅     | Shared with context menu                                                                             |

## Events

| Event                      | Status | Notes                                               |
| -------------------------- | ------ | --------------------------------------------------- |
| `columnMenuVisibleChanged` | ✅     | Fired when LibreGrid's column popup opens or closes |

## Default Menu Items

| Item               | Owning phase | Status | Notes                                                                                                                          |
| ------------------ | ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `sortAscending`    | 1            | ✅     |                                                                                                                                |
| `sortDescending`   | 1            | ✅     |                                                                                                                                |
| `sortUnSort`       | 1            | ✅     |                                                                                                                                |
| `columnFilter`     | 1            | 🟡     | Stub registered                                                                                                                |
| `columnChooser`    | 1            | ✅     | `Choose Columns` appears when `ColumnsToolPanelModule` is registered. It forwards the selected column's `columnChooserParams`. |
| `pinSubMenu`       | 1            | 🟡     | Stub registered                                                                                                                |
| `autoSizeThis`     | 1            | ✅     |                                                                                                                                |
| `autoSizeAll`      | 1            | ✅     |                                                                                                                                |
| `resetColumns`     | 1            | ✅     |                                                                                                                                |
| `separator`        | 1            | ✅     |                                                                                                                                |
| `rowGroup`         | 2            | 🟡     | Functional opt-in contribution. It is not in the default item arrays.                                                          |
| `rowUnGroup`       | 2            | 🟡     | Functional opt-in contribution. It is not in the default item arrays.                                                          |
| `expandAll`        | 2            | 🟡     | Functional opt-in contribution. It is not in the default item arrays.                                                          |
| `contractAll`      | 2            | 🟡     | Functional opt-in contribution. It is not in the default item arrays.                                                          |
| `valueAggSubMenu`  | 2            | 🟡     | Functional opt-in contribution. It is not in the default item arrays.                                                          |
| `editColumnName`   | 13           | 🟡     | Stub registered                                                                                                                |
| `calculatedColumn` | 13           | 🟡     | Stub registered                                                                                                                |

## Behaviour

| Requirement                         | Status | Notes                                              |
| ----------------------------------- | ------ | -------------------------------------------------- |
| Opens from header menu button       | ✅     | E2E tested on a real Community grid                |
| Opens from header right-click       | ✅     | E2E tested on a real Community grid                |
| Both `'legacy'` and `'new'` formats | 🟡     | Factory supports both; UI rendering is Community's |
