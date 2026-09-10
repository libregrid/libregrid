# @libregrid/sparklines

Render compact line, area, column, or bar charts inside cells. Use arrays of
values to show trends beside each record, with optional axes and tooltips.
Rendering uses `ag-charts-community`.

[Documentation and examples](https://libregrid.dev/sparklines)

## Install

```bash
npm install "ag-grid-community@^36.1.0" "ag-charts-community@^14.1.0" @libregrid/sparklines
```

Requires `ag-grid-community >=36.1.0 <37` and `ag-charts-community` as peer
dependencies.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

Set a column's `cellRenderer` to `'agSparklineCellRenderer'`, with the
per-row series in an array field:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { SparklinesModule } from '@libregrid/sparklines';

ModuleRegistry.registerModules([AllCommunityModule, SparklinesModule]);

createGrid(document.querySelector<HTMLElement>('#grid')!, {
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
`'bar'`. Sparklines are created and destroyed with the grid’s rendered cells.

## API

| Export                  | Purpose                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `SparklinesModule`      | Registers the renderer under the component name `agSparklineCellRenderer` (`moduleName: 'Sparklines'`). |
| `SparklineCellRenderer` | The cell renderer component.                                                                            |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/integrated-charts`](https://github.com/libregrid/libregrid/blob/main/packages/integrated-charts/README.md) — full-size charts over a selected range

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
