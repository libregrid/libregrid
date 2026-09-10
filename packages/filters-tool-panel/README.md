# @libregrid/filters-tool-panel

Display column filters together in a side panel. Users can adjust several
filters without opening each column’s header menu.

[Documentation and examples](https://libregrid.dev/filters)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/filters-tool-panel
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
import { FiltersToolPanelModule } from '@libregrid/filters-tool-panel';
import { SetFilterModule } from '@libregrid/set-filter';

ModuleRegistry.registerModules([AllCommunityModule, FiltersToolPanelModule, SetFilterModule]);

createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [
    { field: 'country', filter: 'agSetColumnFilter' },
    { field: 'sales', filter: 'agNumberColumnFilter' },
  ],
  rowData: [{ country: 'United Kingdom', sales: 120 }],
  defaultColDef: { filter: true },
  sideBar: { toolPanels: ['filters'], defaultToolPanel: 'filters' },
});
```

Open it programmatically with `api.openToolPanel('filters')`. Exclude a
column from the panel with `suppressFiltersToolPanel: true` on its `ColDef`.
This is useful for columns you still want filterable from the header menu
but not listed in the panel.

## API

| Export                   | Purpose                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| `FiltersToolPanelModule` | Registers the `filters` side-bar panel (`moduleName: 'FiltersToolPanel'`). |
| `FiltersToolPanel`       | The panel component implementation.                                        |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/side-bar`](https://github.com/libregrid/libregrid/blob/main/packages/side-bar/README.md) — the panel host
- [`@libregrid/set-filter`](https://github.com/libregrid/libregrid/blob/main/packages/set-filter/README.md), [`@libregrid/multi-filter`](https://github.com/libregrid/libregrid/blob/main/packages/multi-filter/README.md) — filter types commonly shown in this panel

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
