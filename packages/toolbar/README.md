# @libregrid/toolbar

Place search, quick filtering, grouping controls, and application actions above
the grid. Items can use built-in controls or custom components; feature-specific
items require their corresponding modules to be registered.

[Documentation and examples](https://libregrid.dev/toolbar)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/toolbar @libregrid/find @libregrid/columns-tool-panel @libregrid/row-grouping
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="myGrid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { ToolbarModule } from '@libregrid/toolbar';
import { FindModule } from '@libregrid/find';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';
import { RowGroupingModule } from '@libregrid/row-grouping';

ModuleRegistry.registerModules([
  AllCommunityModule,
  ToolbarModule,
  FindModule,
  ColumnsToolPanelModule,
  RowGroupingModule,
]);

const api = createGrid(document.querySelector<HTMLElement>('#myGrid')!, {
  columnDefs: [
    { field: 'country', enableRowGroup: true },
    { field: 'sales', enableValue: true },
  ],
  rowData: [{ country: 'United Kingdom', sales: 120 }],
  toolbar: {
    items: [
      'agQuickFilterToolbarItem',
      'agFindToolbarItem',
      'separator',
      'agRowGroupPanelToolbarItem',
      { label: 'Clear quick filter', action: () => api.setGridOption('quickFilterText', '') },
    ],
  },
});
```

The Find item needs `@libregrid/find` (FindModule). The Row Group and Pivot
Panel items need `@libregrid/columns-tool-panel`
(ColumnsToolPanelModule). Items whose modules are not registered do not
render.

Action buttons use `{ label, icon, tooltip, action }`. Custom components use
`{ toolbarItem: MyToolbarItem, toolbarItemParams: {...} }`. Access an item
with `api.getToolbarItemInstance(key)`.

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
