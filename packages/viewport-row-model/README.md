# @libregrid/viewport-row-model

Supply rows for the grid’s visible range and push updates as data changes.
This row model suits live feeds where your application manages the connection
and decides when to deliver new values.

[Documentation and examples](https://libregrid.dev/viewport)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/viewport-row-model
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

Set `rowModelType: 'viewport'`. Provide a `viewportDatasource`. The grid
calls `init` with callbacks your datasource uses to supply the total row count and rows. It calls `setViewportRange`
every time the visible row range changes. Respond by pushing exactly those
rows with `setRowData`:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import type { IViewportDatasource } from 'ag-grid-community';
import { ViewportRowModelModule } from '@libregrid/viewport-row-model';

interface Quote {
  id: string;
  price: number;
}

function quote(index: number): Quote {
  return { id: `row-${index}`, price: 100 + (index % 50) };
}

let params: Parameters<IViewportDatasource['init']>[0] | undefined;

const datasource: IViewportDatasource = {
  init(initParams) {
    params = initParams;
    initParams.setRowCount(2_000);
  },
  setViewportRange(firstRow, lastRow) {
    const rows: Record<number, Quote> = {};
    for (let i = firstRow; i <= lastRow; i++) rows[i] = quote(i);
    params?.setRowData(rows);
  },
};

ModuleRegistry.registerModules([AllCommunityModule, ViewportRowModelModule]);

createGrid<Quote>(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'id' }, { field: 'price' }],
  rowModelType: 'viewport',
  viewportRowModelPageSize: 20,
  viewportRowModelBufferSize: 10,
  getRowId: ({ data }) => data.id,
  viewportDatasource: datasource,
});
```

This example generates values locally to demonstrate the datasource lifecycle.
For a live feed, implement the connection and cleanup in your datasource.

Push updates to already-visible rows at any time by calling
`params.setRowData(...)` again. Call it from a `setInterval`, a websocket
message handler, or wherever your live data arrives.

## API

| Export                   | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| `ViewportRowModelModule` | Registers the feature (`moduleName: 'ViewportRowModel'`). |
| `ViewportRowModel`       | The row model implementation.                             |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/server-side-row-model`](https://github.com/libregrid/libregrid/blob/main/packages/server-side-row-model/README.md) — a pull-based alternative for grouping, sorting, and filtering large data sets

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
