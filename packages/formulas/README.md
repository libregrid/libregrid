# @libregrid/formulas

Spreadsheet-style cell formulas: users type `=...` expressions into grid cells —
A1-notation references, ranges, operators and functions — and values recompute
automatically when referenced data changes. Includes the tokenising formula cell
editor, an external `formulaDataSource` store, and custom function registration.

Replaces AG Grid Enterprise's `Formula` module.

## Install

```bash
npm install ag-grid-community @libregrid/formulas
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { FormulasModule } from '@libregrid/formulas';

ModuleRegistry.registerModules([AllCommunityModule, FormulasModule]);

const api = createGrid(document.querySelector('#grid')!, {
  columnDefs: [
    { field: 'product' },
    { field: 'price' },
    { field: 'quantity' },
    { field: 'subtotal', allowFormula: true },
  ],
  rowData: [
    { product: 'Bananas', price: 2.5, quantity: 6, subtotal: '=C2*B2' },
  ],
  getRowId: (params) => String(params.data.product),
});
```

Formulas are strings starting with `=` stored in the cell value (or in an
external store via `gridOptions.formulaDataSource`). References use A1
notation (`B2`, `$A$1`), ranges (`A1:B10`), and the documented operator and
function set. `gridOptions.formulaFuncs` registers custom functions.

Columns with `allowFormula: true` use the tokenising `agFormulaCellEditor` by
default. Formulas require Client-Side Row Model row IDs; tree data, row
grouping, pivot and server-side row models are not supported (per the AG Grid
documentation).

## The `formula` bean and `@libregrid/calculated-columns`

This package owns the canonical `formula` bean implementation. When
`@libregrid/calculated-columns` is installed alongside, both modules declare the
same service class, so exactly one instance serves both features — calculated
columns keep their same-row `[colId]` expressions, per-cell formulas gain
cell/range references.

## Attribution

LibreGrid is an independent open-source project and is not affiliated with AG
Grid Ltd. "AG Grid" is a trademark of AG Grid Ltd. This package implements
contracts published under MIT in `ag-grid-community`; no AG Grid Enterprise
code is used or inspected.
