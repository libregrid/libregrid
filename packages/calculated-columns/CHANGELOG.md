# @libregrid/calculated-columns

## 1.3.4

### Patch Changes

- Updated dependencies
  - @libregrid/core@1.3.4
  - @libregrid/formulas@1.3.4
  - @libregrid/menu@1.3.4

## 1.3.3

### Patch Changes

- @libregrid/core@1.3.3
  - @libregrid/formulas@1.3.3
  - @libregrid/menu@1.3.3

## 1.3.1

### Patch Changes

- c1c53ea: Add `@libregrid/formulas` — per-cell spreadsheet formulas (gap-plan A1, Phase 20) —
  and move the shared expression engine out of `@libregrid/calculated-columns`.

  - New `@libregrid/formulas` package: `=…` cell formulas with A1 notation (`B2`,
    `$A$1`), ranges (`A1:B10`), and the LibreGrid long-hand col/row-ID storage form
    (`[colId:rowId]`, `[colIdStart:rowIdStart..colIdEnd:rowIdEnd]`); the canonical
    `formula` bean (`FormulaService`), `formulaDataSource` external store
    (`FormulaDataService`), `formulaInputManager` editor coordination, the
    tokenising `agFormulaCellEditor` (autocomplete, live validation, range
    highlights), and the reserved `refreshFormulas` grid API.
  - `@libregrid/calculated-columns` now declares the same `FormulaService` class, so
    both modules share one bean instance per grid in either registration order.
    Its engine re-exports (`parseExpression`, `FormulaError`, …) resolve to
    `@libregrid/formulas`; `CalculatedColumnFormulaService` is an alias of
    `FormulaService`.
  - `SUMIF`/`COUNTIF` accept cell ranges in both features (previously array-only).
  - `@libregrid/cell-selection` fill shifts relative references through the
    `formula` bean when it is registered (`updateFormulaByOffset`); without the
    module the fill copies values verbatim.
  - Restriction guards: tree data, pivot mode, active row grouping, and non-CSR row
    models keep formulas inactive and render formula cells blank, per the docs
    compatibility table.
  - Docs app: Formulas route (`/formulas`), feature-catalog entry, and a Playwright
    e2e battery (axe light/dark included).

- Updated dependencies [c1c53ea]
  - @libregrid/formulas@1.3.1
  - @libregrid/core@1.3.1
  - @libregrid/menu@1.3.1

## 1.3.0

### Patch Changes

- @libregrid/core@1.3.0
  - @libregrid/menu@1.3.0

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
  - @libregrid/core@1.2.1
  - @libregrid/menu@1.2.1

## 1.2.0

### Minor Changes

- 192f180: Calculated columns (gap-plan A2, Phase 18): read-only derived data columns with spreadsheet-style expressions. New `@libregrid/calculated-columns` package — the `calculatedColsSvc` + `formula` bean implementations over Community's v36.1.0 seams: bracket-reference expression engine with provided functions and formula error codes, dialog-created columns with anchor placement and Grid State persistence, menu contributions, edit highlighting and the four `calculatedColumn*` events. The accessible add/edit modal includes a visual token canvas, draggable and keyboard-insertable Columns/Functions/Operators/Values palettes, movable and removable expression pills, inline literal editing, a synchronized raw formula field, and live/deferred apply modes. `@libregrid/menu` gains the `calculatedColumn` (column menu) and `calculatedColumnRemove` (context menu) default stubs.

### Patch Changes

- Updated dependencies [3a7c86d]
- Updated dependencies [192f180]
- Updated dependencies [c4c47ae]
- Updated dependencies [3a7c86d]
  - @libregrid/menu@1.2.0
  - @libregrid/core@1.2.0
