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
| `cellSelection`                  | ✅     | Implemented by `@libregrid/cell-selection` (Phase 4); the copy/cut/paste context items it gates are wired (Phase 14 P0-6) |
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
| `subMenu`    | ✅     | Nested menus open on hover/click/ArrowRight with viewport clamping and invoke registered child actions |
| `subMenuRole` | 🟡     | Retained on the definition; the rendered submenu keeps the default menu role |
| `menuItem`     | ✅     | Custom menu item components instantiate via the grid component factory; agInit, configureDefaults, setActive/setExpanded/select honored (1.1.0 UX pass) |
| `menuItemParams` | ✅   | Forwarded to the custom component through agInit |
| `icon`       | ✅     |                                                                     |
| `shortcut`   | ✅     | Display only                                                        |
| `checked`    | ✅     |                                                                     |

## Default Menu Items

| Item                   | Owning phase | Status | Notes           |
| ---------------------- | ------------ | ------ | --------------- |
| `separator`            | 1            | ✅     |                 |
| `autoSizeAll`          | 1            | ✅     |                 |
| `resetColumns`         | 1            | ✅     |                 |
| `pinRowSubMenu`        | 1            | 🟡     | Stub registered; Community's pinned-rows API is data-level (`setPinnedTopRowData`/`setPinnedBottomRowData`) — there is no single-row pin/unpin API to wire a per-row item to |
| `pinTop`               | 1            | 🟡     | Stub registered; no single-row pin API exists (see `pinRowSubMenu`) |
| `pinBottom`            | 1            | 🟡     | Stub registered; no single-row pin API exists (see `pinRowSubMenu`) |
| `unpinRow`             | 1            | 🟡     | Stub registered; no single-row unpin API exists (see `pinRowSubMenu`) |
| `expandAll`            | 2            | ✅     | Phase 14 (P0-6) — real factory registered by `@libregrid/row-grouping` (replaces the Phase-1 stub via the global store); grid-wide `api.expandAll` or scoped subtree expansion; resolution + invoked API call tested in `menuItems.spec.ts` |
| `contractAll`          | 2            | ✅     | Phase 14 (P0-6) — real factory registered by `@libregrid/row-grouping` (replaces the Phase-1 stub); grid-wide `api.collapseAll` or scoped subtree collapse; tested in `menuItems.spec.ts` |
| `copy`                 | 4            | ✅     | Phase 14 (P0-6) — real factory registered by `@libregrid/clipboard` in `onRegister` (replaces the Phase-1 stub); invokes `api.copySelectedRangeToClipboard`; resolution + invoked call tested in `clipboardModule.integration.spec.ts` |
| `copyWithHeaders`      | 4            | ✅     | Phase 14 (P0-6) — `@libregrid/clipboard`; `copySelectedRangeToClipboard({ includeHeaders: true })`; tested |
| `copyWithGroupHeaders` | 4            | ✅     | Phase 14 (P0-6) — `@libregrid/clipboard`; `copySelectedRangeToClipboard({ includeHeaders: true, includeGroupHeaders: true })`; tested |
| `cut`                  | 4            | ✅     | Phase 14 (P0-6) — `@libregrid/clipboard`; `api.cutToClipboard`; tested |
| `paste`                | 4            | ✅     | Phase 14 (P0-6) — `@libregrid/clipboard`; `api.pasteFromClipboard`; tested |
| `export`               | 5            | ✅     | Phase 14 (P0-6) — `@libregrid/excel-export`; submenu of `csvExport`/`excelExport`; tested |
| `csvExport`            | 5            | ✅     | Phase 14 (P0-6) — `@libregrid/excel-export`; `api.exportDataAsCsv`; tested |
| `excelExport`          | 5            | ✅     | Phase 14 (P0-6) — `@libregrid/excel-export`; `api.exportDataAsExcel`; tested |
| `chartRange`           | 12           | ✅     | Creates linked Community range charts from the selected range |
| `pivotChart`           | 12           | ✅     | Creates a chart from pivot-visible data |
| `note`                 | 13           | ✅     | Phase 15 (A4) — real factory registered by `@libregrid/notes` (replaces the Phase-1 stub); *Add Note* / *Edit Note* + *Remove Note* / *View Note* (+ disabled remove for read-only) per note access; added to `DEFAULT_CONTEXT_MENU_ITEMS` so it appears by default; tested in `notesModule.integration.spec.ts` |

## Behaviour

| Requirement                                                                    | Status | Notes                                                   |
| ------------------------------------------------------------------------------ | ------ | ------------------------------------------------------- |
| **Extensible registry** — later phases contribute without editing this package | ✅     | Global store + `registerMenuItem` / `registerMenuItems` |
| Keyboard navigation (arrows, Enter, Escape)                                    | ✅     | Arrow keys navigate, Enter selects, Escape closes       |
| Focus returns to trigger on close                                              | ✅     | Escape return to the grid-cell trigger is E2E tested    |
