# @libregrid/column-header-edit

Editable column and group header names for AG Grid Community — rename headers
from the UI ("Edit Column Name" in the column menu) and persist the result in
column / column-group state.

Replaces AG Grid Enterprise's `ColumnHeaderEditModule`
(AG Grid 36.1, "Editable Column Header Names").

## Install

```bash
npm install ag-grid-community @libregrid/column-header-edit
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency. The
"Edit Column Name" menu entry requires `@libregrid/menu`
(`ColumnMenuModule`); without it the editor still works programmatically via
the `colHeaderEditSvc` bean.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { ColumnMenuModule } from '@libregrid/menu';
import { ColumnHeaderEditModule } from '@libregrid/column-header-edit';

ModuleRegistry.registerModules([AllCommunityModule, ColumnMenuModule, ColumnHeaderEditModule]);

createGrid(document.querySelector('#grid')!, {
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

### Live vs. deferred

```ts
// Default: every keystroke is applied immediately (live mode).
createGrid(el, { /* ... */ });

// Show Apply/Cancel buttons; the name only changes on commit.
createGrid(el, { columnHeaderEdit: { applyMode: 'deferred' } });

// Do not highlight the header being edited.
createGrid(el, { columnHeaderEdit: { suppressColumnHighlighting: true } });
```

### Persisted state

Edited names take priority over `headerValueGetter` and `headerName`, and are
persisted as part of the column state (`headerName`) and column-group state,
so they survive `api.getColumnState()` / `api.setColumnState()` round-trips.
Passing `headerName: null` clears the override and reverts to the definition.

### Programmatic control

The service bean (`colHeaderEditSvc`) implements AG Grid's
`IColumnHeaderEditService`:

```ts
const svc = beans.colHeaderEditSvc;
svc.isEditable(column);
svc.getEditColumnNameMenuItem(column);
svc.showHeaderNameEditor(column); // or a column group
```

## API

| Export | Purpose |
| --- | --- |
| `ColumnHeaderEditModule` | Registers the feature (`moduleName: 'ColumnHeaderEdit'`). |
| `ColumnHeaderEditService` | The `colHeaderEditSvc` bean — editor, highlight state, menu contribution. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/menu`](https://github.com/libregrid/libregrid/blob/main/packages/menu/README.md) — column menu this feature plugs into

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
