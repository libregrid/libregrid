# @libregrid/master-detail

Nested detail grids per row, with caching so collapsed/re-expanded detail
rows don't refetch by default.

Replaces AG Grid Enterprise's `MasterDetail` module.

## Install

```bash
npm install ag-grid-community @libregrid/master-detail
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/row-grouping` is installed automatically.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { MasterDetailModule } from '@libregrid/master-detail';

interface Call {
  id: string;
  name: string;
  calls: DetailCall[];
}
interface DetailCall {
  id: string;
  direction: string;
  duration: number;
}

ModuleRegistry.registerModules([AllCommunityModule, MasterDetailModule]);

createGrid<Call>(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'name' }],
  rowData: [
    {
      id: '1',
      name: 'Support line',
      calls: [{ id: 'a', direction: 'inbound', duration: 120 }],
    },
  ],
  masterDetail: true,
  getRowId: ({ data }) => data.id,
  detailCellRendererParams: {
    detailGridOptions: {
      columnDefs: [{ field: 'direction' }, { field: 'duration' }],
      getRowId: ({ data }: { data: DetailCall }) => data.id,
    },
    getDetailRowData: ({ data, successCallback }) => successCallback(data.calls),
  },
});
```

### Expand rows by default, keep detail state on collapse

```ts
createGrid(document.querySelector('#grid')!, {
  // ...
  masterDetail: true,
  masterDefaultExpanded: 2, // expand the first 2 master rows
  keepDetailRows: true, // don't destroy collapsed detail grids
  keepDetailRowsCount: 2, // cap how many stay alive
});
```

### Loading detail rows asynchronously

`getDetailRowData` calls `successCallback` whenever your data is ready —
synchronously or after a fetch:

```ts
detailCellRendererParams: {
  detailGridOptions: {
    /* ... */
  },
  getDetailRowData: ({ data, successCallback }) => {
    fetchCallsFor(data.id).then(successCallback);
  },
  refreshStrategy: 'rows',
},
```

## API

| Export | Purpose |
| --- | --- |
| `MasterDetailModule` | Registers the feature (`moduleName: 'MasterDetail'`). |
| `MasterDetailService` | Bean managing detail-row lifecycle and caching. |
| `DetailCellRenderer` | The default detail-row cell renderer hosting the nested grid. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/tree-data`](https://github.com/libregrid/libregrid/blob/main/packages/tree-data/README.md) — hierarchical rows in a single grid, a different way to show related records

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
