# @libregrid/row-numbers

Display a row-number column based on the visible row order. Optional controls
let users resize rows or select a row’s cells through its number.

[Documentation and examples](https://libregrid.dev/row-numbers)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/row-numbers
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { RowNumbersModule } from '@libregrid/row-numbers';

ModuleRegistry.registerModules([AllCommunityModule, RowNumbersModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'country' }, { field: 'sales' }],
  rowData: [
    { country: 'Japan', sales: 120 },
    { country: 'Canada', sales: 240 },
  ],
  rowNumbers: true,
});
```

### Options

`rowNumbers` accepts `true` or a `RowNumbersOptions` object:

```ts
rowNumbers: {
  width: 70,               // default 60
  minWidth: 60,            // default 60
  resizable: true,         // default false
  enableRowResizer: true,  // drag handle on each row-number cell resizes the row
  suppressCellSelectionIntegration: true, // don't select the row when clicking a number
  valueGetter: (params) => `#${(params.node?.rowIndex ?? 0) + 1}`, // default: 1-based visible index
},
```

### Behaviour

- **Row selection:** when cell selection is enabled, left-clicking a row
  number selects all currently visible cells in the row.
- **Row resizer:** with `enableRowResizer: true`, a drag handle on each
  row-number cell's bottom edge resizes that row and fires
  `rowResizeStarted` / `rowResizeEnded`. It does not work with auto row
  height (`getRowHeight`).
- **Export:** the column is excluded from CSV/Excel exports by default; opt
  in with `exportRowNumbers: true` in the export params.
- **Placement:** the column is locked to the left (right in RTL) and cannot
  be moved, sorted, resized (by default) or included in charts.

## API

| Export              | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `RowNumbersModule`  | Registers the feature (`moduleName: 'RowNumbers'`).                |
| `RowNumbersService` | Bean (`rowNumbersSvc`) that owns the column and cell interactions. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/cell-selection`](https://github.com/libregrid/libregrid/blob/main/packages/cell-selection/README.md) — the range selection that row-number clicks drive

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
