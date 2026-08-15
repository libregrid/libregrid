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
| `columnWidth` | 5.4 | ✅ | Writer mechanism: `ExcelColumn.width` → `<col width customHeight>`; param plumbing in 5.8 |
| `rowHeight` | 5.4 | ✅ | Writer mechanism: `ExcelRow.height` → `<row ht customHeight>`; param plumbing in 5.8 |
| `headerRowHeight` | 5.4 | 🟡 | Writer mechanism ready (5.4); param plumbing lands in 5.8 |
| `fontSize` | 5.8 | ⬜ | sub-PR 5.8 |
| `freezeColumns` | 5.4 | ✅ | Writer mechanism: pane `xSplit`/`activePane`; param plumbing in 5.8 |
| `freezeRows` | 5.4 | ✅ | Writer mechanism: pane `ySplit`/`activePane`; param plumbing in 5.8 |
| `rightToLeft` | 5.4 | ✅ | Writer mechanism: `sheetView rightToLeft`; param plumbing in 5.8 |
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
| `skipRowGroups` | 5.5 | 🟡 | Writer outline mechanism landed (5.5); grid-driven mapping lands with the 5.6 extraction |
| `rowGroupExpandState` | 5.5 | 🟡 | ⭐ outline state — writer emits `outlineLevel`/`collapsed`/`hidden` (5.5); grid-driven expansion mapping lands with 5.6 |
| `suppressRowOutline` | 5.5 | 🟡 | ⭐ differentiator — writer mechanism landed (5.5); param plumbing lands with 5.6 |
| `suppressColumnOutline` | 5.5 | 🟡 | ⭐ differentiator — writer mechanism landed (5.5); param plumbing lands with 5.6 |
| `autoConvertFormulas` | 5.7 | ⬜ | sub-PR 5.7 |
| `processCellCallback` | 5.7 | ⬜ | sub-PR 5.7 |
| `processHeaderCallback` | 5.7 | ⬜ | sub-PR 5.7 |
| `processGroupHeaderCallback` | 5.7 | ⬜ | sub-PR 5.7 |
| `processRowGroupCallback` | 5.5 | 🟡 | Writer outline mechanism landed (5.5); callback plumbing lands with 5.7 |
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
| `id` | 5.3 | ✅ | Matches `cellClass` via `cell.styleId`; array ids merge, later wins |
| `font` | 5.3 | ✅ | Deduplicated fonts; ARGB colour mapping incl. named colours |
| `interior` | 5.3 | ✅ | Fill; all 18 AG Grid patterns mapped to OOXML patternType |
| `borders` | 5.3 | ✅ | lineStyle × weight mapped to OOXML border styles |
| `numberFormat` | 5.3 | ✅ | Built-in ids reused; custom formats assigned ids from 164 |
| `alignment` | 5.3 | ✅ | Horizontal/vertical/readingOrder/indent/rotate/wrap/shrink |
| `protection` | 5.3 | ✅ | Mapped in styles.xml; enforced together with `protectSheet` in 5.8 |
| `dataType` | 5.3 | 🟡 | Excluded from the style-dedupe signature by design; drives cell typing during grid extraction in 5.6 |

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
