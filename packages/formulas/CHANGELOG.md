# @libregrid/formulas

## 1.3.3

### Patch Changes

- @libregrid/core@1.3.3

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

- @libregrid/core@1.3.1
