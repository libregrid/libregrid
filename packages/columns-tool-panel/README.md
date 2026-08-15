# @libregrid/columns-tool-panel

The `columns` side-bar panel toggles column visibility, manages row-group
and value columns, and drives pivot mode. It also includes a standalone
row-group panel you can use without the full columns panel.

Replaces AG Grid Enterprise's `ColumnsToolPanel` and `RowGroupingPanel`
modules.

## Install

```bash
npm install ag-grid-community @libregrid/columns-tool-panel
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/side-bar` is installed automatically.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';

ModuleRegistry.registerModules([AllCommunityModule, ColumnsToolPanelModule]);

createGrid(document.querySelector('#grid')!, {
  columnDefs: [
    { field: 'country', enableRowGroup: true },
    { field: 'product' },
    { field: 'sales', enableValue: true },
  ],
  rowData: [{ country: 'United Kingdom', product: 'Widget', sales: 120 }],
  sideBar: { toolPanels: ['columns'], defaultToolPanel: 'columns' },
  rowGroupPanelShow: 'onlyWhenGrouping',
});
```

Open the panel or the standalone column chooser from the grid's own API:

```ts
api.openToolPanel('columns');
api.showColumnChooser(); // uses the same panel implementation
```

Use `suppressColumnsToolPanel: true` on a `ColDef` to keep an internal column
out of the panel entirely.

### Drag-and-drop decorator

The panel's row-group and value drag targets work via keyboard-accessible
buttons by default. To add pointer drag-and-drop, install a decorator (see
`@libregrid/material`'s adapter for a working implementation):

```ts
import { registerColumnsToolPanelDragDropAdapter, type ColumnsToolPanelDragDropAdapter } from '@libregrid/columns-tool-panel';

const adapter: ColumnsToolPanelDragDropAdapter = {
  attach(root) {
    // Wire up drag handlers on elements within `root`.
    return () => {
      /* detach */
    };
  },
};

registerColumnsToolPanelDragDropAdapter(adapter);
```

## API

| Export | Purpose |
| --- | --- |
| `ColumnsToolPanelModule` | Registers the `columns` side-bar panel (`moduleName: 'ColumnsToolPanel'`). |
| `RowGroupingPanelModule` | Registers the standalone row-group panel (`moduleName: 'RowGroupingPanel'`), usable without the full columns panel. |
| `ColumnsToolPanel`, `RowGroupingPanel` | The panel component implementations. |
| `registerColumnsToolPanelDragDropAdapter(adapter)` | Install a pointer drag-and-drop decorator. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/side-bar`](https://github.com/libregrid/libregrid/blob/main/packages/side-bar/README.md) — the panel host

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
