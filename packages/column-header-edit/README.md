# @libregrid/column-header-edit

Let users rename column and column-group headers. Edited names are stored in
column state so your application can save and restore a user’s preferred labels.

[Documentation and examples](https://libregrid.dev/column-header-edit)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/column-header-edit
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency. The
"Edit Column Name" menu entry requires `@libregrid/menu`
(`ColumnMenuModule`). Register both modules for the UI shown below.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { ColumnMenuModule } from '@libregrid/menu';
import { ColumnHeaderEditModule } from '@libregrid/column-header-edit';

ModuleRegistry.registerModules([AllCommunityModule, ColumnMenuModule, ColumnHeaderEditModule]);

createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [
    { field: 'name', headerNameEditable: true },
    {
      headerName: 'Region',
      headerNameEditable: true,
      children: [{ field: 'country' }],
    },
  ],
  rowData: [{ name: 'Alice', country: 'UK' }],
});
```

Mark any column or column group `headerNameEditable: true` and its column menu
gains an **Edit Column Name** item. The editor opens over the header cell.

### Apply behavior and saved state

The default editor applies header changes as users type. Set
`columnHeaderEdit: { applyMode: 'deferred' }` in the grid options to show
Apply and Cancel buttons. Set `suppressColumnHighlighting: true` in that
object to disable editing highlights.

Edited names take priority over `headerValueGetter` and `headerName`.
Save column state with `api.getColumnState()` and restore it with
`api.applyColumnState({ state })`. The overridden label is held in the state's
`headerName` field; setting it to `null` restores the definition's label.
Group labels are stored in column-group state. See the
[header editing guide](https://libregrid.dev/column-header-edit) for examples.

## API

| Export                    | Purpose                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| `ColumnHeaderEditModule`  | Registers the feature (`moduleName: 'ColumnHeaderEdit'`).                 |
| `ColumnHeaderEditService` | The `colHeaderEditSvc` bean — editor, highlight state, menu contribution. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/menu`](https://github.com/libregrid/libregrid/blob/main/packages/menu/README.md) — column menu this feature plugs into

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
