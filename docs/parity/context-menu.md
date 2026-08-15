# Parity — Context Menu

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/angular-data-grid/context-menu/ · transcribed 2026-08-11
**Phase:** 1 · **Package:** `@libregrid/menu`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option                           | Status | Notes                                                         |
| -------------------------------- | ------ | ------------------------------------------------------------- |
| `contextMenuItems`               | ✅     | Grid-level item list is supported after the callback override |
| `getContextMenuItems`            | 🟡     | Wired; receives default items; explicit E2E and full customisation coverage still pending |
| `suppressContextMenu`            | ✅     | Suppresses ours, not the browser's; E2E tested                |
| `allowContextMenuWithControlKey` | ✅     | Ctrl+click path E2E tested                                    |
| `popupParent`                    | 🟡     | PopupService respects it; explicit E2E still pending          |
| `cellSelection`                  | 🟡     | Implemented by `@libregrid/cell-selection` (Phase 4); the copy/cut/paste context items gated on it remain registered stubs in this package |
| `enableCharts`                   | ✅     | Implemented by `@libregrid/integrated-charts` (Phase 12): gates ChartService and drives the live `chartRange`/`pivotChart` items; integration-tested in `packages/integrated-charts` and demonstrated on the live `/charts` docs route with E2E |

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
| `pinRowSubMenu`        | 1            | 🟡     | Stub registered; row-pinning sub-menu not implemented |
| `pinTop`               | 1            | 🟡     | Stub registered; row-pin action not implemented |
| `pinBottom`            | 1            | 🟡     | Stub registered; row-pin action not implemented |
| `unpinRow`             | 1            | 🟡     | Stub registered; row-unpin action not implemented |
| `expandAll`            | 2            | 🟡     | Stub registered; group expand-all action not wired |
| `contractAll`          | 2            | 🟡     | Stub registered; group contract-all action not wired |
| `copy`                 | 4            | 🟡     | Stub registered; not wired to the Phase 4 clipboard copy |
| `copyWithHeaders`      | 4            | 🟡     | Stub registered; not wired to the Phase 4 clipboard copy |
| `copyWithGroupHeaders` | 4            | 🟡     | Stub registered; not wired to the Phase 4 clipboard copy |
| `cut`                  | 4            | 🟡     | Stub registered; not wired to the Phase 4 clipboard cut |
| `paste`                | 4            | 🟡     | Stub registered; not wired to the Phase 4 clipboard paste |
| `export`               | 5            | 🟡     | Stub registered; export action not wired |
| `csvExport`            | 5            | 🟡     | Stub registered; CSV export action not wired |
| `excelExport`          | 5            | 🟡     | Stub registered; Excel export is deferred (see phase-05-excel-export.md) |
| `chartRange`           | 12           | ✅     | Creates linked Community range charts from the selected range |
| `pivotChart`           | 12           | ✅     | Creates a chart from pivot-visible data |
| `note`                 | 13           | 🟡     | Stub registered; Notes is a documented post-1.0 candidate (see phase-13 13A) |

## Behaviour

| Requirement                                                                    | Status | Notes                                                   |
| ------------------------------------------------------------------------------ | ------ | ------------------------------------------------------- |
| **Extensible registry** — later phases contribute without editing this package | ✅     | Global store + `registerMenuItem` / `registerMenuItems` |
| Keyboard navigation (arrows, Enter, Escape)                                    | ✅     | Arrow keys navigate, Enter selects, Escape closes       |
| Focus returns to trigger on close                                              | ✅     | Escape return to the grid-cell trigger is E2E tested    |
