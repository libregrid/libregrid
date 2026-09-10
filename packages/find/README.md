# @libregrid/find

Search cell text, highlight matches, and move between results without removing
rows from the grid. Use filters when the goal is to narrow the displayed dataset.

[Documentation and examples](https://libregrid.dev/advanced-filter-find)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/find
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { FindModule } from '@libregrid/find';

ModuleRegistry.registerModules([AllCommunityModule, FindModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'country' }, { field: 'status' }],
  rowData: [{ country: 'United Kingdom', status: 'Published' }],
  findOptions: { caseSensitive: false },
});

api.setGridOption('findSearchValue', 'united');
api.addEventListener('findChanged', () => {
  console.log(api.findGetTotalMatches(), 'matches');
});
api.findNext();
api.findPrevious();
```

Customize what a column matches against with `getFindText`. This is useful
when the rendered value differs from the raw data:

```ts
{
  field: 'status',
  getFindText: ({ value }) => (value === 'Published' ? 'Live' : value == null ? null : String(value)),
}
```

Return `null` from `getFindText` to exclude a cell from search entirely.

## API

| Export             | Purpose                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `FindModule`       | Registers the feature (`moduleName: 'Find'`).                                  |
| `FindService`      | Bean backing `findSearchValue`, `findNext`/`findPrevious`, and match tracking. |
| `FindCellRenderer` | Wraps a cell's rendered output to highlight matches.                           |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/advanced-filter`](https://github.com/libregrid/libregrid/blob/main/packages/advanced-filter/README.md) — filter rows out entirely rather than highlighting matches

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
