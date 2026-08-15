# @libregrid/row-grouping

Client-side row grouping, aggregation, group/grand total rows, and
show-values-as (percent of total) — the most commonly used LibreGrid
feature.

Replaces AG Grid Enterprise's `RowGrouping` module.

## Install

```bash
npm install ag-grid-community @libregrid/row-grouping
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

createGrid(document.querySelector('#grid')!, {
  columnDefs: [
    { field: 'country', rowGroup: true },
    { field: 'city', rowGroup: true },
    { field: 'product' },
    { field: 'sales', aggFunc: 'sum', sort: 'desc' },
  ],
  rowData: [
    { country: 'United Kingdom', city: 'London', product: 'Widget', sales: 120 },
    { country: 'United States', city: 'New York', product: 'Widget', sales: 240 },
  ],
});
```

Group by any column with `rowGroup: true`. Aggregate a value column with
`aggFunc: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last'`.

### Group and grand total rows

```ts
createGrid(document.querySelector('#grid')!, {
  columnDefs: [
    { field: 'country', rowGroup: true },
    { field: 'sales', aggFunc: 'sum' },
  ],
  rowData: [
    /* ... */
  ],
  groupTotalRow: 'bottom',
  grandTotalRow: 'bottom',
});
```

### Show values as % of total

```ts
{ field: 'sales', colId: 'salesShare', headerName: '% of Total', showValuesAs: 'percentOfGrandTotal' }
```

### Programmatic control

```ts
api.setRowGroupColumns(['country']);
api.addAggFuncs({ median: (params) => /* ... */ 0 });
api.expandAll();
api.collapseAll();
```

## API

| Export | Purpose |
| --- | --- |
| `RowGroupingModule` | Registers the feature (`moduleName: 'RowGrouping'`). |
| `GroupCellRenderer` | Default cell renderer for the auto group column. |
| `GroupStage`, `AggregationStage`, `FilterAggregateStage`, `GroupFilterStage`, `GroupSortStage`, `FlattenStage` | Client-side row model pipeline stages — see `docs/reference/api-seams.md` §6. |
| `AggFuncService` | Registered aggregation functions (`addAggFuncs`, etc.). |
| `FooterService` | Backs `groupTotalRow` / `grandTotalRow`. |
| `ShowValuesAsService` | Backs `showValuesAs` (percent-of-total family). |
| `ValueColsService`, `RowGroupColsService`, `AutoGenColsService`, `ShowRowGroupColsService`, `ShowRowGroupColsValueService`, `ExpansionService` | Supporting internal services. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/pivot`](https://github.com/libregrid/libregrid/blob/main/packages/pivot/README.md) — pivot on top of this feature's grouping pipeline
- [`@libregrid/columns-tool-panel`](https://github.com/libregrid/libregrid/blob/main/packages/columns-tool-panel/README.md) — UI for managing row-group and value columns

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
