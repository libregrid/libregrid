# @libregrid/formulas

Evaluate spreadsheet-style formulas stored in cells. Users can reference cells
and ranges with A1 notation, and calculated values update when referenced data
changes. An optional external data source stores formulas separately from row data.

[Documentation and examples](https://libregrid.dev/formulas)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/formulas
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { FormulasModule } from '@libregrid/formulas';

ModuleRegistry.registerModules([AllCommunityModule, FormulasModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [
    { field: 'product' },
    { field: 'price' },
    { field: 'quantity' },
    { field: 'subtotal', allowFormula: true, editable: true },
  ],
  rowData: [{ product: 'Bananas', price: 2.5, quantity: 6, subtotal: '=B1*C1' }],
  getRowId: (params) => String(params.data.product),
});
```

Formulas are strings starting with `=` stored in the cell value (or in an
external store via `gridOptions.formulaDataSource`). References use A1
notation (`B2`, `$A$1`), ranges (`A1:B10`), and the documented operator and
function set. `gridOptions.formulaFuncs` registers custom functions.

Columns with `allowFormula: true` use the tokenising `agFormulaCellEditor` by
default. Formulas require Client-Side Row Model row IDs; tree data, row
grouping, pivot and server-side row models are not supported by this feature.

## Combining formulas and calculated columns

Use [`@libregrid/calculated-columns`](../calculated-columns/README.md) for
read-only expressions applied to every row. Both packages share an expression
engine: calculated columns use `[colId]` references within a row, while cell
formulas use cell and range references.

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
