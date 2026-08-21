# @libregrid/excel-export

## 1.2.3

### Patch Changes

- cc24da1: minor bug fixes
- Updated dependencies [cc24da1]
  - @libregrid/core@1.2.3
  - @libregrid/menu@1.2.3

## 1.2.2

### Patch Changes

- Updated dependencies [982d1cd]
  - @libregrid/menu@1.2.2
  - @libregrid/core@1.2.2

## 1.2.1

### Patch Changes

- Updated dependencies [b6836f0]
  - @libregrid/menu@1.2.1
  - @libregrid/core@1.2.1

## 1.2.0

### Patch Changes

- Updated dependencies [3a7c86d]
- Updated dependencies [192f180]
- Updated dependencies [c4c47ae]
- Updated dependencies [3a7c86d]
  - @libregrid/menu@1.2.0
  - @libregrid/core@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies [8735c38]
  - @libregrid/core@1.1.1
  - @libregrid/menu@1.1.1

## 1.1.0

### Minor Changes

- 7312462: Add the Phase 5.1 OOXML SpreadsheetML writer skeleton. The package assembles a `.xlsx` ZIP archive with `fflate`, writes the core workbook parts, deduplicates shared strings, and ships an unzip-and-assert test harness with golden fixtures.
- d3dee30: Add Excel data types to the writer (Phase 5.2): booleans, errors, and dates as 1900-system serial numbers including the phantom-leap-day rule. Pre-1900 dates fall back to text, and strings over Excel's 32767-character cell limit are truncated.
- f93785a: Add styling (Phase 5.3): a `xl/styles.xml` part backed by a deduplicating style registry keyed by resolved `ExcelStyle`. Fonts, fills, borders, alignment, protection and number formats map from the AG Grid vocabulary to OOXML, and cells reference styles through the `cellXf` index.
- dd13ee4: Add worksheet layout (Phase 5.4): column widths and runs, row heights and hidden rows, merged cells from `mergeAcross`, freeze panes, and right-to-left sheet views.
- 850d64f: Add grouping outlines (Phase 5.5): row and column `outlineLevel` with row `collapsed` and `hidden` state, so grouped-grid exports keep their expandable outline levels.
- 51865cd: Add the Excel export API (Phase 5.6): `exportDataAsExcel`, `getDataAsExcel`, `getSheetDataForExcel`, `exportMultipleSheetsAsExcel` and `getMultipleSheetsAsExcel`, with `fileName`, `sheetName`, `mimeType` and `activeSheetIndex`. The grid extraction handles grouped rows, styles from `cellClass`/`cellClassRules`, and multi-sheet round-trips.
- 1dad6a3: Add formulas and export callbacks (Phase 5.7): `autoConvertFormulas`, `processCellCallback`, `processHeaderCallback`, `processGroupHeaderCallback`, `processRowGroupCallback`, `shouldRowBeSkipped`, `getCustomContentBelowRow`, `transformValues` and `valueFrom`. Column groups export as merged header rows.
- 1317045: Add export scope, page setup and protection (Phase 5.8): `allColumns`, `columnKeys`, `onlySelected`, `exportedRows`, `rowPositions`, `exportRowNumbers`, the pinned-row and header skip flags, `prependContent`/`appendContent`, `columnWidth`/`rowHeight`/`headerRowHeight`, freeze panes, `rightToLeft`, `pageSetup`, `margins`, `headerFooterConfig`, `protectSheet`, `author`, `customMetadata` and `fontSize`.
