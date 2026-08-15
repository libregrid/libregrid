# @libregrid/integrated-charts

Range and cross-filter charts drawn on top of a selected cell range, backed
by MIT-licensed `ag-charts-community`. Charts stay linked to the grid. If
you edit the underlying data, the chart updates.

Replaces AG Grid Enterprise's `IntegratedCharts` module. Chart types are
limited to what `ag-charts-community` supports. Chart types that exist only
in the commercial AG Charts package aren't available. See the
[gap list](https://github.com/libregrid/libregrid/blob/main/docs/parity/gap-list.md).

## Install

```bash
npm install ag-grid-community ag-charts-community @libregrid/integrated-charts
```

Requires `ag-grid-community >=36.1.0 <37` and `ag-charts-community` as peer
dependencies. `@libregrid/cell-selection` is installed automatically.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { IntegratedChartsModule } from '@libregrid/integrated-charts';

ModuleRegistry.registerModules([AllCommunityModule, CellSelectionModule, IntegratedChartsModule]);

const chartContainer = document.querySelector<HTMLElement>('#chart')!;

const api = createGrid(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'country' }, { field: 'sales' }, { field: 'profit' }],
  rowData: [{ country: 'United Kingdom', sales: 120, profit: 40 }],
  enableCharts: true,
  cellSelection: true,
});

const chart = api.createRangeChart({
  chartType: 'groupedColumn',
  cellRange: { rowStartIndex: 0, rowEndIndex: 3, columns: ['country', 'sales', 'profit'] },
  chartContainer,
});
```

The chart stays linked. Updating the underlying data through
`api.applyTransaction(...)` updates the chart automatically. Unlink the
chart, save and restore its state, or open its configuration panel through
the grid API:

```ts
api.updateChart({ type: 'rangeChartUpdate', chartId: chart.chartId, unlinkChart: true });
api.openChartToolPanel({ chartId: chart.chartId, panel: 'settings' });

const [model] = api.getChartModels() ?? [];
chart.destroyChart();
const restored = api.restoreChart(model, chartContainer);
```

Cross-filter charts (selecting on the chart filters the grid) use
`createCrossFilterChart` with the same shape.

## API

| Export | Purpose |
| --- | --- |
| `IntegratedChartsModule` | Registers the feature (`moduleName: 'IntegratedCharts'`). |
| `ChartService` | Bean backing chart creation, linking, and lifecycle. |
| `ChartCrossFilterService` | Bean backing cross-filter charts. |
| `AgChartsCommunityProvider` | The replaceable chart-rendering provider, implemented on `ag-charts-community`. |
| `chartOptionsFor(...)` | Translates grid chart config into `ag-charts-community` options. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/sparklines`](https://github.com/libregrid/libregrid/blob/main/packages/sparklines/README.md) — in-cell mini charts, no separate container needed
- [Chart gaps](https://github.com/libregrid/libregrid/blob/main/docs/parity/integrated-charts.md) — what differs from the commercial AG Charts

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
