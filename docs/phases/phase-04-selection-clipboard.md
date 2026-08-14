# Phase 4 — Cell Selection, Clipboard & Status Bar

**Status:** 🟡 Implemented and validated in the grid and browser; external spreadsheet interoperability checks remain before Phase 4 can be marked complete (2026-08-13).
**Depends on:** Phase 1 (menu items for copy/paste)
**Blocks:** Phase 5 (Excel export reuses range logic), Phase 12 (charts are created from ranges)

**Packages:** `@libregrid/cell-selection` (`CellSelection`), `@libregrid/clipboard` (`Clipboard`), `@libregrid/status-bar` (`StatusBar`)
**Parity:** [`../parity/cell-selection.md`](../parity/cell-selection.md), [`../parity/clipboard.md`](../parity/clipboard.md), [`../parity/status-bar.md`](../parity/status-bar.md)

---

## Context

This is the "feels like a real spreadsheet" cluster, and it is largely self-contained — a good phase to follow the heavy grouping work.

Three packages ship together because they are tightly coupled in use: clipboard operates on selected ranges, and the status bar summarises them. They stay separate packages so consumers can take only what they need.

`rangeSvc` (implementing `IRangeService`) is foundational beyond this phase — Phase 5 uses ranges to decide export scope, and Phase 12 creates charts from them. Design its public surface carefully; it has three consumers.

Two things are harder than they appear:

- **The fill handle** must extend both _values_ (copy) and _series_ (detect and continue numeric/date patterns). Series detection is where most implementations feel wrong.
- **Clipboard** must produce TSV that Excel parses with the correct shape, including embedded newlines, tabs and quotes inside cell values. Browser clipboard APIs are also permission-gated and differ across browsers, which makes E2E genuinely fiddly.

---

## Todo

### 4A — `@libregrid/cell-selection`

- [x] Bean `rangeSvc` with the Community range-service surface and per-cell selection painter
- [x] Single range via drag; multi-range via Ctrl/Cmd+drag
- [x] Keyboard range extension (Shift+arrows, Shift+click)
- [x] Range handle (drag the corner to resize the range)
- [x] **Fill handle** — copy values, and detect/continue numeric, date, and weekday series
- [x] Options: `cellSelection` (`boolean | CellSelectionOptions`), `suppressMultiRanges`, `enableHeaderHighlight`, `enableColumnSelection`, `handle.mode` (`'range' | 'fill'`)
- [x] Events: `cellSelectionDeleteStart`, `cellSelectionDeleteEnd`
- [x] Delete/Backspace clears the selected range

### 4B — `@libregrid/clipboard`

- [x] Bean `clipboardSvc` with the Community clipboard-service surface
- [x] Copy / cut / paste with quoted, Excel-compatible TSV
- [x] Options: `copyHeadersToClipboard`, `suppressCutToClipboard`, `suppressClipboardPaste`, `clipboardDelimiter`, `enableCellTextSelection`, `ensureDomOrder`, `readOnlyEdit`
- [x] Callbacks: `sendToClipboard`, `processCellForClipboard`, `processHeaderForClipboard`, `processGroupHeaderForClipboard`, `processCellFromClipboard`, `processDataFromClipboard`
- [x] ColDef `suppressPaste` (boolean or function)
- [x] API: `copySelectedRowsToClipboard`, `copySelectedRangeToClipboard`
- [x] Events: `cutStart`, `cutEnd`, `pasteStart`, `pasteEnd`; `cellValueChanged` / `cellEditRequest` integration
- [x] Contribute `copy`, `copyWithHeaders`, `copyWithGroupHeaders`, `cut`, `paste` to the Phase 1 menu registry

### 4C — `@libregrid/status-bar`

- [x] Bean `statusBarSvc`; `iStatusPanel` contract
- [x] Option `statusBar.statusPanels`; `StatusPanelDef`: `statusPanel`, `align`, `key`, `statusPanelParams` (alignment is retained for a host renderer)
- [x] Provided panels: `agTotalRowCountComponent`, `agTotalAndFilteredRowCountComponent`, `agFilteredRowCountComponent`, `agSelectedRowCountComponent`, `agAggregationComponent`
- [x] API `getStatusPanel(key)`
- [x] Custom panel contract: `agInit(params)` required, `refresh(params)` optional
- [x] Material implementation (`MatToolbar`) in `@libregrid/material`

---

## Test plan

| Tier            | Coverage                                                                                                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**        | Range model: normalisation of reversed drags, overlapping multi-ranges, ranges spanning pinned columns. Fill-handle series detection: integers, decimals, dates, weekdays, non-series (must fall back to copy). TSV serialisation of values containing tabs, newlines, quotes      |
| **Integration** | `copySelectedRangeToClipboard` produces expected TSV. Paste applies values and fires `cellValueChanged`. `readOnlyEdit` emits `cellEditRequest` and does **not** mutate data. `suppressPaste` blocks per column. Status panels report correct counts under filtering and selection |
| **E2E**         | Drag-select a range; Ctrl+drag a second range. Drag the fill handle down → values extend; with `1,2,3` selected → series continues `4,5,6`. Ctrl+C then paste into a textarea and assert shape. Delete clears the range. Status bar updates live during selection                  |
| **Cross-app**   | Manual check (documented in the PR): copy from the grid, paste into Excel/LibreOffice/Sheets — rows and columns land correctly                                                                                                                                                     |
| **a11y**        | Range selection reachable by keyboard; status bar uses `aria-live` for count updates; axe 0 violations light + dark                                                                                                                                                                |

**Specific edge cases to cover:**

- Paste a region larger than the target range (must expand or clip per documented behavior)
- Paste into a grouped grid (group rows must not be treated as data rows)
- `clipboardDelimiter` set to something other than `\t`
- Cell values containing the delimiter itself
- Multi-range copy — documented behavior when ranges are non-contiguous

---

## Acceptance criteria

- [ ] Drag-select works for single and multiple ranges
- [ ] Fill handle extends **values and series** correctly, including dates
- [ ] Copy pastes into Excel, LibreOffice and Google Sheets with correct row/column shape
- [ ] Values containing tabs, newlines and quotes survive a copy→paste round trip
- [ ] Paste respects `suppressPaste`, `suppressClipboardPaste` and `readOnlyEdit`
- [ ] All five provided status panels correct under filter + selection changes
- [ ] Custom status panel registration works
- [ ] Clipboard menu items contributed to Phase 1's registry
- [ ] Three parity checklists fully marked ✅/🟡/❌ with rationale
- [ ] Full Definition of Done (`standards.md` §9) satisfied

## Implementation and validation record — 2026-08-13

- Added `@libregrid/cell-selection`, `@libregrid/clipboard`, and `@libregrid/status-bar`; all expose explicit module boundaries and include NOTICE/README attribution.
- The docs route `/selection` registers all three modules and demonstrates drag selection, fill-series behavior, copy, clear, configured status panels, and the Material status-bar shell.
- Unit and real-grid integration coverage covers TSV quoting/delimiters, range normalisation, numbers/dates/weekdays, cut/paste events, read-only paste, configured provided/custom panels, and the public Grid APIs.
- Follow-up validation corrected range-resize row-boundary preservation, keeps header highlighting live after selection changes, makes `copyRangeDown()` extend the active range by one row, and makes range drag hooks safe in non-browser runtimes.
- Playwright covers range drag, copy, clear, Ctrl multi-range, fill-handle series expansion, and axe in light/dark themes.
- Green checks: `npx nx run-many -t lint test build`; `npx nx run material:test`; `npx nx e2e docs-e2e`; `npx nx run conformance:matrix`; `npx nx run bench:compare`; `npx nx run check-contamination:test`.
- The Phase 4-scoped coverage command is green: **91.16% statements, 77.72% branches, 93.53% functions, and 93.57% lines**. The raw workspace-wide `vitest --coverage` command remains unsuitable as a phase gate because its denominator includes unrelated packages and three existing Angular Material renderer suites still need a Vite-compatible Angular template transform (the JIT bootstrap is present). The Excel/LibreOffice/Google Sheets manual copy-paste check is the only remaining Phase 4 completion gate; no local LibreOffice executable is available in this environment.
