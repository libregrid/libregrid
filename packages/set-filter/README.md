# @libregrid/set-filter

Virtualized checkbox set filter — search and select from the distinct values
in a column, backed by a filter list that stays fast even with thousands of
values.

Replaces AG Grid Enterprise's `SetFilter` module.

## Install

```bash
npm install ag-grid-community @libregrid/set-filter
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

Set a column's `filter` to `'agSetColumnFilter'`:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { SetFilterModule } from '@libregrid/set-filter';

ModuleRegistry.registerModules([AllCommunityModule, SetFilterModule]);

createGrid(document.querySelector('#grid')!, {
  columnDefs: [
    {
      field: 'country',
      filter: 'agSetColumnFilter',
      filterParams: {
        values: ['United Kingdom', 'United States', 'Germany', 'Japan'],
        buttons: ['apply', 'clear', 'cancel'],
      },
    },
  ],
  rowData: [{ country: 'United Kingdom' }],
});
```

Omit `filterParams.values` to let the filter derive distinct values from the
grid's own data automatically. Provide an async function instead for
server-derived values. Set `filter: true` for the grid's own default column
filter if you don't need this one.

## API

| Export | Purpose |
| --- | --- |
| `SetFilterModule` | Registers the filter under the component name `agSetColumnFilter` (`moduleName: 'SetFilter'`). |
| `SetFilter` | The filter UI component. |
| `SetFilterHandler` | Filter-model logic shared with `@libregrid/multi-filter`. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/multi-filter`](https://github.com/libregrid/libregrid/blob/main/packages/multi-filter/README.md) — compose this filter with others in one column
- [`@libregrid/filters-tool-panel`](https://github.com/libregrid/libregrid/blob/main/packages/filters-tool-panel/README.md) — a side-bar panel listing every column's filter

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
