# Parity — Cell Notes

> Parity-audited 2026-08-19 — Phase 15 (A4).

**Source:** https://www.ag-grid.com/javascript-data-grid/notes/ · transcribed 2026-08-18
**Phase:** 15 (A4) · **Package:** `@libregrid/notes`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
| --- | --- | --- |
| `notesDataSource` | ✅ | `NotesDataSource \| FullWidthNotesDataSource`. Read in postConstruct, then a managed property listener: set/swap/clear at runtime with `setGridOption` without a redraw. Swap destroys the old source and inits the new one (`init({ api, context })` / `destroy()`). Community never calls `onDataSourceChanged`, so `@libregrid/notes` invokes it itself. Integration-tested, including runtime enable/disable. |
| `noteTrigger` | ✅ | `'hover'` (default) or `'click'`. Live change via `setGridOption` — the per-target feature re-arms its listeners. Integration-tested (hover no-op + mousedown open in click mode). |
| `noteShowDelay` | ✅ | Default 180 ms; only applies to the hover trigger. The delay timer is cancelled by mouseout/cancel. |
| `noteHideDelay` | ✅ | Default 220 ms; the pointer may move off the popup and back within the window without closing it. |
| `colDef.suppressNoteActions` | ✅ | `boolean \| (params: { node, column, data, colDef, api, context }) => boolean`. Suppressed cell with an existing note: *View Note* only; without a note: no interactions, no menu items. Unit-tested (both boolean and callback forms). |

## Full-width rows

| Aspect | Status | Notes |
| --- | --- | --- |
| `isFullWidthRow` + `fullWidthCellRenderer` | ✅ | The v36 full-width row API (`fullWidthRowCallback` was removed upstream). Full-width row elements carry `.ag-row.ag-full-width-row`. |
| `supportsFullWidthRows` flag | ✅ | `NotesDataService.supportsFullWidthRows()` is true only for a `FullWidthNotesDataSource` (flag `=== true`); a cell-only source never receives full-width params and full-width rows get no note feature. Integration-tested both ways. |
| Pinned full-width rows | ✅ | `pinned: 'left' \| 'right'` is threaded through via the row control's `findInfoForEvent` (the `pinned` key of the data-service params). |

## Behaviour

| Requirement | Status | Notes |
| --- | --- | --- |
| Open on hover | ✅ | Hover a noted, non-suppressed cell for `noteShowDelay` → popup. Integration-tested. |
| Open on click | ✅ | Left mousedown with `noteTrigger: 'click'`. Integration-tested. |
| `Shift+F2` | ✅ | Community wires the keydown on cells and full-width rows; it calls the feature's `show({ focusEditor })` — the editor receives focus on create. Integration-tested (empty new note discarded, typed note commits). |
| Note shape | ✅ | `Note { text (required), readOnly?, author?, createdAt?, updatedAt?, metadata? }`. Metadata is rendered exactly as provided; the editor updates `text` only. |
| Edit + commit | ✅ | Editable notes render a `textarea`; closing commits only when the text changed. A brand-new note commits only with non-empty text. Metadata is preserved across an edit. Integration-tested. |
| Read-only notes | ✅ | `note.readOnly` → read-only `div[aria-readonly]`, no remove button, *View Note* in the menu. Integration-tested. |
| Markers | ✅ | Rendered cells and full-width rows with a note get `lgr-cell-has-note` (a dot, module CSS). `refreshNotes` re-evaluates markers, optionally scoped by `rowNodes` / `columns`. Integration-tested. |
| Popup placement | ✅ | Positioned under the mouse via a synthetic `contextmenu` event + Community's `positionPopupUnderMouseEvent`, parented with `withViewportPopupParent`. |
| Single active popup | ✅ | One popup at a time; opening another target closes the first (committing if dirty). |
| Data source as source of truth | ✅ | No note state is kept in the grid; every read/write goes through the data source (`getNote`/`setNote`, `note: undefined` removes). No `noteChanged` event, matching the Enterprise contract. |

## Context menu

| Item | Status | Notes |
| --- | --- | --- |
| `note` token in the default menu | ✅ | Phase 15 added `separator, note` to `DEFAULT_CONTEXT_MENU_ITEMS` (`@libregrid/menu`). Without `@libregrid/notes` the factory resolves to nothing and separator trimming leaves the default menu unchanged; with it, items appear: no note → *Add Note*; editable → *Edit Note* + *Remove Note*; read-only → *View Note* + disabled *Remove Note*; suppressed → *View Note* only (or nothing without a note). Integration-tested. |

## Module

| Item | Status | Notes |
| --- | --- | --- |
| `NotesModule` | ✅ | `moduleName: 'Notes'`, `enterprise: true`, `dependsOn: [EnterpriseCoreModule]`; registers the beans + `lgr-`-prefixed CSS (G4). |
| `NotesService` bean | ✅ | Reserved `notesSvc` slot; implements the community `INotesService` surface (`hasDataSource`, `onDataSourceChanged`, `createNotesFeature`, `createFullWidthNotesFeature`, `getNoteAccess`, `getNote`, `showNote`, `setNote`, `refreshNotes`) plus the `note` context-menu item (registry order 40). |
| `NotesDataService` bean | ✅ | Reserved `notesDataSvc` slot; validates the data source, owns its lifecycle, and resolves `ColKey` (string \| ColDef \| Column) params to columns via the column model. |
| Grid API | ✅ | `getNote(params)`, `setNote(params)`, `refreshNotes(params?)` — the reserved Enterprise method names, registered through `apiFunctions` (Community's `GridApi` exposes every key of the registered modules' function maps). Integration-tested through `createGrid` + `api`. |

## Notes

- **Stable row ids are required.** Notes key off `rowNode.id`, so the grid must set `getRowId` (Community warns 319 without it). Stock warning; not re-implemented.
- **Community runtime seams (verified in `ag-grid-community@36.1.0` dist):** `CellCtrl.setComp()` sets `eGui` before `addFeatures()` (so the feature can read the cell element); the cell and full-width-row call paths (`createNotesFeature(this)` / `createFullWidthNotesFeature(this.rowCtrl)` and their destroy/refresh sites) exist in the stock build and are the only hooks the module uses. Community wires `Shift+F2` only — hover/click are the feature's own listeners.
- **ColKey handling.** The service passes unresolved params to the data service; resolution happens in `NotesDataService.toColumn`. Live `Column` instances are duck-typed (`getColId`) because Community's `isColumn` is an `instanceof AgColumn` check that a plain stub would fail.
- **Docs route:** `/notes` in `apps/docs` (in-memory `FullWidthNotesDataSource`, seeded notes incl. a read-only note, a `suppressNoteActions` column, and a full-width row note); E2E in `apps/docs-e2e/src/e2e/notes.spec.ts`.
