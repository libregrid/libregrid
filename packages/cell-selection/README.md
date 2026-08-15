# @libregrid/cell-selection

Drag to select a range of cells. Drag the fill handle to extend a value
or series across cells. `@libregrid/clipboard` and `@libregrid/status-bar`'s
aggregation panel build on this foundation.

Replaces AG Grid Enterprise's `CellSelection` module (Enterprise's older
"range selection" is folded into cell selection as of AG Grid v36).

## Install

```bash
npm install ag-grid-community @libregrid/cell-selection
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';

ModuleRegistry.registerModules([AllCommunityModule, CellSelectionModule]);

const api = createGrid(document.querySelector('#grid')!, {
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

| Export | Purpose |
| --- | --- |
| `CellSelectionModule` | Registers the feature (`moduleName: 'CellSelection'`). |
| `RangeService` | Bean backing range state and the fill handle. |
| `RangeModel`, `normalise(range)` | Normalizes a `CellRangeModel` (e.g. after dragging up/left). |
| `fillSeries(values, length)` | The series-detection logic behind fill-handle drag (numeric sequences, repeats). |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/clipboard`](https://github.com/libregrid/libregrid/blob/main/packages/clipboard/README.md) — copy/cut/paste for the selected range
- [`@libregrid/status-bar`](https://github.com/libregrid/libregrid/blob/main/packages/status-bar/README.md) — aggregation panel over the selected range

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
