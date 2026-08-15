# @libregrid/menu

Context menu (right-click) and column menu (header dropdown) for AG Grid
Community. A registry lets other LibreGrid packages contribute their own
menu items — copy/paste from `@libregrid/clipboard`, export actions, column
pinning and sizing, and more.

Replaces AG Grid Enterprise's `ContextMenu` and `ColumnMenu` modules.

## Install

```bash
npm install ag-grid-community @libregrid/menu
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

Registering both modules is enough to get a working right-click context menu
and column-header menu. No additional grid options are required:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { ContextMenuModule, ColumnMenuModule } from '@libregrid/menu';

ModuleRegistry.registerModules([AllCommunityModule, ContextMenuModule, ColumnMenuModule]);

createGrid(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'name' }, { field: 'value' }],
  rowData: [{ name: 'Widget', value: 42 }],
});
```

Other LibreGrid packages (clipboard, row grouping, filters) register their
own menu items automatically once installed. You don't need to configure
this yourself. Copy/paste items, for example, appear once
`@libregrid/clipboard` is also registered.

### Contributing a custom menu item

```ts
import { registerMenuItem } from '@libregrid/menu';

registerMenuItem({
  name: 'highlightRow',
  factory: (params) => ({
    name: 'Highlight row',
    action: () => params.node?.setSelected(true),
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

| Export | Purpose |
| --- | --- |
| `ContextMenuModule` | Right-click context menu (`moduleName: 'ContextMenu'`). |
| `ColumnMenuModule` | Column-header dropdown menu (`moduleName: 'ColumnMenu'`). |
| `registerMenuItem(contribution)` / `registerMenuItems(contributions)` | Contribute menu items at module scope. |
| `registerMenuRenderer(renderer)` | Replace the default menu rendering. |
| `MenuItemRegistry`, `MenuItemMapper`, `MenuUtils`, `ContextMenuService`, `ColumnMenuFactory` | Internal services — see `docs/reference/api-seams.md` for the bean pattern. |
| `DEFAULT_CONTEXT_MENU_ITEMS`, `DEFAULT_COLUMN_MENU_ITEMS` | The built-in item name lists. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [Migration guide](https://github.com/libregrid/libregrid/blob/main/docs/guides/migration-guide.md)

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
