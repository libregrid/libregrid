# @libregrid/menu

Add column-header and cell context menus. Registered feature modules can
contribute actions such as copy, paste, export, and grouping; applications can
also supply custom menu items.

[Documentation and examples](https://libregrid.dev/menus)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/menu
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

Registering both modules is enough to get a working right-click context menu
and column-header menu. No additional grid options are required:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { ContextMenuModule, ColumnMenuModule } from '@libregrid/menu';

ModuleRegistry.registerModules([AllCommunityModule, ContextMenuModule, ColumnMenuModule]);

createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'name' }, { field: 'value' }],
  rowData: [{ name: 'Widget', value: 42 }],
});
```

Other LibreGrid packages (clipboard, row grouping, filters) register their
own menu items when their modules are registered. You don't need to configure
this yourself. Copy/paste items, for example, appear once
`@libregrid/clipboard` is also registered.

### Contributing a custom menu item

```ts
import { registerMenuItem } from '@libregrid/menu';

registerMenuItem({
  name: 'inspectRow',
  factory: (params) => ({
    name: 'Inspect row',
    action: () => console.log('Row data:', params.node?.data),
  }),
});
```

### Custom menu rendering

If you're building a themed menu (see `@libregrid/material`'s Material
renderer for a working example), `registerMenuRenderer` lets you replace the
default DOM-based menu with your own component. It returns an unregister
function:

```ts
import { registerMenuRenderer, type MenuRenderer } from '@libregrid/menu';

const myRenderer: MenuRenderer = {
  render(request) {
    // Build a DOM element from `request.items` and `request.kind`.
    const element = request.fallback();
    return { element, destroy: () => element.remove() };
  },
};

const unregister = registerMenuRenderer(myRenderer);
```

## API

| Export                                                                | Purpose                                                   |
| --------------------------------------------------------------------- | --------------------------------------------------------- |
| `ContextMenuModule`                                                   | Right-click context menu (`moduleName: 'ContextMenu'`).   |
| `ColumnMenuModule`                                                    | Column-header dropdown menu (`moduleName: 'ColumnMenu'`). |
| `registerMenuItem(contribution)` / `registerMenuItems(contributions)` | Contribute menu items at module scope.                    |
| `registerMenuRenderer(renderer)`                                      | Replace the default menu rendering.                       |
| `DEFAULT_CONTEXT_MENU_ITEMS`, `DEFAULT_COLUMN_MENU_ITEMS`             | The built-in item name lists.                             |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [Migration guide](https://github.com/libregrid/libregrid/blob/main/docs/guides/migration-guide.md)

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
