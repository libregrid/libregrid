# Parity — Formulas

> Parity-audited 2026-08-24 (behaviour verified against `ag-grid-community@36.1.0` seams and the public v36.1.0 docs pages).

**Source:** https://www.ag-grid.com/javascript-data-grid/formulas/ · `/formula-editor-component/` · `/formula-reference/` · `/formula-custom-functions/` · transcribed 2026-08-24
**Phase:** 20 · **Package:** `@libregrid/formulas`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Enabling

| Requirement | Status | Notes |
|---|---|---|
| `colDef.allowFormula: true` | ✅ | Community gates the display/edit paths on it; the service resolves values |
| Row IDs (`getRowId`) | ✅ | Required for reference stability; ranges map A1 rows through displayed rows |
| `agFormulaCellEditor` as the default editor | ✅ | Community assigns the name itself; the module registers the component |

## Formula syntax

| Requirement | Status | Notes |
|---|---|---|
| `=`-prefixed strings in cell values | ✅ | Resolved through `formula.resolveValue` on every read |
| A1-notation cell references (`B2`, `AA12`) | ✅ | Letters map over displayed columns (excluding `ag-Grid-*` service columns); rows over displayed rows |
| `$`-absolute references (`$A$1`, `A$1`, `=$A1`) | ✅ | Parse + fill-offset semantics (absolute anchors never shift) |
| Ranges `A1:B2` (reversed bounds normalised) | ✅ | Row-major resolution; `SUM`, `SUMIF`, `COUNTIF`, `COUNT`, custom functions |
| Operators `+ - * / ^ & = <> > < >= <= %` | ✅ | Shared with calculated columns; spreadsheet precedence (exponentiation binds tighter than unary minus) |
| Constants: numbers, strings, `TRUE`/`FALSE` | ✅ | |
| Long-hand storage format (col/row IDs) | ✅ | LibreGrid-defined grammar (the site documents the concept, not the syntax): cell `[colId:rowId]`, range `[colIdStart:rowIdStart..colIdEnd:rowIdEnd]`; `normaliseFormula` converts both ways; editor commits long-hand |
| Long-hand conversion rules on the Formula Reference page | 🟡 | The site cross-references conversion rules that do not exist on the page; LibreGrid documents its own grammar here and in the README |

## Built-in functions (Formula Reference)

| Requirement | Status | Notes |
|---|---|---|
| `SUM`, `PRODUCT`, `MIN`, `MAX`, `AVERAGE`, `MEDIAN`, `POWER`, `RAND`, `NOW`, `TODAY`, `CONCAT`, `IF` (lazy), `COUNT`, `COUNTA`, `COUNTBLANK`, `AND`, `OR`, `NOT` | ✅ | Phase 18 registry, unchanged |
| `SUMIF(range, criteria, [sum_range])` with cell ranges | ✅ | Ranges arrive as arrays; criteria strings and operators supported |
| `COUNTIF(range, criteria)` with cell ranges | ✅ | |
| Error codes `#REF! #NAME? #CIRCREF! #PARSE! #VALUE! #DIV/0! #ERROR!` | ✅ | Rendered in the cell; Community applies the `formula-error` CSS class and the hover tooltip (location `cellFormula`). On explicit `cellDataType: 'number'` columns Community's number formatter formats the error string (`Invalid Number`) — the class and tooltip still identify the error |

## Storage

| Requirement | Status | Notes |
|---|---|---|
| Formulas in row data (default) | ✅ | `=…` string lives in the field; committed through the normal setters |
| `gridOptions.formulaDataSource` | ✅ | `init({api, context})` / `getFormula` / `setFormula` / `destroy` lifecycle via the `formulaDataSvc` bean |
| Formula columns without `field`/`valueSetter` | ✅ | Community's `isSetValueSupported` permits formula writes when an external store exists. With a data source configured, Community routes committed formulas into the store and writes the computed value into the row-data field — even for field columns; the formula editor reads the stored formula on re-entry (`getEditableFormula`) so re-editing never shows the evaluated value |
| Lazy `getFormula` cache, invalidated on edits / row refresh / column changes | ✅ | Text cache keyed `rowId:colId`; invalidated by `cellValueChanged`-driven hooks, `onRowsChanged`, `setFormulasActive`, `refreshFormulas`, and every `setFormula` call through the data service (so Community's immediate re-evaluation inside the commit path reads the new store entry) |
| `api.refreshFormulas()` / `(rowNode)` / `(rowId)` | ✅ | Reserved `_FormulaGridApi` slot; returns `false` for no-op cases; `true` triggers the repaint (the Community edit service relies on the same behaviour after batch commits) |
| Excel export exports the formulas themselves | 🟡 | CSV export evaluates (verified); Excel export of the raw formula string relies on Community's export paths and is not separately verified — see `excel-export.md` |

## Formula Cell Editor

| Requirement | Status | Notes |
|---|---|---|
| Default editor for `allowFormula` columns | ✅ | Registered as `agFormulaCellEditor`; any explicit `cellEditor` opts out (formulas still evaluate) |
| Tokenised display (refs, functions, numbers, strings, operators) | ✅ | Overlay behind a transparent input; theme-token colours |
| Shorthand display ⇄ long-hand commit | ✅ | `normaliseFormula` both directions |
| Function autocomplete while typing | ✅ | Built-ins + `formulaFuncs` names; keyboard navigable; Enter/Tab accept |
| `validateFormulas: true` live validation | ✅ | Inline error status + `lgr-formula-invalid`; `isCancelAfterEnd` blocks the commit |
| Range highlights + range-handle editing while editing | ✅ | Referenced ranges highlight through the Cell Selection module when registered; silent degradation without it |
| Clicking a row number adds a row range to the formula | 🟡 | No cross-package contract exists between the editor and the row-number click surface; the editor supports row ranges by typing (`A1:A10`), but the click-to-insert interaction is not wired |
| `formulaInputManager` coordination | ✅ | Editor registers/unregisters on open/close |

## Custom functions

| Requirement | Status | Notes |
|---|---|---|
| `gridOptions.formulaFuncs` (`{ [name]: { func } }`) | ✅ | Consulted before the built-ins; names join `getFunctionNames()` |
| `FormulaFunctionParams` (`row`, `column`, `args: ValueParam \| RangeParam`, `values`) | ✅ | Range args stay `RangeParam`-shaped for custom functions; `values` flattens lazily |
| Throws surface as `#ERROR!` + tooltip and propagate | ✅ | Verified for direct calls and dependent cells |

## Compatibility table (docs)

| Feature | Status | Notes |
|---|---|---|
| Fill Handle offsets relative refs | ✅ | `@libregrid/cell-selection`'s fill consults the `formula` bean (`updateFormulaByOffset`) when registered; absolute `$` anchors stay fixed; verbatim copy without the module |
| Cell Selection | ✅ | Optional module; range highlights + handles when registered |
| Row Numbers | ✅ | Independent module; click-to-insert row range is 🟡 (above) |
| Cell Expressions | ❌ | Docs: not supported; Community's `enableCellExpressions` path is untouched |
| Tree Data and Row Grouping | ❌ | Docs: not supported. Guarded: tree data or active row grouping keep `active` off and formula cells render blank |
| Pivoting and Aggregation | ❌ | Docs: not supported; pivot mode keeps `active` off |
| Master Detail | ❌ | Docs: not supported; no detail-grid propagation |
| Server-Side, Infinite, Viewport Row Models | ❌ | Docs: not supported; eligibility guard keeps `active` off and per-cell formulas unevaluated |

## Coexistence

| Requirement | Status | Notes |
|---|---|---|
| `@libregrid/calculated-columns` alongside | ✅ | Both modules declare the same `FormulaService` class; the context dedupes module beans by class identity, so exactly one instance serves both features in either registration order (integration-tested) |
| `@libregrid/calculated-columns` public API | ✅ | The engine symbols it exported in 1.x re-export from `@libregrid/formulas`; `CalculatedColumnFormulaService` remains an alias of `FormulaService` |

## Engine (shared core)

| Requirement | Status | Notes |
|---|---|---|
| Same-row `[colId]` expressions (calculated columns) | ✅ | Phase 18 behaviour unchanged; regression suite green |
| A1/`$`/range/long-hand parsing | ✅ | One grammar, two parse modes (`expression` / `cell`) |
| Circular-reference detection | ✅ | Column chain (calculated) + cell chain (`rowId:colId`) |
| Precedence-preserving serialisation | ✅ | Parenthesisation on round-trip; fill-offset rewriting |
