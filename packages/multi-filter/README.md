# @libregrid/multi-filter

Combine multiple filters on one column, such as a text filter and a checkbox
set filter. Choose inline, accordion, or submenu presentation for each child filter.

[Documentation and examples](https://libregrid.dev/filters)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/multi-filter
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/set-filter` is installed automatically. Combining it with the
set filter is the common case.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

Set a column's `filter` to `'agMultiColumnFilter'`. List the filters to
compose in `filterParams.filters`:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { MultiFilterModule } from '@libregrid/multi-filter';

ModuleRegistry.registerModules([AllCommunityModule, MultiFilterModule]);

createGrid(document.querySelector<HTMLElement>('#grid')!, {
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

| Export               | Purpose                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `MultiFilterModule`  | Registers the filter under the component name `agMultiColumnFilter` (`moduleName: 'MultiFilter'`). |
| `MultiFilter`        | The filter UI component.                                                                           |
| `MultiFilterHandler` | Filter-model logic composing the nested filters.                                                   |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/set-filter`](https://github.com/libregrid/libregrid/blob/main/packages/set-filter/README.md) — the checkbox set filter, commonly nested here

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
