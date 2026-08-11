# Parity — Context Menu

**Source:** https://www.ag-grid.com/angular-data-grid/context-menu/ · transcribed 2026-08-11
**Phase:** 1 · **Package:** `@libregrid/menu`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `contextMenuItems` | ⬜ | |
| `getContextMenuItems` | ⬜ | Receives default items |
| `suppressContextMenu` | ⬜ | Must not suppress the browser menu |
| `allowContextMenuWithControlKey` | ⬜ | macOS Ctrl+click |
| `popupParent` | ⬜ | Render outside the grid without clipping |
| `cellSelection` | ⬜ | Phase 4 |
| `enableCharts` | ⬜ | Phase 12 |

## Callbacks

| Callback | Status | Notes |
|---|---|---|
| `getContextMenuItems(params)` | ⬜ | Returning `[]` yields no menu |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `showContextMenu()` | ⬜ | |
| `hidePopupMenu()` | ⬜ | Shared with column menu |

## MenuItemDef

| Property | Status | Notes |
|---|---|---|
| `name` | ⬜ | |
| `action` | ⬜ | |
| `cssClasses` | ⬜ | Use `lgr-` prefix (G4) |
| `disabled` | ⬜ | |
| `tooltip` | ⬜ | |
| `subMenu` | ⬜ | Nested items |
| `icon` | ⬜ | |
| `shortcut` | ⬜ | Display only |
| `checked` | ⬜ | |

## Default Menu Items

| Item | Owning phase | Status | Notes |
|---|---|---|---|
| `separator` | 1 | ⬜ | |
| `autoSizeAll` | 1 | ⬜ | |
| `resetColumns` | 1 | ⬜ | |
| `pinRowSubMenu` | 1 | ⬜ | |
| `pinTop` | 1 | ⬜ | |
| `pinBottom` | 1 | ⬜ | |
| `unpinRow` | 1 | ⬜ | |
| `expandAll` | 2 | ⬜ | |
| `contractAll` | 2 | ⬜ | |
| `copy` | 4 | ⬜ | |
| `copyWithHeaders` | 4 | ⬜ | |
| `copyWithGroupHeaders` | 4 | ⬜ | |
| `cut` | 4 | ⬜ | |
| `paste` | 4 | ⬜ | |
| `export` | 5 | ⬜ | |
| `csvExport` | 5 | ⬜ | Community provides CSV |
| `excelExport` | 5 | ⬜ | |
| `chartRange` | 12 | ⬜ | |
| `pivotChart` | 12 | ⬜ | |
| `note` | 13 | ⬜ | Optional |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| **Extensible registry** — later phases contribute without editing this package | ⬜ | **Key design requirement** |
| Keyboard navigation (arrows, Enter, Escape) | ⬜ | |
| Focus returns to trigger on close | ⬜ | |
