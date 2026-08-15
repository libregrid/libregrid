# Parity — Excel Export

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

> **▶️ Phase 5 in progress.** Sub-PR 5.1 (OOXML skeleton + unzip-and-assert harness) landed 2026-08-15. Rows land sub-PR by sub-PR; rows still ⬜ carry the sub-PR that delivers them. The manual consumer-validation matrix (Excel / LibreOffice / Google Sheets) runs at the phase gate and blocks every ✅ in the gates table.

**Sources:** https://www.ag-grid.com/angular-data-grid/excel-export/ · `/excel-export-api/` · transcribed 2026-08-11
**Phase:** 5 · **Package:** `@libregrid/excel-export`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## API Methods

| Method | Sub-PR | Status | Notes |
|---|---|---|---|
| `exportDataAsExcel` | 5.6 | ⬜ | Delivered by sub-PR 5.6 |
| `getDataAsExcel` | 5.6 | ⬜ | Returns a Blob · sub-PR 5.6 |
| `getSheetDataForExcel` | 5.6 | ⬜ | sub-PR 5.6 |
| `exportMultipleSheetsAsExcel` | 5.6 | ⬜ | sub-PR 5.6 |
| `getMultipleSheetsAsExcel` | 5.6 | ⬜ | sub-PR 5.6 |

## ExcelExportParams

| Property | Sub-PR | Status | Notes |
|---|---|---|---|
| `fileName` | 5.6 | ⬜ | Delivered by sub-PR 5.6 |
| `sheetName` | 5.6 | ⬜ | sub-PR 5.6 |
| `mimeType` | 5.6 | ⬜ | sub-PR 5.6 |
| `author` | 5.8 | ⬜ | sub-PR 5.8 |
| `customMetadata` | 5.8 | ⬜ | sub-PR 5.8 |
| `columnWidth` | 5.4 | ⬜ | sub-PR 5.4 |
| `rowHeight` | 5.4 | ⬜ | sub-PR 5.4 |
| `headerRowHeight` | 5.4 | ⬜ | sub-PR 5.4 |
| `fontSize` | 5.8 | ⬜ | sub-PR 5.8 |
| `freezeColumns` | 5.4 | ⬜ | sub-PR 5.4 |
| `freezeRows` | 5.4 | ⬜ | sub-PR 5.4 |
| `rightToLeft` | 5.4 | ⬜ | sub-PR 5.4 |
| `allColumns` | 5.8 | ⬜ | sub-PR 5.8 |
| `columnKeys` | 5.8 | ⬜ | sub-PR 5.8 |
| `onlySelected` | 5.8 | ⬜ | sub-PR 5.8 |
| `onlySelectedAllPages` | 5.8 | ⬜ | sub-PR 5.8 |
| `exportedRows` | 5.8 | ⬜ | sub-PR 5.8 |
| `rowPositions` | 5.8 | ⬜ | sub-PR 5.8 |
| `exportRowNumbers` | 5.8 | ⬜ | sub-PR 5.8 |
| `skipColumnHeaders` | 5.8 | ⬜ | sub-PR 5.8 |
| `skipColumnGroupHeaders` | 5.8 | ⬜ | sub-PR 5.8 |
| `skipPinnedTop` | 5.8 | ⬜ | sub-PR 5.8 |
| `skipPinnedBottom` | 5.8 | ⬜ | sub-PR 5.8 |
| `skipPinnedRowDuplicates` | 5.8 | ⬜ | sub-PR 5.8 |
| `skipRowGroups` | 5.5 | ⬜ | sub-PR 5.5 |
| `rowGroupExpandState` | 5.5 | ⬜ | ⭐ outline state · sub-PR 5.5 |
| `suppressRowOutline` | 5.5 | ⬜ | ⭐ differentiator · sub-PR 5.5 |
| `suppressColumnOutline` | 5.5 | ⬜ | ⭐ differentiator · sub-PR 5.5 |
| `autoConvertFormulas` | 5.7 | ⬜ | sub-PR 5.7 |
| `processCellCallback` | 5.7 | ⬜ | sub-PR 5.7 |
| `processHeaderCallback` | 5.7 | ⬜ | sub-PR 5.7 |
| `processGroupHeaderCallback` | 5.7 | ⬜ | sub-PR 5.7 |
| `processRowGroupCallback` | 5.5 | ⬜ | sub-PR 5.5 |
| `processNoteCallback` | 5.9 | ⬜ | Optional · decided at sub-PR 5.9 |
| `shouldRowBeSkipped` | 5.7 | ⬜ | sub-PR 5.7 |
| `getCustomContentBelowRow` | 5.7 | ⬜ | sub-PR 5.7 |
| `transformValues` | 5.7 | ⬜ | sub-PR 5.7 |
| `valueFrom` | 5.7 | ⬜ | sub-PR 5.7 |
| `prependContent` | 5.8 | ⬜ | sub-PR 5.8 |
| `appendContent` | 5.8 | ⬜ | sub-PR 5.8 |
| `pageSetup` | 5.8 | ⬜ | sub-PR 5.8 |
| `margins` | 5.8 | ⬜ | sub-PR 5.8 |
| `headerFooterConfig` | 5.8 | ⬜ | sub-PR 5.8 |
| `protectSheet` | 5.8 | ⬜ | sub-PR 5.8 |
| `addImageToCell` | 5.9 | ⬜ | Optional — media parts + drawing XML · decided at sub-PR 5.9 |
| `exportAsExcelTable` | 5.9 | ⬜ | Optional · decided at sub-PR 5.9 |
| `suppressGridNotesExport` | 5.9 | ⬜ | Optional · decided at sub-PR 5.9 |
| `suppressPrependAuthorToNotes` | 5.9 | ⬜ | Optional · decided at sub-PR 5.9 |

## ExcelStyle

| Property | Sub-PR | Status | Notes |
|---|---|---|---|
| `id` | 5.3 | ⬜ | Matches `cellClass` · sub-PR 5.3 |
| `font` | 5.3 | ⬜ | sub-PR 5.3 |
| `interior` | 5.3 | ⬜ | Fill · sub-PR 5.3 |
| `borders` | 5.3 | ⬜ | sub-PR 5.3 |
| `numberFormat` | 5.3 | ⬜ | sub-PR 5.3 |
| `alignment` | 5.3 | ⬜ | sub-PR 5.3 |
| `protection` | 5.3 | ⬜ | sub-PR 5.3 |
| `dataType` | 5.3 | ⬜ | sub-PR 5.3 |

## Correctness gates

| Requirement | Status | Notes |
|---|---|---|
| Opens without repair prompt in **Microsoft Excel** | ⬜ | **Gate criterion** · manual matrix at the phase gate |
| Opens without repair prompt in **LibreOffice Calc** | ⬜ | **Gate criterion** · manual matrix at the phase gate |
| Opens without repair prompt in **Google Sheets** | ⬜ | **Gate criterion** · manual matrix at the phase gate |
| Dates correct incl. 1900 phantom leap day | ✅ | 5.2 — 1900-system serials with the phantom-leap-day rule; pre-1900 dates export as text (the 1900 system has no serial for them) |
| Strings >32,767 chars handled | ✅ | 5.2 — truncated to Excel's per-cell limit |
| Empty grid produces a valid workbook | ✅ | 5.1 — golden `empty` fixture + unzip-and-assert |
| Unicode / emoji / RTL text correct | 🟡 | Unicode/emoji ✅ in 5.2 (integration round-trip) · RTL lands with 5.4 `rightToLeft` |
| Only runtime dependency is `fflate` | ✅ | 5.1 — `package.json` declares only `@libregrid/core` + `fflate` |
