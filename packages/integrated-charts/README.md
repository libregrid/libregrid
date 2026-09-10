# @libregrid/integrated-charts

Create charts from grid ranges and keep them linked to row data. Cross-filter
charts can also filter the grid when users select chart values. Rendering uses
`ag-charts-community`; commercial-only AG Charts types are not included.

[Documentation and examples](https://libregrid.dev/charts)

## Install

```bash
npm install "ag-grid-community@^36.1.0" "ag-charts-community@^14.1.0" @libregrid/integrated-charts
```

Requires `ag-grid-community >=36.1.0 <37` and `ag-charts-community` as peer
dependencies. `@libregrid/cell-selection` is installed automatically.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
<div id="chart" style="height: 300px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { IntegratedChartsModule } from '@libregrid/integrated-charts';

ModuleRegistry.registerModules([AllCommunityModule, CellSelectionModule, IntegratedChartsModule]);

const chartContainer = document.querySelector<HTMLElement>('#chart')!;

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'country' }, { field: 'sales' }, { field: 'profit' }],
  rowData: [{ country: 'United Kingdom', sales: 120, profit: 40 }],
  enableCharts: true,
  cellSelection: true,
});

const chart = api.createRangeChart({
  chartType: 'groupedColumn',
  cellRange: { rowStartIndex: 0, rowEndIndex: 0, columns: ['country', 'sales', 'profit'] },
  chartContainer,
});
```

The chart stays linked. Updating the underlying data through
`api.applyTransaction(...)` updates the chart automatically. Unlink the
chart, save and restore its state, or open its configuration panel through
the grid API:

```ts
if (chart) {
  api.updateChart({ type: 'rangeChartUpdate', chartId: chart.chartId, unlinkChart: true });
  api.openChartToolPanel({ chartId: chart.chartId, panel: 'settings' });

  const model = api.getChartModels()?.find((item) => item.chartId === chart.chartId);
  chart.destroyChart();
  if (model) api.restoreChart(model, chartContainer);
}
```

Cross-filter charts (selecting on the chart filters the grid) use
`createCrossFilterChart` with the same shape.

## API

| Export                      | Purpose                                                                         |
| --------------------------- | ------------------------------------------------------------------------------- |
| `IntegratedChartsModule`    | Registers the feature (`moduleName: 'IntegratedCharts'`).                       |
| `ChartService`              | Bean backing chart creation, linking, and lifecycle.                            |
| `ChartCrossFilterService`   | Bean backing cross-filter charts.                                               |
| `AgChartsCommunityProvider` | The replaceable chart-rendering provider, implemented on `ag-charts-community`. |
| `chartOptionsFor(...)`      | Translates grid chart config into `ag-charts-community` options.                |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/sparklines`](https://github.com/libregrid/libregrid/blob/main/packages/sparklines/README.md) — in-cell mini charts, no separate container needed
- [Chart gaps](https://github.com/libregrid/libregrid/blob/main/docs/parity/integrated-charts.md) — what differs from the commercial AG Charts

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
