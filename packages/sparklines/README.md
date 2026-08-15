# @libregrid/sparklines

In-cell mini charts — line, area, column, and bar — rendered directly inside
grid cells, with optional axis and tooltip support. Built on MIT-licensed
`ag-charts-community`.

Replaces AG Grid Enterprise's `Sparklines` module.

## Install

```bash
npm install ag-grid-community ag-charts-community @libregrid/sparklines
```

Requires `ag-grid-community >=36.1.0 <37` and `ag-charts-community` as peer
dependencies.

## Usage

Set a column's `cellRenderer` to `'agSparklineCellRenderer'`, with the
per-row series in an array field:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { SparklinesModule } from '@libregrid/sparklines';

ModuleRegistry.registerModules([AllCommunityModule, SparklinesModule]);

createGrid(document.querySelector('#grid')!, {
  columnDefs: [
    { field: 'country' },
    {
      field: 'trend',
      headerName: 'Trend',
      cellRenderer: 'agSparklineCellRenderer',
      cellRendererParams: {
        sparklineOptions: { type: 'area', tooltip: { enabled: true }, axis: { type: 'number' } },
      },
    },
  ],
  rowData: [{ country: 'United Kingdom', trend: [4, 7, 3, 9, 6, 8] }],
});
```

Switch `sparklineOptions.type` between `'line'`, `'area'`, `'column'`, and
`'bar'`. Each sparkline is independently virtualized. It stays cheap even
with thousands of rows.

## API

| Export | Purpose |
| --- | --- |
| `SparklinesModule` | Registers the renderer under the component name `agSparklineCellRenderer` (`moduleName: 'Sparklines'`). |
| `SparklineCellRenderer` | The cell renderer component. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/integrated-charts`](https://github.com/libregrid/libregrid/blob/main/packages/integrated-charts/README.md) — full-size charts over a selected range

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
