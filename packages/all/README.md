# @libregrid/all

Convenience barrel that re-exports every LibreGrid module and helper from a
single package. Use it for quick starts, prototypes, and demos. In a real
application, import individual feature packages instead. Your bundle then
contains exactly the features you use.

## Install

```bash
npm install ag-grid-community @libregrid/all
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency. Installing
this one package pulls in every `@libregrid/*` feature package as a regular
dependency, including `@libregrid/angular` and `@libregrid/material`. If you
use those two, also install their peer dependencies (`@angular/*`).

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { RowGroupingModule, SetFilterModule, CellSelectionModule } from '@libregrid/all';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, SetFilterModule, CellSelectionModule]);

createGrid(document.querySelector('#grid')!, {
  columnDefs: [
    { field: 'country', rowGroup: true, hide: true },
    { field: 'product' },
    { field: 'sales', aggFunc: 'sum' },
  ],
  rowData: [
    { country: 'United Kingdom', product: 'Widget', sales: 120 },
    { country: 'United States', product: 'Widget', sales: 240 },
  ],
});
```

Every export from every LibreGrid package is available from this one import.
See each package's own README for what it exports. See the
[migration guide](https://github.com/libregrid/libregrid/blob/main/docs/guides/migration-guide.md)
for the full package list.

### Why not use this in production

Bundlers tree-shake unused named exports. `@libregrid/all` still adds every
`@libregrid/*` package to your dependency graph, and, transitively,
`@angular/material` and `@angular/cdk` through `@libregrid/material`. Feature
packages avoid that entirely. Install only what you use:

```bash
npm install ag-grid-community @libregrid/row-grouping @libregrid/set-filter
```

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
