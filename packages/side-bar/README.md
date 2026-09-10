# @libregrid/side-bar

Host tool panels beside the grid. Use the columns and filters panels from
LibreGrid or register an application-specific panel, with API controls for
visibility and the active panel.

[Documentation and examples](https://libregrid.dev/side-bar)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/side-bar @libregrid/columns-tool-panel
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency. Install
`@libregrid/columns-tool-panel` and/or `@libregrid/filters-tool-panel`
alongside it for the standard panels.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { SideBarModule } from '@libregrid/side-bar';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';

ModuleRegistry.registerModules([AllCommunityModule, SideBarModule, ColumnsToolPanelModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
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

A tool panel implements `IToolPanelComp`. Add its class to the `components`
map and reference the same key from `sideBar.toolPanels`. This configuration
can replace the options in the grid above:

```ts
import type { GridOptions, IToolPanelComp } from 'ag-grid-community';

class HelpPanel implements IToolPanelComp {
  private readonly element = document.createElement('p');

  init(): void {
    this.element.textContent = 'Use column headers to sort the table.';
  }

  getGui(): HTMLElement {
    return this.element;
  }

  refresh(): boolean {
    return true;
  }
}

const helpOptions: GridOptions = {
  components: { helpPanel: HelpPanel },
  sideBar: {
    toolPanels: [
      {
        id: 'help',
        labelDefault: 'Help',
        labelKey: 'help',
        iconKey: 'columns',
        toolPanel: 'helpPanel',
      },
    ],
    defaultToolPanel: 'help',
  },
};
```

Merge `helpOptions` into your grid options before grid creation.

### Custom side-bar rendering

`registerSideBarRenderer(renderer)` replaces the panel-selector UI and returns
an unregister function. A renderer receives the host, panel definitions, and
toggle callbacks; implement its refresh and cleanup lifecycle for your UI.
See the [Material integration](../material/README.md) for an existing renderer.

## API

| Export                              | Purpose                                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `SideBarModule`                     | Registers the feature (`moduleName: 'SideBar'`).                                                                                       |
| `SideBarService`                    | Bean managing side-bar visibility and panel state.                                                                                     |
| `registerSideBarRenderer(renderer)` | Replace the default panel-button rendering.                                                                                            |
| `registerToolPanel(beans, def)`     | Register a tool panel from inside another module's bean — used by `@libregrid/columns-tool-panel` and `@libregrid/filters-tool-panel`. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/columns-tool-panel`](https://github.com/libregrid/libregrid/blob/main/packages/columns-tool-panel/README.md), [`@libregrid/filters-tool-panel`](https://github.com/libregrid/libregrid/blob/main/packages/filters-tool-panel/README.md) — the standard panels

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
