# @libregrid/cell-selection

Select rectangular cell ranges and extend values or sequences with a fill
handle. Combine this with clipboard operations or status-bar summaries for
spreadsheet-style interaction.

[Documentation and examples](https://libregrid.dev/selection)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/cell-selection
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';

ModuleRegistry.registerModules([AllCommunityModule, CellSelectionModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'name' }, { field: 'first' }, { field: 'second' }],
  rowData: [{ name: 'Alpha', first: 1, second: 2 }],
  defaultColDef: { editable: true },
  cellSelection: { handle: { mode: 'fill' } },
});

api.addEventListener('rangeSelectionChanged', () => {
  console.log(api.getCellRanges());
});
```

Set `cellSelection: true` for range selection without the fill handle. Set
`cellSelection: { handle: { mode: 'range' } }` to drag-extend the current
range instead of filling values.

## API

| Export                           | Purpose                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `CellSelectionModule`            | Registers the feature (`moduleName: 'CellSelection'`).                           |
| `RangeService`                   | Bean backing range state and the fill handle.                                    |
| `RangeModel`, `normalise(range)` | Normalizes a `CellRangeModel` (e.g. after dragging up/left).                     |
| `fillSeries(values, length)`     | The series-detection logic behind fill-handle drag (numeric sequences, repeats). |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/clipboard`](https://github.com/libregrid/libregrid/blob/main/packages/clipboard/README.md) — copy/cut/paste for the selected range
- [`@libregrid/status-bar`](https://github.com/libregrid/libregrid/blob/main/packages/status-bar/README.md) — aggregation panel over the selected range

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
