# @libregrid/row-numbers

Adds the row-number column to the start of the grid — each cell acts as a
row header, numbered by the 1-based visible row index.

Replaces AG Grid Enterprise's `RowNumbers` module.

## Install

```bash
npm install ag-grid-community @libregrid/row-numbers
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { RowNumbersModule } from '@libregrid/row-numbers';

ModuleRegistry.registerModules([AllCommunityModule, RowNumbersModule]);

const api = createGrid(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'country' }, { field: 'sales' }],
  rowData,
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
  valueGetter: (params) => `#${params.node.rowIndex}`, // default: 1-based visible index
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

| Export | Purpose |
| --- | --- |
| `RowNumbersModule` | Registers the feature (`moduleName: 'RowNumbers'`). |
| `RowNumbersService` | Bean (`rowNumbersSvc`) that owns the column and cell interactions. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/cell-selection`](https://github.com/libregrid/libregrid/blob/main/packages/cell-selection/README.md) — the range selection that row-number clicks drive

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
