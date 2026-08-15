# @libregrid/side-bar

Side bar that hosts tool panels. The columns and filters panels from
`@libregrid/columns-tool-panel` and `@libregrid/filters-tool-panel` plug into
it. You can also register your own panels.

Replaces AG Grid Enterprise's `SideBar` module.

## Install

```bash
npm install ag-grid-community @libregrid/side-bar
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency. Install
`@libregrid/columns-tool-panel` and/or `@libregrid/filters-tool-panel`
alongside it for the standard panels.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { SideBarModule } from '@libregrid/side-bar';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';

ModuleRegistry.registerModules([AllCommunityModule, SideBarModule, ColumnsToolPanelModule]);

createGrid(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'country' }, { field: 'product' }, { field: 'sales' }],
  rowData: [{ country: 'United Kingdom', product: 'Widget', sales: 120 }],
  sideBar: { toolPanels: ['columns'], defaultToolPanel: 'columns' },
});
```

Toggle and inspect side-bar state through the grid's own API. No
LibreGrid-specific API is needed for the common cases:

```ts
api.setSideBarVisible(!api.isSideBarVisible());
api.openToolPanel('columns');
api.getOpenedToolPanel(); // 'columns' | null
```

### Registering a custom tool panel

A tool panel combines a `ToolPanelDef`, a component registered under a
matching name, and an entry in `sideBar.toolPanels`:

```ts
const gridOptions: import('ag-grid-community').GridOptions = {
  sideBar: {
    toolPanels: [
      { id: 'notes', labelDefault: 'Notes', iconKey: 'columns', toolPanel: 'myNotesPanel' },
    ],
    defaultToolPanel: 'notes',
  },
  components: { myNotesPanel: MyNotesPanelComponent },
};
```

### Custom side-bar rendering

`registerSideBarRenderer` lets you replace the panel-button chrome with your
own UI. `@libregrid/material` uses this to render Material buttons into the
provided `host` element:

```ts
import { registerSideBarRenderer, type SideBarRenderer } from '@libregrid/side-bar';

const myRenderer: SideBarRenderer = {
  refresh(request) {
    // Render panel-selector buttons from `request.panelDefs` into
    // `request.host`; call `request.togglePanel(id)` on click.
  },
};

const unregister = registerSideBarRenderer(myRenderer);
```

## API

| Export | Purpose |
| --- | --- |
| `SideBarModule` | Registers the feature (`moduleName: 'SideBar'`). |
| `SideBarService` | Bean managing side-bar visibility and panel state. |
| `registerSideBarRenderer(renderer)` | Replace the default panel-button rendering. |
| `registerToolPanel(beans, def)` | Register a tool panel from inside another module's bean — used by `@libregrid/columns-tool-panel` and `@libregrid/filters-tool-panel`. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/columns-tool-panel`](https://github.com/libregrid/libregrid/blob/main/packages/columns-tool-panel/README.md), [`@libregrid/filters-tool-panel`](https://github.com/libregrid/libregrid/blob/main/packages/filters-tool-panel/README.md) — the standard panels

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
