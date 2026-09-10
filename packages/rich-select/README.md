# @libregrid/rich-select

Edit a cell by choosing from a searchable, virtualized list. Configure the
allowed values, typing behavior, and match highlighting for fields such as
status, category, or country.

[Documentation and examples](https://libregrid.dev/advanced-filter-find) · [Angular Material editor](https://libregrid.dev/material)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/rich-select
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

Set a column's `cellEditor` to `'agRichSelectCellEditor'`:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { RichSelectModule } from '@libregrid/rich-select';

ModuleRegistry.registerModules([AllCommunityModule, RichSelectModule]);

createGrid(document.querySelector<HTMLElement>('#grid')!, {
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
Press Enter to commit. The list renders a visible window of options rather than the entire set.

## API

| Export                 | Purpose                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `RichSelectModule`     | Registers the editor under the component name `agRichSelectCellEditor` (`moduleName: 'RichSelect'`).                   |
| `RichSelectCellEditor` | The editor component — extend it for a themed variant, as `@libregrid/material`'s `MaterialRichSelectCellEditor` does. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/material`](https://github.com/libregrid/libregrid/blob/main/packages/material/README.md) — Material-styled variant

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
