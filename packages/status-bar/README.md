# @libregrid/status-bar

Show row counts and selection summaries below the grid. Built-in panels
report total, filtered, or selected rows and aggregate numeric cell ranges.

[Documentation and examples](https://libregrid.dev/selection)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/status-bar
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { StatusBarModule } from '@libregrid/status-bar';
import { CellSelectionModule } from '@libregrid/cell-selection';

ModuleRegistry.registerModules([AllCommunityModule, StatusBarModule, CellSelectionModule]);

createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'name' }, { field: 'amount' }],
  rowData: [{ name: 'Widget', amount: 42 }],
  cellSelection: true,
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

`StatusBarModule` registers the following built-in panels:

| Export                          | Status panel name                     | Purpose                                        |
| ------------------------------- | ------------------------------------- | ---------------------------------------------- |
| `TotalRowCountPanel`            | `agTotalRowCountComponent`            | Total row count.                               |
| `TotalAndFilteredRowCountPanel` | `agTotalAndFilteredRowCountComponent` | Total and filtered row counts together.        |
| `FilteredRowCountPanel`         | `agFilteredRowCountComponent`         | Filtered row count only.                       |
| `SelectedRowCountPanel`         | `agSelectedRowCountComponent`         | Selected row count.                            |
| `AggregationPanel`              | `agAggregationComponent`              | Sum/count/min/max/avg over the selected range. |

Also exported: `aggregate(metrics)`, the pure function `AggregationPanel`
uses internally. Use it if you're building a custom status panel and want
the same sum/count/min/max/avg calculation.

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/material`](https://github.com/libregrid/libregrid/blob/main/packages/material/README.md) — `MaterialStatusBarComponent` for a Material-styled shell

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
