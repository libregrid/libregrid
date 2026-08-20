# @libregrid/calculated-columns

Read-only derived data columns: spreadsheet-style expressions that reference other
columns in the same row (`[revenue] - [cost]`), declared in code or created and
edited by end users from the column menu.

Replaces AG Grid Enterprise's `CalculatedColumns` module.

## Install

```bash
npm install ag-grid-community @libregrid/calculated-columns
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { CalculatedColumnsModule } from '@libregrid/calculated-columns';

ModuleRegistry.registerModules([AllCommunityModule, CalculatedColumnsModule]);

const api = createGrid(document.querySelector('#grid')!, {
  calculatedColumns: true, // or { dataTypes, expressionPickers, applyMode, suppressColumnHighlighting }
  columnDefs: [
    { field: 'revenue' },
    { field: 'cost' },
    { colId: 'profit', calculatedExpression: '[revenue] - [cost]', cellDataType: 'number' },
  ],
  rowData: [{ revenue: 120, cost: 40 }],
});
```

End users add columns from the column menu (**Add Calculated Column** on any
column's header menu), edit them via **Calculated Column → Edit Calculated
Column**, and remove them via the menu or the cell context menu. Calculated
columns are always read-only — Community's edit/paste paths refuse them — and
values flow through Community's own formula seam (`formula.resolveValue`), so
sorting, filtering, grouping (`aggFunc`), and pivoting behave like any other
column.

## Expressions

- Bracket references read same-row values by `colId` (defaults to `field`):
  `[revenue] * 2`.
- Operators: `+ - * / ^ & = <> > < >= <= %`.
- Provided functions: `SUM`, `PRODUCT`, `MIN`, `MAX`, `AVERAGE`, `MEDIAN`,
  `POWER`, `RAND`, `NOW`, `TODAY`, `CONCAT`, `IF`, `COUNT`, `COUNTA`,
  `COUNTBLANK`, `AND`, `OR`, `NOT`. `SUMIF`/`COUNTIF` accept array arguments
  (cell ranges arrive with the Formulas feature).
- Values pills insert a matching inline editor in the expression canvas for
  text, numbers, booleans, and ISO dates. The date control serializes to a
  quoted `"YYYY-MM-DD"` literal when it loses focus.
- Errors render as spreadsheet codes in the cell (`#REF!`, `#NAME?`, `#CIRCREF!`,
  `#PARSE!`, `#VALUE!`, `#DIV/0!`, `#ERROR!`) with the Community formula-error
  styling and tooltip.

## Events

- `calculatedColumnCreated` / `calculatedColumnRemoved`
- `calculatedColumnExpressionChanged` (`oldExpression` included)
- `calculatedColumnValidationStateChanged` (`valid`, `reason` on flips)

## Notes

- Dialog-created columns persist through Grid State (`api.getState()` /
  `initialState`) via the Community user-column layer.
- `calculatedColumns: false` (or unset) leaves declared calculated columns
  blank and hides the menu entries.

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
