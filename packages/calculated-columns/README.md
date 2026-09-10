# @libregrid/calculated-columns

Add read-only columns derived from other values in the same row, such as
`[revenue] - [cost]`. Define expressions in code or let users create and edit
calculated columns through the column menu.

[Documentation and examples](https://libregrid.dev/calculated-columns)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/calculated-columns
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { CalculatedColumnsModule } from '@libregrid/calculated-columns';

ModuleRegistry.registerModules([AllCommunityModule, CalculatedColumnsModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  calculatedColumns: true, // or { dataTypes, expressionPickers, applyMode, suppressColumnHighlighting }
  columnDefs: [
    { field: 'revenue' },
    { field: 'cost' },
    { colId: 'profit', calculatedExpression: '[revenue] - [cost]', cellDataType: 'number' },
  ],
  rowData: [{ revenue: 120, cost: 40 }],
});
```

Register `ColumnMenuModule` from [`@libregrid/menu`](../menu/README.md) to
expose the editing UI. End users add columns from the column menu (**Add Calculated Column** on any
column's header menu), edit them via **Calculated Column → Edit Calculated
Column**, and remove them via the menu or the cell context menu. Calculated
columns are read-only. Their evaluated values can be sorted, filtered, grouped,
and aggregated when the corresponding modules are registered.

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

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
