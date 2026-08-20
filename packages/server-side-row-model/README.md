# @libregrid/server-side-row-model

The server-side row model (SSRM): lazy-loaded blocks for large or
server-backed data sets, with server-side grouping, sorting, filtering, and
pivot on top of `@libregrid/row-grouping` and `@libregrid/pivot`.

Replaces AG Grid Enterprise's `ServerSideRowModel` module.

## Install

```bash
npm install ag-grid-community @libregrid/server-side-row-model
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/row-grouping` and `@libregrid/pivot` are installed automatically.

## Usage

Set `rowModelType: 'serverSide'`. Provide a `serverSideDatasource`. The grid
requests rows in blocks as the user scrolls or pages:

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

createGrid<Trade>(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'id' }, { field: 'quantity' }],
  rowModelType: 'serverSide',
  cacheBlockSize: 100,
  serverSideInitialRowCount: ROW_COUNT,
  getRowId: ({ data }) => data.id,
  serverSideDatasource: datasource,
});
```

### With pagination

```ts
createGrid(document.querySelector('#grid')!, {
  // ...
  pagination: true,
  paginationPageSize: 100,
  paginationPageSizeSelector: [50, 100, 250],
});
```

### Server-side grouping, sorting, filtering, and pivot

`params.request` carries `groupKeys`, `rowGroupCols`, `valueCols`,
`sortModel`, `filterModel`, and pivot columns. Respond to whichever your
backend supports. Registering `ServerSideRowModelModule` alongside
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

| Export | Purpose |
| --- | --- |
| `ServerSideRowModelModule` | Registers the feature (`moduleName: 'ServerSideRowModel'`). |
| `ServerSideRowModel` | The row model implementation. |
| `ServerSideLoadingCellRenderer` | Default loading-state cell renderer. |
| `SsrmExpandListener`, `SsrmFilterListener`, `SsrmSortService`, `SsrmListenerUtils` | Internal listeners that translate grid state into datasource requests. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/viewport-row-model`](https://github.com/libregrid/libregrid/blob/main/packages/viewport-row-model/README.md) — a push-driven alternative for live-updating data
- [`@libregrid/row-grouping`](https://github.com/libregrid/libregrid/blob/main/packages/row-grouping/README.md), [`@libregrid/pivot`](https://github.com/libregrid/libregrid/blob/main/packages/pivot/README.md) — the client-side equivalents this feature mirrors server-side

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
