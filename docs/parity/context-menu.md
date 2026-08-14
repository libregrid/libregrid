# Parity — Context Menu

**Source:** https://www.ag-grid.com/angular-data-grid/context-menu/ · transcribed 2026-08-11
**Phase:** 1 · **Package:** `@libregrid/menu`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option                           | Status | Notes                                                         |
| -------------------------------- | ------ | ------------------------------------------------------------- |
| `contextMenuItems`               | ✅     | Grid-level item list is supported after the callback override |
| `getContextMenuItems`            | 🟡     | Wired; receives default items                                 |
| `suppressContextMenu`            | ✅     | Suppresses ours, not the browser's; E2E tested                |
| `allowContextMenuWithControlKey` | ✅     | Ctrl+click path E2E tested                                    |
| `popupParent`                    | 🟡     | PopupService respects it; explicit E2E still pending          |
| `cellSelection`                  | ⬜     | Phase 4                                                       |
| `enableCharts`                   | ⬜     | Phase 12                                                      |

## Callbacks

| Callback                      | Status | Notes                                                     |
| ----------------------------- | ------ | --------------------------------------------------------- |
| `getContextMenuItems(params)` | 🟡     | Returning `[]` yields no menu; explicit E2E still pending |

## API Methods

| Method              | Status | Notes                   |
| ------------------- | ------ | ----------------------- |
| `showContextMenu()` | ✅     |                         |
| `hidePopupMenu()`   | ✅     | Shared with column menu |

## MenuItemDef

| Property     | Status | Notes                                                               |
| ------------ | ------ | ------------------------------------------------------------------- |
| `name`       | ✅     |                                                                     |
| `action`     | ✅     |                                                                     |
| `cssClasses` | ✅     | Use `lgr-` prefix (G4)                                              |
| `disabled`   | ✅     |                                                                     |
| `tooltip`    | ✅     |                                                                     |
| `subMenu`    | ✅     | Nested Material menu items open and invoke registered child actions |
| `icon`       | ✅     |                                                                     |
| `shortcut`   | ✅     | Display only                                                        |
| `checked`    | ✅     |                                                                     |

## Default Menu Items

| Item                   | Owning phase | Status | Notes           |
| ---------------------- | ------------ | ------ | --------------- |
| `separator`            | 1            | ✅     |                 |
| `autoSizeAll`          | 1            | ✅     |                 |
| `resetColumns`         | 1            | ✅     |                 |
| `pinRowSubMenu`        | 1            | 🟡     | Stub registered |
| `pinTop`               | 1            | 🟡     | Stub registered |
| `pinBottom`            | 1            | 🟡     | Stub registered |
| `unpinRow`             | 1            | 🟡     | Stub registered |
| `expandAll`            | 2            | 🟡     | Stub registered |
| `contractAll`          | 2            | 🟡     | Stub registered |
| `copy`                 | 4            | 🟡     | Stub registered |
| `copyWithHeaders`      | 4            | 🟡     | Stub registered |
| `copyWithGroupHeaders` | 4            | 🟡     | Stub registered |
| `cut`                  | 4            | 🟡     | Stub registered |
| `paste`                | 4            | 🟡     | Stub registered |
| `export`               | 5            | 🟡     | Stub registered |
| `csvExport`            | 5            | 🟡     | Stub registered |
| `excelExport`          | 5            | 🟡     | Stub registered |
| `chartRange`           | 12           | ✅     | Creates linked Community range charts from the selected range |
| `pivotChart`           | 12           | ✅     | Creates a chart from pivot-visible data |
| `note`                 | 13           | 🟡     | Stub registered |

## Behaviour

| Requirement                                                                    | Status | Notes                                                   |
| ------------------------------------------------------------------------------ | ------ | ------------------------------------------------------- |
| **Extensible registry** — later phases contribute without editing this package | ✅     | Global store + `registerMenuItem` / `registerMenuItems` |
| Keyboard navigation (arrows, Enter, Escape)                                    | ✅     | Arrow keys navigate, Enter selects, Escape closes       |
| Focus returns to trigger on close                                              | ✅     | Escape return to the grid-cell trigger is E2E tested    |
