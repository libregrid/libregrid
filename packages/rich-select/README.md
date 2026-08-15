# @libregrid/rich-select

A searchable, virtualized dropdown cell editor — stays fast with thousands
of options, supports typing to filter, and highlights matches.

Replaces AG Grid Enterprise's `RichSelect` module.

## Install

```bash
npm install ag-grid-community @libregrid/rich-select
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

Set a column's `cellEditor` to `'agRichSelectCellEditor'`:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { RichSelectModule } from '@libregrid/rich-select';

ModuleRegistry.registerModules([AllCommunityModule, RichSelectModule]);

createGrid(document.querySelector('#grid')!, {
  columnDefs: [
    { field: 'country' },
    {
      field: 'status',
      editable: true,
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: {
        values: ['Draft', 'Published', 'Review'],
        allowTyping: true,
        filterList: true,
        searchType: 'matchAny',
        highlightMatch: true,
      },
    },
  ],
  rowData: [{ country: 'United Kingdom', status: 'Draft' }],
});
```

Double-click (or press Enter on) a cell to open the editor. Type to filter.
Press Enter to commit. The option list stays responsive even with tens of
thousands of `values`. It renders only what's visible.

## API

| Export | Purpose |
| --- | --- |
| `RichSelectModule` | Registers the editor under the component name `agRichSelectCellEditor` (`moduleName: 'RichSelect'`). |
| `RichSelectCellEditor` | The editor component — extend it for a themed variant, as `@libregrid/material`'s `MaterialRichSelectCellEditor` does. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/material`](https://github.com/libregrid/libregrid/blob/main/packages/material/README.md) — Material-styled variant

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
