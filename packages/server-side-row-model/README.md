# @libregrid/server-side-row-model

Load row blocks on demand for datasets queried on a server. The grid sends
paging, sorting, filtering, grouping, and pivot requests to your datasource;
your backend performs the query and returns rows and counts.

[Documentation and examples](https://libregrid.dev/server-side) · [Server-side analytics](https://libregrid.dev/server-side-advanced) · [Server-side selection](https://libregrid.dev/server-side-selection)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/server-side-row-model
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/row-grouping` and `@libregrid/pivot` are installed automatically.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

Set `rowModelType: 'serverSide'`. Provide a `serverSideDatasource`. The grid
requests rows in blocks as the user scrolls or pages. This local mock generates
rows to demonstrate paging; it does not implement sorting, filtering, grouping,
or persistence:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import type { IServerSideDatasource } from 'ag-grid-community';
import { ServerSideRowModelModule } from '@libregrid/server-side-row-model';

interface Trade {
  id: string;
  quantity: number;
}

const ROW_COUNT = 1_000_000;

const datasource: IServerSideDatasource<Trade> = {
  getRows(params) {
    const start = params.request.startRow ?? 0;
    const end = Math.min(params.request.endRow ?? ROW_COUNT, ROW_COUNT);
    const rowData = Array.from({ length: end - start }, (_, offset) => ({
      id: `trade-${start + offset + 1}`,
      quantity: (start + offset) % 100,
    }));
    // Call params.fail() instead of params.success() to signal a load error.
    params.success({ rowData, rowCount: ROW_COUNT });
  },
};

ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);

createGrid<Trade>(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'id' }, { field: 'quantity' }],
  defaultColDef: { sortable: false, filter: false },
  rowModelType: 'serverSide',
  cacheBlockSize: 100,
  serverSideInitialRowCount: ROW_COUNT,
  getRowId: ({ data }) => data.id,
  serverSideDatasource: datasource,
});
```

### Pagination

Add `pagination: true`, `paginationPageSize: 100`, and
`paginationPageSizeSelector: [50, 100, 250]` to the example's grid options.
The datasource still receives block requests. Return an accurate `rowCount`
so the page controls reflect the result set.

### Server-side grouping, sorting, filtering, and pivot

`params.request` carries `groupKeys`, `rowGroupCols`, `valueCols`,
`sortModel`, `filterModel`, and pivot columns. Your backend must implement the operations you enable in the grid.
Validate requested columns and operators and enforce application access rules
before translating requests into database queries. Registering `ServerSideRowModelModule` alongside
`@libregrid/row-grouping` and `@libregrid/pivot`'s modules enables the same
`rowGroup`/`aggFunc`/`pivot` column definitions used client-side. The grid
sends the current grouping/pivot state in each request instead of computing
it locally.

### Advanced Filter requests

When `enableAdvancedFilter: true` is configured (and
`AdvancedFilterModule` is registered), `params.request.filterModel` contains
the current `AdvancedFilterModel` expression tree, or `null` when no advanced
filter is applied. It replaces the classic column-filter map in that field, so
the datasource can translate one expression into its database query before it
loads the requested block.

## API

| Export                          | Purpose                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| `ServerSideRowModelModule`      | Registers the feature (`moduleName: 'ServerSideRowModel'`). |
| `ServerSideRowModel`            | The row model implementation.                               |
| `ServerSideLoadingCellRenderer` | Default loading-state cell renderer.                        |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/viewport-row-model`](https://github.com/libregrid/libregrid/blob/main/packages/viewport-row-model/README.md) — a push-driven alternative for live-updating data
- [`@libregrid/row-grouping`](https://github.com/libregrid/libregrid/blob/main/packages/row-grouping/README.md), [`@libregrid/pivot`](https://github.com/libregrid/libregrid/blob/main/packages/pivot/README.md) — the client-side equivalents this feature mirrors server-side

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
