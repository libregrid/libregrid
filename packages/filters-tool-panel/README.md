# @libregrid/filters-tool-panel

The `filters` side-bar panel lists every filterable column with its filter
UI inline. Users can filter without opening each column's header menu.

Replaces AG Grid Enterprise's `FiltersToolPanel` module.

## Install

```bash
npm install ag-grid-community @libregrid/filters-tool-panel
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/side-bar` is installed automatically.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { FiltersToolPanelModule } from '@libregrid/filters-tool-panel';

ModuleRegistry.registerModules([AllCommunityModule, FiltersToolPanelModule]);

createGrid(document.querySelector('#grid')!, {
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

| Export | Purpose |
| --- | --- |
| `FiltersToolPanelModule` | Registers the `filters` side-bar panel (`moduleName: 'FiltersToolPanel'`). |
| `FiltersToolPanel` | The panel component implementation. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/side-bar`](https://github.com/libregrid/libregrid/blob/main/packages/side-bar/README.md) — the panel host
- [`@libregrid/set-filter`](https://github.com/libregrid/libregrid/blob/main/packages/set-filter/README.md), [`@libregrid/multi-filter`](https://github.com/libregrid/libregrid/blob/main/packages/multi-filter/README.md) — filter types commonly shown in this panel

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
