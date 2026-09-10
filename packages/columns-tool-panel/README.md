# @libregrid/columns-tool-panel

Give users a side panel for column visibility, grouping, aggregation, and
pivot configuration. The package also includes a standalone row-group panel
for applications that do not need the full side panel.

[Documentation and examples](https://libregrid.dev/columns) · [Toolbar integration](https://libregrid.dev/toolbar)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/columns-tool-panel @libregrid/row-grouping @libregrid/pivot
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/side-bar` is installed automatically.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { ColumnsToolPanelModule, RowGroupingPanelModule } from '@libregrid/columns-tool-panel';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { PivotModule } from '@libregrid/pivot';

ModuleRegistry.registerModules([
  AllCommunityModule,
  ColumnsToolPanelModule,
  RowGroupingPanelModule,
  RowGroupingModule,
  PivotModule,
]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [
    { field: 'country', enableRowGroup: true },
    { field: 'product', enablePivot: true },
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

### Custom drag-and-drop integration

The panel supports group and value controls and grid-header drag targets.
`registerColumnsToolPanelDragDropAdapter(adapter)` customizes pointer interaction
inside the panel. Its `attach(root)` method installs handlers and returns their
cleanup function. The [Material adapter](../material/README.md) is an existing
implementation. See the [panel compatibility notes](../../docs/parity/columns-tool-panel.md)
for remaining drag-and-drop limitations.

## API

| Export                                             | Purpose                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ColumnsToolPanelModule`                           | Registers the `columns` side-bar panel (`moduleName: 'ColumnsToolPanel'`).                                          |
| `RowGroupingPanelModule`                           | Registers the standalone row-group panel (`moduleName: 'RowGroupingPanel'`), usable without the full columns panel. |
| `ColumnsToolPanel`, `RowGroupingPanel`             | The panel component implementations.                                                                                |
| `registerColumnsToolPanelDragDropAdapter(adapter)` | Install a pointer drag-and-drop decorator.                                                                          |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/side-bar`](https://github.com/libregrid/libregrid/blob/main/packages/side-bar/README.md) — the panel host

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
