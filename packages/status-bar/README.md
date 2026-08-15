# @libregrid/status-bar

Status bar panels — total row count, filtered count, selected count, and
value aggregation — shown below the grid.

Replaces AG Grid Enterprise's `StatusBar` module.

## Install

```bash
npm install ag-grid-community @libregrid/status-bar
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { StatusBarModule } from '@libregrid/status-bar';

ModuleRegistry.registerModules([AllCommunityModule, StatusBarModule]);

createGrid(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'name' }, { field: 'amount' }],
  rowData: [{ name: 'Widget', amount: 42 }],
  statusBar: {
    statusPanels: [
      { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
      { statusPanel: 'agAggregationComponent', key: 'aggregation' },
    ],
  },
});
```

`agAggregationComponent` sums, counts, and averages selected numeric cells.
Select a range (with `@libregrid/cell-selection` registered) to see it
update.

## API

| Export | Status panel name | Purpose |
| --- | --- | --- |
| `TotalRowCountPanel` | `agTotalRowCountComponent` | Total row count. |
| `TotalAndFilteredRowCountPanel` | `agTotalAndFilteredRowCountComponent` | Total and filtered row counts together. |
| `FilteredRowCountPanel` | `agFilteredRowCountComponent` | Filtered row count only. |
| `SelectedRowCountPanel` | `agSelectedRowCountComponent` | Selected row count. |
| `AggregationPanel` | `agAggregationComponent` | Sum/count/min/max/avg over the selected range. |

Also exported: `aggregate(metrics)`, the pure function `AggregationPanel`
uses internally. Use it if you're building a custom status panel and want
the same sum/count/min/max/avg calculation.

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/material`](https://github.com/libregrid/libregrid/blob/main/packages/material/README.md) — `MaterialStatusBarComponent` for a Material-styled shell

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
