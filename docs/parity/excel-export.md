# Parity — Excel Export

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

> **⏸️ Whole checklist deferred with Phase 5.** Excel export is **Optional / deferred** — intentionally held until all non-optional roadmap work is complete, and it does not block 1.0 (see [docs/phases/phase-05-excel-export.md](../phases/phase-05-excel-export.md)). Its large OOXML implementation cost and manual consumer-validation matrix are deferred until the core product is complete. Every row below is therefore ❌ with the note "Phase 5 deferred"; nothing here is implemented or tested, so no row can be ✅ until Phase 5 is actually delivered.

**Sources:** https://www.ag-grid.com/angular-data-grid/excel-export/ · `/excel-export-api/` · transcribed 2026-08-11
**Phase:** 5 · **Package:** `@libregrid/excel-export`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## API Methods

| Method | Sub-PR | Status | Notes |
|---|---|---|---|
| `exportDataAsExcel` | 5.6 | ❌ | Phase 5 deferred |
| `getDataAsExcel` | 5.6 | ❌ | Returns a Blob · Phase 5 deferred |
| `getSheetDataForExcel` | 5.6 | ❌ | Phase 5 deferred |
| `exportMultipleSheetsAsExcel` | 5.6 | ❌ | Phase 5 deferred |
| `getMultipleSheetsAsExcel` | 5.6 | ❌ | Phase 5 deferred |

## ExcelExportParams

| Property | Sub-PR | Status | Notes |
|---|---|---|---|
| `fileName` | 5.6 | ❌ | Phase 5 deferred |
| `sheetName` | 5.6 | ❌ | Phase 5 deferred |
| `mimeType` | 5.6 | ❌ | Phase 5 deferred |
| `author` | 5.8 | ❌ | Phase 5 deferred |
| `customMetadata` | 5.8 | ❌ | Phase 5 deferred |
| `columnWidth` | 5.4 | ❌ | Phase 5 deferred |
| `rowHeight` | 5.4 | ❌ | Phase 5 deferred |
| `headerRowHeight` | 5.4 | ❌ | Phase 5 deferred |
| `fontSize` | 5.8 | ❌ | Phase 5 deferred |
| `freezeColumns` | 5.4 | ❌ | Phase 5 deferred |
| `freezeRows` | 5.4 | ❌ | Phase 5 deferred |
| `rightToLeft` | 5.4 | ❌ | Phase 5 deferred |
| `allColumns` | 5.8 | ❌ | Phase 5 deferred |
| `columnKeys` | 5.8 | ❌ | Phase 5 deferred |
| `onlySelected` | 5.8 | ❌ | Phase 5 deferred |
| `onlySelectedAllPages` | 5.8 | ❌ | Phase 5 deferred |
| `exportedRows` | 5.8 | ❌ | Phase 5 deferred |
| `rowPositions` | 5.8 | ❌ | Phase 5 deferred |
| `exportRowNumbers` | 5.8 | ❌ | Phase 5 deferred |
| `skipColumnHeaders` | 5.8 | ❌ | Phase 5 deferred |
| `skipColumnGroupHeaders` | 5.8 | ❌ | Phase 5 deferred |
| `skipPinnedTop` | 5.8 | ❌ | Phase 5 deferred |
| `skipPinnedBottom` | 5.8 | ❌ | Phase 5 deferred |
| `skipPinnedRowDuplicates` | 5.8 | ❌ | Phase 5 deferred |
| `skipRowGroups` | 5.5 | ❌ | Phase 5 deferred |
| `rowGroupExpandState` | 5.5 | ❌ | ⭐ outline state · Phase 5 deferred |
| `suppressRowOutline` | 5.5 | ❌ | ⭐ differentiator · Phase 5 deferred |
| `suppressColumnOutline` | 5.5 | ❌ | ⭐ differentiator · Phase 5 deferred |
| `autoConvertFormulas` | 5.7 | ❌ | Phase 5 deferred |
| `processCellCallback` | 5.7 | ❌ | Phase 5 deferred |
| `processHeaderCallback` | 5.7 | ❌ | Phase 5 deferred |
| `processGroupHeaderCallback` | 5.7 | ❌ | Phase 5 deferred |
| `processRowGroupCallback` | 5.5 | ❌ | Phase 5 deferred |
| `processNoteCallback` | 5.9 | ❌ | Optional · Phase 5 deferred |
| `shouldRowBeSkipped` | 5.7 | ❌ | Phase 5 deferred |
| `getCustomContentBelowRow` | 5.7 | ❌ | Phase 5 deferred |
| `transformValues` | 5.7 | ❌ | Phase 5 deferred |
| `valueFrom` | 5.7 | ❌ | Phase 5 deferred |
| `prependContent` | 5.8 | ❌ | Phase 5 deferred |
| `appendContent` | 5.8 | ❌ | Phase 5 deferred |
| `pageSetup` | 5.8 | ❌ | Phase 5 deferred |
| `margins` | 5.8 | ❌ | Phase 5 deferred |
| `headerFooterConfig` | 5.8 | ❌ | Phase 5 deferred |
| `protectSheet` | 5.8 | ❌ | Phase 5 deferred |
| `addImageToCell` | 5.9 | ❌ | Optional — media parts + drawing XML · Phase 5 deferred |
| `exportAsExcelTable` | 5.9 | ❌ | Optional · Phase 5 deferred |
| `suppressGridNotesExport` | 5.9 | ❌ | Optional · Phase 5 deferred |
| `suppressPrependAuthorToNotes` | 5.9 | ❌ | Optional · Phase 5 deferred |

## ExcelStyle

| Property | Sub-PR | Status | Notes |
|---|---|---|---|
| `id` | 5.3 | ❌ | Matches `cellClass` · Phase 5 deferred |
| `font` | 5.3 | ❌ | Phase 5 deferred |
| `interior` | 5.3 | ❌ | Fill · Phase 5 deferred |
| `borders` | 5.3 | ❌ | Phase 5 deferred |
| `numberFormat` | 5.3 | ❌ | Phase 5 deferred |
| `alignment` | 5.3 | ❌ | Phase 5 deferred |
| `protection` | 5.3 | ❌ | Phase 5 deferred |
| `dataType` | 5.3 | ❌ | Phase 5 deferred |

## Correctness gates

| Requirement | Status | Notes |
|---|---|---|
| Opens without repair prompt in **Microsoft Excel** | ❌ | **Gate criterion** · Phase 5 deferred |
| Opens without repair prompt in **LibreOffice Calc** | ❌ | **Gate criterion** · Phase 5 deferred |
| Opens without repair prompt in **Google Sheets** | ❌ | **Gate criterion** · Phase 5 deferred |
| Dates correct incl. 1900 phantom leap day | ❌ | Phase 5 deferred |
| Strings >32,767 chars handled | ❌ | Excel cell limit · Phase 5 deferred |
| Empty grid produces a valid workbook | ❌ | Phase 5 deferred |
| Unicode / emoji / RTL text correct | ❌ | Phase 5 deferred |
| Only runtime dependency is `fflate` | ❌ | Phase 5 deferred |
