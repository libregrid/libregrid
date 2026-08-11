# Phase 5 — Excel Export

**Status:** ⬜ Not started
**Depends on:** Phase 2 (grouped-row export needs outlines), Phase 4 (range-scoped export)
**Blocks:** nothing

**Package:** `@libregrid/excel-export` (`moduleName: 'ExcelExport'`)
**Parity:** [`../parity/excel-export.md`](../parity/excel-export.md)

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

- [ ] **5.1 — OOXML skeleton.** `fflate` zip assembly; `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/worksheets/sheet1.xml`, `xl/sharedStrings.xml`. Plain values only.
  **Build the unzip-and-assert test harness here — every later PR depends on it.**

- [ ] **5.2 — Data types.** String, number, boolean, date. 1900-epoch serial numbers including the phantom-leap-day rule.

- [ ] **5.3 — Styling.** `xl/styles.xml` with a **deduplicating style registry** keyed by resolved `ExcelStyle`. Map `ExcelStyle`: `id`, `font`, `interior`, `borders`, `numberFormat`, `alignment`, `protection`, `dataType`.

- [ ] **5.4 — Layout.** Column widths (`columnWidth`), row heights (`rowHeight`, `headerRowHeight`), merged cells, freeze panes (`freezeColumns`, `freezeRows`), `rightToLeft`.

- [ ] **5.5 — Grouping outlines.** ⭐ Row/column `outlineLevel` + `collapsed`, driven by grid row groups. Implements `suppressRowOutline`, `suppressColumnOutline`, `rowGroupExpandState`, `skipRowGroups`, `processRowGroupCallback`.
  **This is the differentiator — no off-the-shelf library does it.**

- [ ] **5.6 — Multi-sheet & API.** `exportDataAsExcel`, `getDataAsExcel`, `getSheetDataForExcel`, `exportMultipleSheetsAsExcel`, `getMultipleSheetsAsExcel`; `sheetName`, `fileName`, `mimeType`.

- [ ] **5.7 — Formulas & callbacks.** `autoConvertFormulas`, the `formula` bean, and every `process*Callback` plus `shouldRowBeSkipped`, `getCustomContentBelowRow`, `transformValues`, `valueFrom`.

- [ ] **5.8 — Scope, page setup & protection.** `allColumns`, `columnKeys`, `onlySelected`, `onlySelectedAllPages`, `exportedRows`, `rowPositions`, `skipColumnHeaders`, `skipColumnGroupHeaders`, `skipPinnedTop`, `skipPinnedBottom`, `skipPinnedRowDuplicates`, `pageSetup`, `margins`, `headerFooterConfig`, `protectSheet`, `author`, `customMetadata`, `prependContent`, `appendContent`, `exportRowNumbers`, `fontSize`.

- [ ] **5.9 — Optional, only if the gate is otherwise green.** Images (`addImageToCell` — needs `xl/media/*`, drawing XML, relationships), Excel tables (`exportAsExcelTable`), notes (`processNoteCallback`, `suppressGridNotesExport`, `suppressPrependAuthorToNotes`).
  If descoped, mark ❌ in the parity checklist with rationale.

- [ ] Contribute `export`, `excelExport` items to the Phase 1 menu registry

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
