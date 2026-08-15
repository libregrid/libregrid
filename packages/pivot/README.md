# @libregrid/pivot

Client-side pivoting on top of `@libregrid/row-grouping`'s aggregation
pipeline — pivot columns generate result columns deterministically before
aggregation runs.

Replaces AG Grid Enterprise's `Pivot` module.

## Install

```bash
npm install ag-grid-community @libregrid/pivot
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/row-grouping` is installed automatically. Pivot mode reuses its
grouping and aggregation stages.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { PivotModule } from '@libregrid/pivot';

ModuleRegistry.registerModules([AllCommunityModule, PivotModule]);

createGrid(document.querySelector('#grid')!, {
  columnDefs: [
    { field: 'country', rowGroup: true, enableRowGroup: true },
    { field: 'product', rowGroup: true, enableRowGroup: true },
    { field: 'year', pivot: true, enablePivot: true },
    { field: 'quarter', pivot: true, enablePivot: true },
    { field: 'sales', aggFunc: 'sum', enableValue: true },
  ],
  rowData: [
    { country: 'United Kingdom', product: 'Widget', year: '2025', quarter: 'Q1', sales: 120 },
  ],
  pivotMode: true,
});
```

Toggle pivot mode at runtime. `@libregrid/columns-tool-panel`'s Columns
panel includes a Pivot Mode switch and Column Labels drop zone for this:

```ts
api.setGridOption('pivotMode', !api.getGridOption('pivotMode'));
```

Retrieve a specific pivot intersection column:

```ts
const col = api.getPivotResultColumn(['2025', 'Q1'], 'sales');
```

Cap generated columns when pivot values have high cardinality with
`pivotMaxGeneratedColumns`.

## API

| Export | Purpose |
| --- | --- |
| `PivotModule` | Registers the feature (`moduleName: 'Pivot'`). |
| `PivotStage` | Client-side row model pipeline stage that generates result columns — see `docs/reference/api-seams.md` §6. |
| `PivotColsService` | Tracks which columns are in the pivot drop zone. |
| `PivotResultColsService`, `createGeneratedPivotDefs`, `generatedPivotColumnId` | Generated result-column management. |
| `PivotColDefService` | Builds `ColDef`s for generated pivot columns. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/row-grouping`](https://github.com/libregrid/libregrid/blob/main/packages/row-grouping/README.md) — grouping and aggregation this feature builds on
- [`@libregrid/server-side-row-model`](https://github.com/libregrid/libregrid/blob/main/packages/server-side-row-model/README.md) — server-side pivot for large data sets

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
