# Parity — Excel Export

**Sources:** https://www.ag-grid.com/angular-data-grid/excel-export/ · `/excel-export-api/` · transcribed 2026-08-11
**Phase:** 5 · **Package:** `@libregrid/excel-export`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## API Methods

| Method | Sub-PR | Status | Notes |
|---|---|---|---|
| `exportDataAsExcel` | 5.6 | ⬜ | |
| `getDataAsExcel` | 5.6 | ⬜ | Returns a Blob |
| `getSheetDataForExcel` | 5.6 | ⬜ | |
| `exportMultipleSheetsAsExcel` | 5.6 | ⬜ | |
| `getMultipleSheetsAsExcel` | 5.6 | ⬜ | |

## ExcelExportParams

| Property | Sub-PR | Status | Notes |
|---|---|---|---|
| `fileName` | 5.6 | ⬜ | |
| `sheetName` | 5.6 | ⬜ | |
| `mimeType` | 5.6 | ⬜ | |
| `author` | 5.8 | ⬜ | |
| `customMetadata` | 5.8 | ⬜ | |
| `columnWidth` | 5.4 | ⬜ | |
| `rowHeight` | 5.4 | ⬜ | |
| `headerRowHeight` | 5.4 | ⬜ | |
| `fontSize` | 5.8 | ⬜ | |
| `freezeColumns` | 5.4 | ⬜ | |
| `freezeRows` | 5.4 | ⬜ | |
| `rightToLeft` | 5.4 | ⬜ | |
| `allColumns` | 5.8 | ⬜ | |
| `columnKeys` | 5.8 | ⬜ | |
| `onlySelected` | 5.8 | ⬜ | |
| `onlySelectedAllPages` | 5.8 | ⬜ | |
| `exportedRows` | 5.8 | ⬜ | |
| `rowPositions` | 5.8 | ⬜ | |
| `exportRowNumbers` | 5.8 | ⬜ | |
| `skipColumnHeaders` | 5.8 | ⬜ | |
| `skipColumnGroupHeaders` | 5.8 | ⬜ | |
| `skipPinnedTop` | 5.8 | ⬜ | |
| `skipPinnedBottom` | 5.8 | ⬜ | |
| `skipPinnedRowDuplicates` | 5.8 | ⬜ | |
| `skipRowGroups` | 5.5 | ⬜ | |
| `rowGroupExpandState` | 5.5 | ⬜ | ⭐ outline state |
| `suppressRowOutline` | 5.5 | ⬜ | ⭐ differentiator |
| `suppressColumnOutline` | 5.5 | ⬜ | ⭐ differentiator |
| `autoConvertFormulas` | 5.7 | ⬜ | |
| `processCellCallback` | 5.7 | ⬜ | |
| `processHeaderCallback` | 5.7 | ⬜ | |
| `processGroupHeaderCallback` | 5.7 | ⬜ | |
| `processRowGroupCallback` | 5.5 | ⬜ | |
| `processNoteCallback` | 5.9 | ⬜ | Optional |
| `shouldRowBeSkipped` | 5.7 | ⬜ | |
| `getCustomContentBelowRow` | 5.7 | ⬜ | |
| `transformValues` | 5.7 | ⬜ | |
| `valueFrom` | 5.7 | ⬜ | |
| `prependContent` | 5.8 | ⬜ | |
| `appendContent` | 5.8 | ⬜ | |
| `pageSetup` | 5.8 | ⬜ | |
| `margins` | 5.8 | ⬜ | |
| `headerFooterConfig` | 5.8 | ⬜ | |
| `protectSheet` | 5.8 | ⬜ | |
| `addImageToCell` | 5.9 | ⬜ | Optional — media parts + drawing XML |
| `exportAsExcelTable` | 5.9 | ⬜ | Optional |
| `suppressGridNotesExport` | 5.9 | ⬜ | Optional |
| `suppressPrependAuthorToNotes` | 5.9 | ⬜ | Optional |

## ExcelStyle

| Property | Sub-PR | Status | Notes |
|---|---|---|---|
| `id` | 5.3 | ⬜ | Matches `cellClass` |
| `font` | 5.3 | ⬜ | |
| `interior` | 5.3 | ⬜ | Fill |
| `borders` | 5.3 | ⬜ | |
| `numberFormat` | 5.3 | ⬜ | |
| `alignment` | 5.3 | ⬜ | |
| `protection` | 5.3 | ⬜ | |
| `dataType` | 5.3 | ⬜ | |

## Correctness gates

| Requirement | Status | Notes |
|---|---|---|
| Opens without repair prompt in **Microsoft Excel** | ⬜ | **Gate criterion** |
| Opens without repair prompt in **LibreOffice Calc** | ⬜ | **Gate criterion** |
| Opens without repair prompt in **Google Sheets** | ⬜ | **Gate criterion** |
| Dates correct incl. 1900 phantom leap day | ⬜ | |
| Strings >32,767 chars handled | ⬜ | Excel cell limit |
| Empty grid produces a valid workbook | ⬜ | |
| Unicode / emoji / RTL text correct | ⬜ | |
| Only runtime dependency is `fflate` | ⬜ | |
