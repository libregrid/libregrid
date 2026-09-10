# @libregrid/set-filter

Filter a column by selecting distinct values from a searchable checkbox list.
Values can come from the loaded grid data, a supplied list, or an asynchronous
callback for server-backed data.

[Documentation and examples](https://libregrid.dev/filters)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/set-filter
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

Set a column's `filter` to `'agSetColumnFilter'`:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { SetFilterModule } from '@libregrid/set-filter';

ModuleRegistry.registerModules([AllCommunityModule, SetFilterModule]);

createGrid(document.querySelector<HTMLElement>('#grid')!, {
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

| Export             | Purpose                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `SetFilterModule`  | Registers the filter under the component name `agSetColumnFilter` (`moduleName: 'SetFilter'`). |
| `SetFilter`        | The filter UI component.                                                                       |
| `SetFilterHandler` | Filter-model logic shared with `@libregrid/multi-filter`.                                      |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/multi-filter`](https://github.com/libregrid/libregrid/blob/main/packages/multi-filter/README.md) — compose this filter with others in one column
- [`@libregrid/filters-tool-panel`](https://github.com/libregrid/libregrid/blob/main/packages/filters-tool-panel/README.md) — a side-bar panel listing every column's filter

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
