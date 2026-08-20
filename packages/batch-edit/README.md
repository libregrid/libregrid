# @libregrid/batch-edit

Stage cell edits and write them in one pass — or discard them all.

Replaces AG Grid Enterprise's `BatchEdit` module.

## Install

```bash
npm install ag-grid-community @libregrid/batch-edit
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { BatchEditModule } from '@libregrid/batch-edit';

ModuleRegistry.registerModules([AllCommunityModule, BatchEditModule]);

const api = createGrid(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'country', editable: true }],
  rowData: [{ country: 'United Kingdom' }],
});

// Drive the batch from your own UI:
api.startBatchEdit();
// ... user edits cells; edits are staged, not written ...
api.commitBatchEdit();   // write all staged edits in one pass
api.cancelBatchEdit();   // discard them
api.isBatchEditing();    // while a batch is in flight
```

## Events

- `batchEditingStarted` — fires lazily when the first edit is staged (not on `startBatchEdit`).
- `batchEditingStopped` — `changes` carries the committed change records (empty on cancel).
- `cellValueChanged` — deferred until the commit.

## Notes

- Client Row Model only — the enterprise module is CSR-M only as well.
- With `invalidEditValueMode: 'block'`, an invalid edit holds the commit until
  it is corrected or cancelled.
- Edit validation rules live on `colDef.cellEditorParams.getValidationErrors`
  (the v36 API).
- Cancel reverts every staged edit, open or closed: the v36.1.0 engine only
  reverts editors still open, so the module restores closed-editor staged
  values from the edit model itself and a later batch cannot write them.

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
