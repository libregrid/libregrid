# Parity — Column Menu

**Source:** https://www.ag-grid.com/angular-data-grid/column-menu/ · transcribed 2026-08-11
**Phase:** 1 · **Package:** `@libregrid/menu`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `columnMenu` | ⬜ | `'legacy' \| 'new'` — default differs by version |
| `suppressMenuHide` | ⬜ | Default behaviour differs by menu type |
| `getColumnMenuItems` | ⬜ | Applies across all menu surfaces |
| `getMainMenuItems` | ⬜ | Legacy — column menu only |
| `postProcessPopup` | ⬜ | Reposition after creation |
| `popupParent` | ⬜ | |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `suppressHeaderMenuButton` | ⬜ | |
| `suppressHeaderFilterButton` | ⬜ | |
| `suppressHeaderContextMenu` | ⬜ | |
| `columnMenuItems` | ⬜ | Takes precedence over `mainMenuItems` |
| `mainMenuItems` | ⬜ | Legacy |
| `columnChooserParams` | ⬜ | |
| `menuTabs` | ⬜ | Legacy menu format only |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `showColumnMenu(colKey)` | ⬜ | |
| `showColumnChooser()` | ⬜ | Shared with Phase 3 tool panel |
| `hideColumnChooser()` | ⬜ | |
| `showColumnFilter(colKey)` | ⬜ | |
| `hideColumnFilter()` | ⬜ | |
| `hidePopupMenu()` | ⬜ | Shared with context menu |

## Events

| Event | Status | Notes |
|---|---|---|
| `columnMenuVisibleChanged` | ⬜ | |

## Default Menu Items

| Item | Owning phase | Status | Notes |
|---|---|---|---|
| `sortAscending` | 1 | ⬜ | |
| `sortDescending` | 1 | ⬜ | |
| `sortUnSort` | 1 | ⬜ | |
| `columnFilter` | 1 | ⬜ | |
| `columnChooser` | 1 | ⬜ | |
| `pinSubMenu` | 1 | ⬜ | |
| `autoSizeThis` | 1 | ⬜ | |
| `autoSizeAll` | 1 | ⬜ | |
| `resetColumns` | 1 | ⬜ | |
| `separator` | 1 | ⬜ | |
| `rowGroup` | 2 | ⬜ | |
| `rowUnGroup` | 2 | ⬜ | |
| `expandAll` | 2 | ⬜ | |
| `contractAll` | 2 | ⬜ | |
| `valueAggSubMenu` | 2 | ⬜ | |
| `editColumnName` | 13 | ⬜ | Optional |
| `calculatedColumn` | 13 | ⬜ | Optional |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Opens from header menu button | ⬜ | |
| Opens from header right-click | ⬜ | Unless `suppressHeaderContextMenu` |
| Both `'legacy'` and `'new'` formats | ⬜ | Or document `'legacy'` as ❌ with rationale |
