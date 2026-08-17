# @libregrid/toolbar

Quick Access Toolbar — a full-width bar above the grid with Find, Quick
Filter, Row Group Panel, Pivot Panel, menu, and action-button items.

Replaces AG Grid Enterprise's `Toolbar` module.

> LibreGrid is an independent open-source project. It is not affiliated with, endorsed by, or sponsored by AG Grid Ltd. "AG Grid" is a trademark of AG Grid Ltd.

## Install

```bash
npm install ag-grid-community @libregrid/toolbar
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { ToolbarModule } from '@libregrid/toolbar';
import { FindModule } from '@libregrid/find';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';

ModuleRegistry.registerModules([AllCommunityModule, ToolbarModule, FindModule, ColumnsToolPanelModule]);

createGrid(document.querySelector('#myGrid')!, {
  columnDefs: [{ field: 'country' }, { field: 'sales' }],
  rowData: [{ country: 'United Kingdom', sales: 120 }],
  toolbar: {
    items: [
      'agQuickFilterToolbarItem',
      'agFindToolbarItem',
      'separator',
      'agRowGroupPanelToolbarItem',
      { label: 'Export', icon: 'excelExport', action: () => console.log('Export!') },
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
