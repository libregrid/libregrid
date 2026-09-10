# @libregrid/master-detail

Expand a row into a nested grid for related records, such as an order’s line
items or an account’s transactions. Supply detail data locally or load it on
demand, and opt into caching to preserve detail-grid state on collapse.

[Documentation and examples](https://libregrid.dev/master-detail)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/master-detail
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/row-grouping` is installed automatically.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import type { GetDetailRowDataParams } from 'ag-grid-community';
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

createGrid<Call>(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'name', cellRenderer: 'agGroupCellRenderer' }],
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
    getDetailRowData: ({ data, successCallback }: GetDetailRowDataParams<Call, DetailCall>) =>
      successCallback(data.calls),
  },
});
```

### Expansion and caching

Add `masterDefaultExpanded: 1` to the example's grid options to expand the
first level automatically; `-1` expands all levels. By default, collapsing a
row destroys its detail grid. Set `keepDetailRows: true` to retain collapsed
details and `keepDetailRowsCount` to limit how many are cached.

### Asynchronous detail data

`getDetailRowData` may call `successCallback` after an asynchronous load.
Provide your application's loader and error handling when configuring the
detail renderer. This factory shows the callback contract:

```ts
import type { GetDetailRowData } from 'ag-grid-community';

export function createDetailLoader(
  loadCalls: (id: string) => Promise<DetailCall[]>,
  reportError: (error: unknown) => void,
): GetDetailRowData<Call, DetailCall> {
  return ({ data, successCallback }) => {
    loadCalls(data.id)
      .then(successCallback)
      .catch((error: unknown) => {
        reportError(error);
        successCallback([]);
      });
  };
}
```

This snippet uses the `Call` and `DetailCall` types above. Assign the returned
callback to `detailCellRendererParams.getDetailRowData`. In this example a failed
load reports the error and displays an empty detail grid; your application can
provide a retry UI. The `refreshStrategy` option controls how an existing detail
grid responds when its master data changes.

## API

| Export                | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `MasterDetailModule`  | Registers the feature (`moduleName: 'MasterDetail'`).         |
| `MasterDetailService` | Bean managing detail-row lifecycle and caching.               |
| `DetailCellRenderer`  | The default detail-row cell renderer hosting the nested grid. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/tree-data`](https://github.com/libregrid/libregrid/blob/main/packages/tree-data/README.md) — hierarchical rows in a single grid, a different way to show related records

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
