# Phase 17 — Batch Edit

**Status:** Complete — `@libregrid/batch-edit` implemented, tested, validated (`npm run verify` green), demo + e2e, documented.
**Depends on:** Enterprise core (editing, undo/redo)
**Blocks:** nothing

**Packages:** `@libregrid/batch-edit` (`BatchEdit`)
**Parity:** [`../parity/batch-edit.md`](../parity/batch-edit.md)

---

## Context

AG Grid Enterprise's batch editing lets a user stage multiple cell edits and write them in one pass — or discard them all. It is an **API-only** feature: the grid exposes `startBatchEdit`, `commitBatchEdit`, `cancelBatchEdit` and `isBatchEditing` on the `GridApi`, and the host application provides the buttons.

The heavy lifting already exists in `ag-grid-community`: the edit service implements the batch machinery (pending edit maps, staged values, deferred `cellValueChanged` events, lazy `batchEditingStarted`/`batchEditingStopped` dispatch, the `invalidEditValueMode: 'block'` interaction, full-row batch markers). The Community `GridApi` even reserves four API-function slots for this feature — but they are never registered.

So this package is the **registration layer**: a module that fills the four reserved slots by delegating to the Community edit service, plus the small CSS that highlights staged edits. No new beans.

## Contracts (verified against `ag-grid-community@36.1.0` dist)

- `EnterpriseModuleName` includes `'BatchEdit'`; the API surface is reserved as `mod("BatchEdit", { startBatchEdit, cancelBatchEdit, commitBatchEdit, isBatchEditing })` — the four unregistered API functions this module fills.
- `editSvc.startBatchEditing()` / `stopBatchEditing(params?)` / `isBatchEditing()` — the batch primitives the API functions delegate to.
- `stopBatchEditing({ commit: true, cancel: false, source: 'api' })` commits; `{ cancel: true, source: 'api' }` cancels (mirrors the Enterprise `COMMIT_PARAMS` / `CANCEL_PARAMS` shape).
- `batchEditingStarted` fires lazily on the first staged write — not on `startBatchEdit`; `batchEditingStopped` carries a `changes` array of the committed change records (plain `{ rowIndex, rowPinned, columnId, newValue, oldValue }` records at runtime, despite the d.ts declaring `CellValueChange[]`).
- During a batch, `setDataValue` stages a pending value without touching the row data; `cellValueChanged` is deferred until commit. The deferred events carry `source: 'edit'` and no `from`/`eventSource` (verified v36.1.0 engine behavior).
- `invalidEditValueMode: 'block'` holds a commit open while an invalid edit is staged.
- Community applies `ag-cell-batch-edit` (cell) and `ag-row-batch-edit` (full-row) itself; the module only supplies the highlight styles.
- Batch editing is a Client Row Model feature (Enterprise parity); single-undo-action grouping is partial in Community (documented in parity).

## Todo

### 17A — `@libregrid/batch-edit`

- [x] Package scaffold (`package.json`, `tsconfig.lib.json`, `project.json`, NOTICE, LICENSE, README, generated `version.ts`)
- [x] `BatchEditModule` — `moduleName: 'BatchEdit'`, `enterprise: true`, depends on `EnterpriseCoreModule`
- [x] Grid API functions `startBatchEdit`, `commitBatchEdit`, `cancelBatchEdit`, `isBatchEditing` delegating to `beans.editSvc`
- [x] `batchEditCss` — staged-cell / full-row highlights in the LibreGrid theme tokens
- [x] Unit specs (module shape, delegation params, no-op safety)
- [x] jsdom integration specs (staging, deferred events, lazy start, empty batch, cancel, multi-cell commit, block-mode hold/release, full-row marker)
- [x] Demo route + Playwright e2e (start/commit/cancel flow, axe light + dark)
- [x] `npm run verify` green (lint, all tests, build, contamination, versions, budgets)

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Module shape; the four API functions delegate with the exact param objects; safe no-ops when the edit service is absent |
| **Integration** (jsdom, real grid) | Staging leaves row data untouched and marks the cell; commit writes everything in one pass and fires the deferred `cellValueChanged` events (`source: 'edit'`, no `from`); lazy `batchEditingStarted`; empty batch fires neither event; cancel stops with an empty `changes`; multi-row / multi-column commit; block mode holds a commit and a corrected edit releases it; full-row editing marks `ag-row-batch-edit` |
| **E2E** (Playwright) | Idle → start → edit two cells → commit updates both; cancel discards; the event log shows the lifecycle; axe clean light + dark |

## Acceptance criteria

- [x] Start a batch, edit cells, commit — values land in one pass, events fire
- [x] Cancel discards every staged edit (open editors revert; staged values persist across cancel — engine behavior, documented in parity)
- [x] Block-mode validation holds the commit while an invalid edit is open
- [x] Full-row edits inside a batch mark the row
- [x] `npm run verify` green
