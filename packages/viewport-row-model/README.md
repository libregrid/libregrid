# @libregrid/viewport-row-model

The viewport row model: your code pushes exactly the rows currently
scrolled into view, rather than the grid pulling pages. Well suited to
live-updating feeds where the server (or a websocket) drives what data
exists.

Replaces AG Grid Enterprise's `ViewportRowModel` module.

## Install

```bash
npm install ag-grid-community @libregrid/viewport-row-model
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

Set `rowModelType: 'viewport'`. Provide a `viewportDatasource`. The grid
calls `init` once with the total row count. It calls `setViewportRange`
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

const datasource: IViewportDatasource<Quote> = {
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

createGrid<Quote>(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'id' }, { field: 'price' }],
  rowModelType: 'viewport',
  viewportRowModelPageSize: 20,
  viewportRowModelBufferSize: 10,
  getRowId: ({ data }) => data.id,
  viewportDatasource: datasource,
});
```

Push updates to already-visible rows at any time by calling
`params.setRowData(...)` again. Call it from a `setInterval`, a websocket
message handler, or wherever your live data arrives.

## API

| Export | Purpose |
| --- | --- |
| `ViewportRowModelModule` | Registers the feature (`moduleName: 'ViewportRowModel'`). |
| `ViewportRowModel` | The row model implementation. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/server-side-row-model`](https://github.com/libregrid/libregrid/blob/main/packages/server-side-row-model/README.md) — a pull-based alternative for grouping, sorting, and filtering large data sets

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
