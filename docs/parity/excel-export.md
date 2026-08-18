# Parity — Excel Export

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

> **✅ Phase 5 delivered and validated 2026-08-15.** Sub-PRs 5.1–5.8 landed; 5.9 descoped with per-row rationale. The manual consumer-validation matrix passed in Microsoft Excel, LibreOffice Calc and Google Sheets on 2026-08-15 (the date-display fix found during that pass is included).

**Sources:** https://www.ag-grid.com/angular-data-grid/excel-export/ · `/excel-export-api/` · transcribed 2026-08-11
**Phase:** 5 · **Package:** `@libregrid/excel-export`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## API Methods

| Method | Sub-PR | Status | Notes |
|---|---|---|---|
| `exportDataAsExcel` | 5.6 | ✅ | Downloads via Blob + anchor; integration test asserts the file name |
| `getDataAsExcel` | 5.6 | ✅ | Returns a Blob · unzip-and-assert integration test |
| `getSheetDataForExcel` | 5.6 | ✅ | Opaque string; round-trips through the multi-sheet API |
| `exportMultipleSheetsAsExcel` | 5.6 | ✅ | Multi-sheet download |
| `getMultipleSheetsAsExcel` | 5.6 | ✅ | Two-grid round-trip test incl. merged shared strings |

## ExcelExportParams

| Property | Sub-PR | Status | Notes |
|---|---|---|---|
| `fileName` | 5.6 | ✅ | String or getter; default `export.xlsx` |
| `sheetName` | 5.6 | ✅ | String or getter; default `ag-grid`; clamped to 31 chars |
| `mimeType` | 5.6 | ✅ | Defaults to the OOXML mime type |
| `author` | 5.8 | ✅ | `docProps/core.xml` `dc:creator`; tested |
| `customMetadata` | 5.8 | ✅ | `docProps/custom.xml` string properties; tested |
| `columnWidth` | 5.4 | ✅ | Number or callback → `ExcelColumn.width`; tested |
| `rowHeight` | 5.4 | ✅ | Number or callback (px → pt) → `ExcelRow.height`; tested |
| `headerRowHeight` | 5.4 | ✅ | Number or callback applied to header rows; tested |
| `fontSize` | 5.8 | ✅ | Default font size in `styles.xml`; tested |
| `freezeColumns` | 5.4 | ✅ | `pinned` or callback → pane `xSplit`; tested |
| `freezeRows` | 5.4 | ✅ | `headers`/`headersAndPinnedRows`/callback → pane `ySplit`; tested |
| `rightToLeft` | 5.4 | ✅ | Param or grid `enableRtl` → `sheetView rightToLeft` |
| `allColumns` | 5.8 | ✅ | Hidden columns exported; tested |
| `columnKeys` | 5.8 | ✅ | Column subset; tested |
| `onlySelected` | 5.8 | ✅ | Selected displayed rows only; tested |
| `onlySelectedAllPages` | 5.8 | 🟡 | Implemented (all selected nodes); no paginated-grid test |
| `exportedRows` | 5.8 | ✅ | `filteredAndSorted` (default) vs `all`; tested with a live filter |
| `rowPositions` | 5.8 | ✅ | Tested |
| `exportRowNumbers` | 5.8 | ✅ | Leading numbered column; tested |
| `skipColumnHeaders` | 5.8 | ✅ | Tested |
| `skipColumnGroupHeaders` | 5.8 | ✅ | Tested |
| `skipPinnedTop` | 5.8 | ✅ | Tested |
| `skipPinnedBottom` | 5.8 | 🟡 | Same code path as `skipPinnedTop`; not separately tested |
| `skipPinnedRowDuplicates` | 5.8 | 🟡 | Implemented via data-reference matching; no test (manual pinning needs the row-pinning drag feature) |
| `skipRowGroups` | 5.5 | ✅ | End-to-end test: group rows excluded from the export |
| `rowGroupExpandState` | 5.5 | ✅ | ⭐ outline state — `expanded`/`collapsed`/`match` tested against a real grouped grid |
| `suppressRowOutline` | 5.5 | ✅ | ⭐ differentiator — outline attributes suppressed end-to-end |
| `suppressColumnOutline` | 5.5 | 🟡 | ⭐ differentiator — writer mechanism landed (5.5); grid-driven column-group outline extraction is not implemented (groups export as merged header rows, 5.7) |
| `autoConvertFormulas` | 5.7 | ✅ | `=`-prefixed strings become `<f>` cells only when enabled; test covers both modes |
| `processCellCallback` | 5.7 | ✅ | Tested with `accumulatedRowIndex`, `type`, `parseValue` and `formatValue` |
| `processHeaderCallback` | 5.7 | ✅ | Header override tested |
| `processGroupHeaderCallback` | 5.7 | ✅ | Tested with merged column-group header rows |
| `processRowGroupCallback` | 5.5 | ✅ | Group-cell override tested on a real grouped grid |
| `processNoteCallback` | 5.9 | ❌ | Descoped 2026-08-15 — notes need `xl/comments*` + vmlDrawing parts; not delivered (phase 5.9 descoped) |
| `shouldRowBeSkipped` | 5.7 | ✅ | Tested |
| `getCustomContentBelowRow` | 5.7 | ✅ | Custom rows inserted below matching rows; tested |
| `transformValues` | 5.7 | ✅ | Show Values As transform applied via `showValuesAsSvc`; `false` tested |
| `valueFrom` | 5.7 | 🟡 | Default `'data'` tested; `'batch'`/`'edit'` pass through to `getCellValue` |
| `prependContent` | 5.8 | ✅ | Tested |
| `appendContent` | 5.8 | ✅ | Tested |
| `pageSetup` | 5.8 | ✅ | Orientation + paper sizes incl. the full AG Grid list; tested |
| `margins` | 5.8 | ✅ | Documented defaults filled in; tested |
| `headerFooterConfig` | 5.8 | ✅ | Text, positions and font codes; images (`&G`) deferred to 5.9 |
| `protectSheet` | 5.8 | ✅ | All flags + legacy password hash; tested |
| `addImageToCell` | 5.9 | ❌ | Descoped 2026-08-15 — media parts + drawing XML out of scope; header/footer `&G` images too |
| `exportAsExcelTable` | 5.9 | ❌ | Descoped 2026-08-15 — `xl/tables` parts out of scope |
| `suppressGridNotesExport` | 5.9 | ❌ | Descoped with notes (above) |
| `suppressPrependAuthorToNotes` | 5.9 | ❌ | Descoped with notes (above) |

## ExcelStyle

| Property | Sub-PR | Status | Notes |
|---|---|---|---|
| `id` | 5.3 | ✅ | Matches `cellClass` via `cell.styleId`; array ids merge, later wins |
| `font` | 5.3 | ✅ | Deduplicated fonts; ARGB colour mapping incl. named colours |
| `interior` | 5.3 | ✅ | Fill; all 18 AG Grid patterns mapped to OOXML patternType |
| `borders` | 5.3 | ✅ | lineStyle × weight mapped to OOXML border styles |
| `numberFormat` | 5.3 | ✅ | Built-in ids reused; custom formats assigned ids from 164 |
| `alignment` | 5.3 | ✅ | Horizontal/vertical/readingOrder/indent/rotate/wrap/shrink |
| `protection` | 5.3 | ✅ | Mapped in styles.xml; enforced together with `protectSheet` in 5.8 |
| `dataType` | 5.3 | 🟡 | Excluded from the style-dedupe signature by design; drives cell typing during grid extraction in 5.6 |

## Menu contributions

| Item | Status | Notes |
|---|---|---|
| `export` | ✅ | Registered with the `csvExport`/`excelExport` submenu; E2E asserts it renders in the context menu |
| `csvExport` | ✅ | Delegates to Community's `exportDataAsCsv` |
| `excelExport` | ✅ | Delegates to `exportDataAsExcel` |
| Submenu expansion | 🟡 | Phase 1 renderer draws the arrow but does not open nested menus — tracked as [OPEN-ACTIONS C3](../OPEN-ACTIONS.md) |

## Correctness gates

| Requirement | Status | Notes |
|---|---|---|
| Opens without repair prompt in **Microsoft Excel** | ✅ | Manual matrix 2026-08-15 — all six verification workbooks open clean |
| Opens without repair prompt in **LibreOffice Calc** | ✅ | Manual matrix 2026-08-15 — all six verification workbooks open clean |
| Opens without repair prompt in **Google Sheets** | ✅ | Manual matrix 2026-08-15 — all six verification workbooks import correctly |
| Dates correct incl. 1900 phantom leap day | ✅ | 5.2 — 1900-system serials with the phantom-leap-day rule; pre-1900 dates export as text (the 1900 system has no serial for them). Date cells display with the built-in `mm-dd-yy` format unless the cell's style sets a number format (added after the first manual matrix run) |
| Strings >32,767 chars handled | ✅ | 5.2 — truncated to Excel's per-cell limit |
| Empty grid produces a valid workbook | ✅ | 5.1 — golden `empty` fixture + unzip-and-assert |
| Unicode / emoji / RTL text correct | 🟡 | Unicode/emoji ✅ in 5.2 (integration round-trip) · RTL lands with 5.4 `rightToLeft` |
| Only runtime dependency is `fflate` | ✅ | 5.1 — `package.json` declares only `@libregrid/core` + `fflate` |
