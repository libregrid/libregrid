# Parity — Calculated Columns

> Parity-audited 2026-08-20 (behavior verified against `ag-grid-community@36.1.0` seams) — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/angular-data-grid/calculated-columns/ · transcribed 2026-08-20 (the operator/function set comes from `/formula-reference/`)
**Phase:** 18 · **Package:** `@libregrid/calculated-columns`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `calculatedColumns` (boolean) | ✅ | Enables/disables; disabled leaves declared calculated columns blank and hides the menu entries |
| `calculatedColumns.dataTypes` | 🟡 | Dialog type selector lists the given names (default `text`/`number`/`date`/`boolean`); the docs' validation that each entry is a built-in or `dataTypeDefinitions`-registered type is not performed |
| `calculatedColumns.expressionPickers` | ✅ | `'columns'`, `'functions'`, `'operators'` each show/hide their picker |
| `calculatedColumns.applyMode` | ✅ | `'live'` applies every change; `'deferred'` validates and applies via Apply/Cancel |
| `calculatedColumns.suppressColumnHighlighting` | ✅ | Disables the edit highlight |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `calculatedExpression` | ✅ | Same-row bracket references (`[colId]`, defaults to `field`); chained calculated references resolve transitively |
| Explicit `colId` on app-declared columns | 🟡 | The docs require it; Community logs its standard duplicate-id warning when missing — not separately gated by this package |
| Read-only enforcement | ✅ | Community refuses editing, paste and `setValue` on calculated columns (`isCalculatedCol`); integration-tested |
| `aggFunc` on group rows | ✅ | Leaf values evaluate per row and aggregate on group rows (group + grand total); integration-tested with `@libregrid/row-grouping` |
| Pivot value/pivot-column semantics | 🟡 | Relies on the standard `aggFunc`/`pivot: true` colDef paths; pivot-result integration is untested |
| All row models (same-row refs) | 🟡 | Values flow through Community's model-agnostic `getValueFromData`; verified for Client Row Model only |

## Dialog

| Requirement | Status | Notes |
|---|---|---|
| Add Calculated Column (column menu, any column) | ✅ | Creates the column after the source column and opens the dialog |
| Edit Calculated Column (calculated column menu) | ✅ | Title, type and expression |
| Remove Calculated Column (calculated column menu) | ✅ | Declared columns are tombstoned; created columns are dropped |
| Remove Calculated Column (cell context menu) | ✅ | Offered on calculated-column cells only |
| Title / type / expression fields | ✅ | Type list comes from `dataTypes` |
| Column, function and operator pickers | ✅ | Insert at the cursor |
| Inline autocomplete | ✅ | Column references while typing `[`; function names while typing an identifier; keyboard navigable |
| `live` apply mode | ✅ | Every keystroke applies; invalid expressions render their error code until fixed |
| `deferred` apply mode | ✅ | Apply validates; invalid blocks; Cancel/close discards |
| Editing highlight | ✅ | `isHighlightedColumn` drives Community's `ag-calculated-column-highlighted` header/cell CSS; refreshed on open/close |
| Group-path display references | 🟡 | The docs' dialog shows header-name references (`[2025 Q4]`) translated to colIds on save; the v1 editor stores `[colId]` directly with the display name as the picker label (documented simplification) |

## Events

| Event | Status | Notes |
|---|---|---|
| `calculatedColumnCreated` | ✅ | |
| `calculatedColumnExpressionChanged` | ✅ | Carries `oldExpression` |
| `calculatedColumnRemoved` | ✅ | |
| `calculatedColumnValidationStateChanged` | ✅ | Flips fire with `valid` and `reason` (`unknownReference` / `invalidExpression`), including cascades from column-set changes |

## Grid State

| Requirement | Status | Notes |
|---|---|---|
| Created columns round-trip through Grid State | ✅ | `userColumns` section; integration-tested (`api.getState()` → `initialState`) |
| Removed declared columns stay removed across restores | ✅ | User-layer tombstone; integration-tested |

## Expression engine

| Requirement | Status | Notes |
|---|---|---|
| Operators `+ - * / ^ & = <> > < >= <= %` | ✅ | Spreadsheet precedence (exponentiation binds tighter than unary minus); unit-tested |
| Provided functions | ✅ | `SUM`, `PRODUCT`, `MIN`, `MAX`, `AVERAGE`, `MEDIAN`, `POWER`, `RAND`, `NOW`, `TODAY`, `CONCAT`, `IF` (lazy), `COUNT`, `COUNTA`, `COUNTBLANK`, `AND`, `OR`, `NOT` |
| `SUMIF` / `COUNTIF` | 🟡 | Implemented for array arguments (criteria strings supported); cell ranges are a Formulas feature (gap-plan A1), so same-row usage errors `#VALUE!` |
| Error codes | ✅ | `#REF!`, `#NAME?`, `#CIRCREF!`, `#PARSE!`, `#VALUE!`, `#DIV/0!`, `#ERROR!` render in the cell; Community applies `formula-error` CSS and the error tooltip |
