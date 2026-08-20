# Parity — Batch Edit

> Parity-audited 2026-08-20 (behavior verified against the v36.1.0 community engine) — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/angular-data-grid/batch-editing/ · transcribed 2026-08-17
**Phase:** 17 · **Package:** `@libregrid/batch-edit`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid API

| Method | Status | Notes |
|---|---|---|
| `startBatchEdit()` | ✅ | Delegates to the Community edit service |
| `commitBatchEdit()` | ✅ | `stopBatchEditing({ commit: true, cancel: false, source: 'api' })` |
| `cancelBatchEdit()` | ✅ | `stopBatchEditing({ cancel: true, source: 'api' })` |
| `isBatchEditing()` | ✅ | False when no edit service is present |

## Events

| Event | Status | Notes |
|---|---|---|
| `batchEditingStarted` | ✅ | Fires lazily on the first staged write, not on `startBatchEdit` |
| `batchEditingStopped` | 🟡 | `changes` carries the committed change records (empty on cancel), but at runtime each record is a plain `{ rowIndex, rowPinned, columnId, newValue, oldValue }` with no `.node`, even though the d.ts declares `CellValueChange[]` |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Staged values leave row data untouched until commit | ✅ | |
| `cancelBatchEdit()` reverts staged values | 🟡 | The d.ts promises "reverting cells to their original values", but v36.1.0 only reverts **open** editors; values already staged (editor closed) stay in the engine's edit model and are written by a later commit |
| `cellValueChanged` deferred until commit | ✅ | Deferred events carry `source: 'edit'` and no `from`/`eventSource` (v36.1.0 engine behavior) |
| `invalidEditValueMode: 'block'` holds the commit while invalid | ✅ | A corrected edit releases the commit; the held commit writes nothing, fires no event, and leaves batch + editors open |
| Edit validation rules | ✅ | The rule lives on `colDef.cellEditorParams.getValidationErrors` (`(params) => string[] \| null`); a top-level colDef rule and the pre-v36 `colDef.validateEditValue` are not honored by v36 |
| Full-row batch editing marks the row | ✅ | `ag-row-batch-edit` is applied by Community when the grid option `editType: 'fullRow'` is set |
| Staged cell highlight | ✅ | `ag-cell-batch-edit` styled with the theme tokens |
| Works with Client Row Model | ✅ | |
| Server-Side Row Model batch editing | ❌ | Enterprise is Client Row Model only (AG Grid docs); SSRM staging would need a new data path |
| Custom renderers refresh on commit | 🟡 | Not exercised by specs — Community's normal refresh path is unchanged; add a spec if a custom renderer misbehaves in a batch |
| Single undo action per committed batch | 🟡 | The Community undo/redo service tracks a batch flag but does not group a batch commit into one undo action in v36.1.0 |
