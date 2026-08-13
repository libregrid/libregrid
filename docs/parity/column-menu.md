# Parity — Column Menu

**Source:** https://www.ag-grid.com/angular-data-grid/column-menu/ · transcribed 2026-08-11
**Phase:** 1 · **Package:** `@libregrid/menu`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `columnMenu` | 🟡 | `'legacy' \| 'new'` — option parsed; both formats supported by factory |
| `suppressMenuHide` | 🟡 | Default behaviour differs by menu type |
| `getColumnMenuItems` | ✅ | Applies across all menu surfaces |
| `getMainMenuItems` | ✅ | Legacy — column menu only |
| `postProcessPopup` | 🟡 | PopupService handles; not explicitly tested |
| `popupParent` | 🟡 | PopupService respects it |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `suppressHeaderMenuButton` | ✅ | Enforced by the `enterpriseMenuFactory` header integration |
| `suppressHeaderFilterButton` | 🟡 | Parsed but not enforced in UI |
| `suppressHeaderContextMenu` | 🟡 | Parsed but not enforced in UI |
| `columnMenuItems` | ✅ | Takes precedence over `mainMenuItems` |
| `mainMenuItems` | ✅ | Legacy |
| `columnChooserParams` | 🟡 | Passed to the shared chooser panel; the shipped native DOM overlay does not provide full PopupService or parameter-parity behavior. |
| `menuTabs` | 🟡 | Legacy menu format only |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `showColumnMenu(colKey)` | ✅ | Opens LibreGrid's column menu through Community's MenuService |
| `showColumnChooser()` | ✅ | Delegates to `colChooserFactory`, which opens the shared ColumnsToolPanel in a native DOM dialog when `ColumnsToolPanelModule` is registered. |
| `hideColumnChooser()` | ✅ | Delegates to the shared factory and removes its native DOM dialog. |
| `showColumnFilter(colKey)` | 🟡 | Delegates to Community's MenuService |
| `hideColumnFilter()` | 🟡 | Delegates to Community's MenuService |
| `hidePopupMenu()` | ✅ | Shared with context menu |

## Events

| Event | Status | Notes |
|---|---|---|
| `columnMenuVisibleChanged` | ✅ | Fired when LibreGrid's column popup opens or closes |

## Default Menu Items

| Item | Owning phase | Status | Notes |
|---|---|---|---|
| `sortAscending` | 1 | ✅ | |
| `sortDescending` | 1 | ✅ | |
| `sortUnSort` | 1 | ✅ | |
| `columnFilter` | 1 | 🟡 | Stub registered |
| `columnChooser` | 1 | ✅ | `Choose Columns` invokes the shared chooser API when it is available; the overlay is native DOM, not PopupService-backed. |
| `pinSubMenu` | 1 | 🟡 | Stub registered |
| `autoSizeThis` | 1 | ✅ | |
| `autoSizeAll` | 1 | ✅ | |
| `resetColumns` | 1 | ✅ | |
| `separator` | 1 | ✅ | |
| `rowGroup` | 2 | 🟡 | Stub registered |
| `rowUnGroup` | 2 | 🟡 | Stub registered |
| `expandAll` | 2 | 🟡 | Stub registered |
| `contractAll` | 2 | 🟡 | Stub registered |
| `valueAggSubMenu` | 2 | 🟡 | Stub registered |
| `editColumnName` | 13 | 🟡 | Stub registered |
| `calculatedColumn` | 13 | 🟡 | Stub registered |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Opens from header menu button | ✅ | E2E tested on a real Community grid |
| Opens from header right-click | ✅ | E2E tested on a real Community grid |
| Both `'legacy'` and `'new'` formats | 🟡 | Factory supports both; UI rendering is Community's |
