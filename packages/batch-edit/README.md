# @libregrid/batch-edit

Let users review several cell edits before committing or discarding them
together. Edits are staged in the grid; committing a batch updates row data.
Saving those changes to a backend remains your application’s responsibility.

[Documentation and examples](https://libregrid.dev/batch-edit)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/batch-edit
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<button id="start">Start batch</button>
<button id="save">Commit edits</button>
<button id="cancel">Discard edits</button>
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { BatchEditModule } from '@libregrid/batch-edit';

ModuleRegistry.registerModules([AllCommunityModule, BatchEditModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'country', editable: true }],
  rowData: [{ country: 'United Kingdom' }],
});

// Drive the batch from your own UI:
document.querySelector('#start')!.addEventListener('click', () => api.startBatchEdit());
document.querySelector('#save')!.addEventListener('click', () => api.commitBatchEdit());
document.querySelector('#cancel')!.addEventListener('click', () => api.cancelBatchEdit());
```

## Events

- `batchEditingStarted` — fires lazily when the first edit is staged (not on `startBatchEdit`).
- `batchEditingStopped` — `changes` carries the committed change records (empty on cancel).
- `cellValueChanged` — deferred until the commit.

## Notes

- Supports the client-side row model only.
- With `invalidEditValueMode: 'block'`, an invalid edit holds the commit until
  it is corrected or cancelled.
- Edit validation rules live on `colDef.cellEditorParams.getValidationErrors`
  (the v36 API).
- Cancel discards all staged values, including edits whose cell editor has
  already closed.

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
