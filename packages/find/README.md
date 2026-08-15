# @libregrid/find

Search across rendered cell values. Highlight every match, and step through
them — like your browser's find-in-page, scoped to the grid.

Replaces AG Grid Enterprise's `Find` module.

## Install

```bash
npm install ag-grid-community @libregrid/find
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { FindModule } from '@libregrid/find';

ModuleRegistry.registerModules([AllCommunityModule, FindModule]);

const api = createGrid(document.querySelector('#grid')!, {
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

| Export | Purpose |
| --- | --- |
| `FindModule` | Registers the feature (`moduleName: 'Find'`). |
| `FindService` | Bean backing `findSearchValue`, `findNext`/`findPrevious`, and match tracking. |
| `FindCellRenderer` | Wraps a cell's rendered output to highlight matches. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/advanced-filter`](https://github.com/libregrid/libregrid/blob/main/packages/advanced-filter/README.md) — filter rows out entirely rather than highlighting matches

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
