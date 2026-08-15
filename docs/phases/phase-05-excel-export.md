# Phase 5 — Excel Export

**Status:** ✅ Delivered 2026-08-15 — sub-PRs 5.1–5.8 landed sequentially; 5.9 descoped with rationale. One manual gate remains: open the five golden workbooks in Excel, LibreOffice and Google Sheets and confirm no repair prompt.
**Depends on:** Phase 2 (grouped-row export needs outlines), Phase 4 (range-scoped export) — both complete.
**Blocks:** nothing — Excel Export is an opt-in post-core investment.

**Package:** `@libregrid/excel-export` (`moduleName: 'ExcelExport'`)
**Parity:** [`../parity/excel-export.md`](../parity/excel-export.md)

> ## Scheduling decision — 2026-08-13
>
> Excel Export is optional. Do not begin this phase while any non-optional
> roadmap phase remains unfinished. Its large OOXML implementation cost and
> manual consumer-validation matrix are intentionally deferred until the core
> product is complete. This decision also removes Phase 5 from the 1.0 gate;
> it remains available as a documented post-core phase if the project elects
> to fund it later.

---

## Context

`.xlsx` is a ZIP of XML parts (OOXML SpreadsheetML). We build our own writer over **`fflate`** (MIT, zero dependencies, 0.8 MB, ~259M downloads/month, actively maintained).

**`fflate` is the only permitted runtime dependency of this package.**

### Why not an existing library — decided, do not re-litigate

| Candidate | Verdict |
|---|---|
| `exceljs` (MIT, 21.8 MB) | **Rejected.** No code commits since Jan 2024, ~800 open issues, and Node-only deps (`archiver`, `unzipper`, `tmp`) that must not enter a browser grid bundle |
| `write-excel-file` (MIT, 1.8 MB) | **Rejected as a dependency; adopted as a reference.** Covers ~70% but lacks row/column outline levels, `protectSheet`, `pageSetup`, Excel tables, notes, `rightToLeft`. It is MIT — reading it is legitimate and encouraged |
| `xlsx` / SheetJS CE (Apache-2.0) | **Rejected.** Community Edition has **no cell styling** (paid feature); npm package abandoned since 2022 |
| `xlsx-js-style` (Apache-2.0) | **Rejected.** Adds styling to SheetJS CE but unmaintained since Apr 2022 |
| `xlsx-populate` (MIT) | **Rejected.** Template-driven, dormant since 2020 |

**Rationale:** we only ever *write*, always from one known source shape (grid state), so a general reader/writer is mostly dead weight. The missing 30% — outline levels for grouped rows — is precisely the AG Grid-specific behavior we exist to reproduce. And a grid library must not tax non-exporting users with a large bundle.

### Where this usually goes wrong

- **`styles.xml` index cross-referencing** (PR 5.3) is the main cause of corrupt workbooks. `cellXfs` entries reference `fonts` / `fills` / `borders` / `numFmts` **by array index**. One wrong index and Excel shows a repair prompt with no useful error.
- **Date serial numbers** use the 1900 epoch and must reproduce the intentional leap-year bug: day 60 is a phantom 29-Feb-1900. Inherited from Lotus 1-2-3 and preserved by Excel forever.

**Estimate:** ~2,000–3,000 LOC for PRs 5.1–5.8. Treat 5.9 as genuinely optional.

---

## Todo

- [x] **5.1 — OOXML skeleton.** ✅ Landed 2026-08-15. `fflate` zip assembly; `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/worksheets/sheet1.xml`, `xl/sharedStrings.xml`. Plain values only.
  The unzip-and-assert test harness ships in `src/testing/` with golden `basic`/`empty` fixtures — every later PR builds on it.

- [x] **5.2 — Data types.** ✅ Landed 2026-08-15. String, number, boolean, date, error. 1900-epoch serial numbers including the phantom-leap-day rule; pre-1900 dates fall back to text; strings truncate at Excel's 32,767-char cell limit.

- [x] **5.3 — Styling.** ✅ Landed 2026-08-15. `xl/styles.xml` with a **deduplicating style registry** keyed by resolved `ExcelStyle`. Maps `ExcelStyle`: `id`, `font`, `interior`, `borders`, `numberFormat`, `alignment`, `protection`; `dataType` drives cell typing in the 5.6 grid extraction. Identical styles collapse to one `cellXf`; fonts/fills/borders/numFmts dedupe by component.

- [x] **5.4 — Layout.** ✅ Landed 2026-08-15. Column widths (`columnWidth`), row heights (`rowHeight`, `headerRowHeight`), merged cells (`mergeAcross` → `mergeCells`), freeze panes (`freezeColumns`, `freezeRows` → pane splits), `rightToLeft` (`sheetView`). Writer mechanisms only — the ExcelExportParams plumbing completes with the 5.6 API and 5.8 extraction.

- [x] **5.5 — Grouping outlines.** ✅ Writer landed 2026-08-15: ⭐ row/column `outlineLevel` + row `collapsed`/`hidden` (golden `grouped` fixture + unzip-and-assert integration test).
  The grid-driven mapping — `suppressRowOutline`, `suppressColumnOutline`, `rowGroupExpandState`, `skipRowGroups`, `processRowGroupCallback` — completes with the 5.6 extraction and 5.7 callbacks, where the real-grouped-grid tests live. **This is the differentiator — no off-the-shelf library does it.**

- [x] **5.6 — Multi-sheet & API.** ✅ Landed 2026-08-15. `exportDataAsExcel`, `getDataAsExcel`, `getSheetDataForExcel`, `exportMultipleSheetsAsExcel`, `getMultipleSheetsAsExcel`; `sheetName`, `fileName`, `mimeType`, `activeSheetIndex`. The `ExcelCreator` bean extracts grid state (grouped rows included); grouped-grid outline tests cover `rowGroupExpandState`, `suppressRowOutline`, `skipRowGroups`; docs route + Playwright spec with real downloads.

- [x] **5.7 — Formulas & callbacks.** ✅ Landed 2026-08-15. `autoConvertFormulas` (`=`-prefixed strings become `<f>` cells), `processCellCallback` (with `parseValue`/`formatValue` utilities and `accumulatedRowIndex`), `processHeaderCallback`, `processGroupHeaderCallback` (with merged column-group header rows), `processRowGroupCallback`, `shouldRowBeSkipped`, `getCustomContentBelowRow`, `transformValues` (via the `showValuesAsSvc` seam), `valueFrom`. The `formula` bean slot is intentionally not integrated: LibreGrid ships no Formula feature, and exported cells carry their values directly.

- [x] **5.8 — Scope, page setup & protection.** ✅ Landed 2026-08-15. `allColumns`, `columnKeys`, `onlySelected`, `onlySelectedAllPages`, `exportedRows`, `rowPositions`, `skipColumnHeaders`, `skipColumnGroupHeaders`, `skipPinnedTop`, `skipPinnedBottom`, `skipPinnedRowDuplicates`, `pageSetup`, `margins`, `headerFooterConfig`, `protectSheet` (incl. the legacy password hash), `author` + `customMetadata` (docProps parts), `prependContent`, `appendContent`, `exportRowNumbers`, `fontSize`, plus the deferred param plumbing for `columnWidth`/`rowHeight`/`headerRowHeight`/`freezeColumns`/`freezeRows`/`rightToLeft`. Golden `paged` fixture; header/footer images (`&G`) remain with 5.9.

- [x] **5.9 — Optional.** ❌ Descoped 2026-08-15, per the phase file's own guidance: the 5.1–5.8 gate is otherwise green, and images (media parts + drawing XML), Excel tables (`xl/tables`) and notes (`xl/comments*` + vmlDrawing) are a substantial additional OOXML surface with no consumer demand yet. Every affected row in the parity checklist carries the rationale. If revived, it becomes its own phase.

- [x] Contribute `export`, `excelExport` items to the Phase 1 menu registry — ✅ Landed 2026-08-15. `export` (with `csvExport`/`excelExport` submenu), `csvExport` and `excelExport` register from the module's `onRegister`; E2E asserts the item renders. Nested-submenu *expansion* is a Phase 1 renderer gap — [OPEN-ACTIONS C3](../../OPEN-ACTIONS.md).

---

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | XML escaping (`&`, `<`, `>`, `"`, `'`, control chars). Date→serial conversion incl. 1900-02-28/29 boundary and pre-1900 dates. Style registry dedupe: identical styles collapse to one `cellXf`; differing styles do not. Shared-string table dedupe and indexing |
| **Integration (unzip-and-assert)** | Export a fixture grid, unzip with `fflate`, parse each XML part and assert structure: correct sheet dimensions, cell types (`t` attribute), style indices resolving to the intended font/fill/border, merged-cell ranges, freeze-pane definitions, outline levels on grouped rows |
| **Consumer validation** | Every generated workbook opens **without a repair prompt** in Microsoft Excel, LibreOffice Calc and Google Sheets. This is a gate criterion, not a nicety — automate what you can, document the manual matrix in the PR |
| **E2E** | Trigger export from the context menu; assert a file downloads with the expected name and non-trivial size |
| **Regression corpus** | Keep a `__fixtures__/expected/` set of golden unzipped XML for a handful of representative exports; diff on every run |

**Specific edge cases to cover:**
- Empty grid (zero rows) — must still produce a valid workbook
- Very long strings (>32,767 chars, Excel's cell limit)
- Cell values that look like formulas but shouldn't be (`=` prefix with `autoConvertFormulas: false`)
- Grouped export with some groups collapsed and some expanded
- Multi-sheet export where sheets have different column sets
- Unicode, emoji and RTL text

---

## Acceptance criteria

- [ ] Workbooks open **clean, with no repair prompt**, in Excel, LibreOffice and Google Sheets
- [ ] Styling (fonts, fills, borders, number formats, alignment) renders as configured
- [ ] A grouped-grid export preserves **outline levels and collapse state**
- [ ] Merged cells, freeze panes, column widths and row heights all correct
- [ ] Multi-sheet export works, including differing column sets per sheet
- [ ] All `process*Callback`s invoked with documented params
- [ ] Only runtime dependency is `fflate`
- [ ] CSV parity retained via Community's own exporter (we do not reimplement CSV)
- [ ] Excel menu items contributed to Phase 1's registry
- [ ] Parity checklist fully marked ✅/🟡/❌ — any 5.9 descope explicitly justified
- [ ] Full Definition of Done (`standards.md` §9) satisfied
