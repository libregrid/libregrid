# Parity — Column Menu

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/angular-data-grid/column-menu/ · transcribed 2026-08-11
**Phase:** 1 · **Package:** `@libregrid/menu`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option               | Status | Notes                                                                  |
| -------------------- | ------ | ---------------------------------------------------------------------- |
| `columnMenu`         | 🟡     | `'legacy' \| 'new'` — option parsed; both formats supported by factory; UI rendering for the new format is Community-owned |
| `suppressMenuHide`   | 🟡     | Option parsed; per-menu-type suppression behaviour is not yet aligned or tested |
| `getColumnMenuItems` | ✅     | Applies across all menu surfaces                                       |
| `getMainMenuItems`   | ✅     | Legacy — column menu only                                              |
| `postProcessPopup`   | 🟡     | PopupService handles; not explicitly tested                            |
| `popupParent`        | 🟡     | PopupService respects it; explicit E2E still pending                    |

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
| `showColumnFilter(colKey)` | 🟡     | Delegates to Community's MenuService; no dedicated LibreGrid coverage                                  |
| `hideColumnFilter()`       | 🟡     | Delegates to Community's MenuService; no dedicated LibreGrid coverage                                  |
| `hidePopupMenu()`          | ✅     | Shared with context menu                                                                             |

## Events

| Event                      | Status | Notes                                               |
| -------------------------- | ------ | --------------------------------------------------- |
| `columnMenuVisibleChanged` | ✅     | Fired when LibreGrid's column popup opens or closes |

## MenuItemDef

| Property        | Status | Notes                                                                                          |
| --------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `name`/`action`/`disabled`/`tooltip`/`cssClasses`/`shortcut`/`checked`/`icon` | ✅ | Rendered by the shared menu renderer with Quartz metrics, icons, and focus rings (1.1.0 UX pass) |
| `subMenu`       | ✅     | Functional nested menus with hover/click/arrow-key opening and viewport clamping                |
| `separator`     | ✅     | Preserved and rendered between item groups                                                        |
| `menuItem`      | ✅     | Custom menu item components with the full agInit/configureDefaults/setActive/select contract     |
| `menuItemParams`| ✅     | Forwarded to the custom component                                                               |

## Default Menu Items

| Item               | Owning phase | Status | Notes                                                                                                                          |
| ------------------ | ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `sortAscending`    | 1            | ✅     |                                                                                                                                |
| `sortDescending`   | 1            | ✅     |                                                                                                                                |
| `sortUnSort`       | 1            | ✅     |                                                                                                                                |
| `columnFilter`     | 1            | ✅     | Offers a `Filter` item for columns with `colDef.filter` and opens the LibreGrid filter popup (`filterPopup.ts`); tested in `filterPopup.spec.ts` |
| `columnChooser`    | 1            | ✅     | `Choose Columns` appears when `ColumnsToolPanelModule` is registered. It forwards the selected column's `columnChooserParams`. |
| `pinSubMenu`       | 1            | 🟡     | Stub registered; pin sub-menu not implemented                                                                                  |
| `autoSizeThis`     | 1            | ✅     |                                                                                                                                |
| `autoSizeAll`      | 1            | ✅     |                                                                                                                                |
| `resetColumns`     | 1            | ✅     |                                                                                                                                |
| `separator`        | 1            | ✅     |                                                                                                                                |
| `rowGroup`         | 2            | 🟡     | Functional opt-in contribution. It is not in the default item arrays.                                                          |
| `rowUnGroup`       | 2            | 🟡     | Functional opt-in contribution. It is not in the default item arrays.                                                          |
| `expandAll`        | 2            | 🟡     | Functional opt-in contribution. It is not in the default item arrays.                                                          |
| `contractAll`      | 2            | 🟡     | Functional opt-in contribution. It is not in the default item arrays.                                                          |
| `valueAggSubMenu`  | 2            | 🟡     | Functional opt-in contribution. It is not in the default item arrays.                                                          |
| `editColumnName`   | 14           | ✅     | Phase 14 (A7) — real factory registered at runtime by `@libregrid/column-header-edit` (service postConstruct); opens the inline header editor; integration-tested in `packages/column-header-edit` |
| `calculatedColumn` | 13           | 🟡     | Stub registered; calculated-column editing not implemented                                                                     |

## Behaviour

| Requirement                         | Status | Notes                                              |
| ----------------------------------- | ------ | -------------------------------------------------- |
| Opens from header menu button       | ✅     | E2E tested on a real Community grid                |
| Opens from header right-click       | ✅     | E2E tested on a real Community grid                |
| Both `'legacy'` and `'new'` formats | 🟡     | Factory supports both; UI rendering is Community's |
