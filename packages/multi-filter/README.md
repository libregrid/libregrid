# @libregrid/multi-filter

Compose multiple filters on one column — a text filter and a set filter
together, for example. Each shows as an accordion or nested sub-menus.

Replaces AG Grid Enterprise's `MultiFilter` module.

## Install

```bash
npm install ag-grid-community @libregrid/multi-filter
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/set-filter` is installed automatically. Combining it with the
set filter is the common case.

## Usage

Set a column's `filter` to `'agMultiColumnFilter'`. List the filters to
compose in `filterParams.filters`:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { MultiFilterModule } from '@libregrid/multi-filter';

ModuleRegistry.registerModules([AllCommunityModule, MultiFilterModule]);

createGrid(document.querySelector('#grid')!, {
  columnDefs: [
    {
      field: 'region',
      filter: 'agMultiColumnFilter',
      filterParams: {
        filters: [
          { title: 'Contains', filter: 'agTextColumnFilter', display: 'accordion' },
          {
            title: 'Allowed regions',
            filter: 'agSetColumnFilter',
            display: 'subMenu',
            filterParams: { values: ['Europe', 'Americas', 'Asia'] },
          },
        ],
      },
    },
  ],
  rowData: [{ region: 'Europe' }],
});
```

`display` controls how each nested filter is shown. `'accordion'` stacks it
inline. `'subMenu'` puts it behind its own menu item.

## API

| Export | Purpose |
| --- | --- |
| `MultiFilterModule` | Registers the filter under the component name `agMultiColumnFilter` (`moduleName: 'MultiFilter'`). |
| `MultiFilter` | The filter UI component. |
| `MultiFilterHandler` | Filter-model logic composing the nested filters. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/set-filter`](https://github.com/libregrid/libregrid/blob/main/packages/set-filter/README.md) — the checkbox set filter, commonly nested here

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
