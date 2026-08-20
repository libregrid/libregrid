# Phase 15 — A4: Cell Notes (Gap Plan P1 item 8)

**Status:** ✅ Complete (2026-08-19). `npm run verify` green; lockstep changeset staged (`.changeset/a4-cell-notes.md`, not yet consumed — the Phase-14 `.changeset/p0-batch.md` remains unconsumed and untouched).
**Depends on:** Phases 1–14, `ENTERPRISE-GAP-PLAN.md` §A4, `docs/parity/context-menu.md` (the `note` stub)
**Blocks:** nothing

**Packages:** new `@libregrid/notes`; modified `@libregrid/menu` (default menu items), `@libregrid/all` (barrel)
**Parity:** [`../parity/cell-notes.md`](../parity/cell-notes.md), [`../parity/context-menu.md`](../parity/context-menu.md) (`note` 🟡→✅)

---

## Context

A4 (gap plan P1 item 8: "A4 Cell notes (unblocks `note` menu stub)") ships the
Enterprise `Notes` module as `@libregrid/notes`. Behavior specs come from the
public ag-grid.com v36.1.0 notes page (guardrail G2); the MIT
`ag-grid-community@36.1.0` dist in `node_modules` defines the module/bean
contracts (guardrail G1: no `ag-grid-enterprise` anywhere).

The module is a *service feature*: it registers under the two reserved
Community bean slots (`notesSvc`, `notesDataSvc`) that the stock build already
calls from the cell and full-width-row rendering paths, and it contributes the
`note` context-menu item to the `@libregrid/menu` registry. The real gap this
phase closes in the menu package: the default context menu never contained the
`note` token, so the item could not appear by default.

## Contracts (verified against `ag-grid-community@36.1.0`)

- **Bean slots** — `beans.notesSvc?` / `beans.notesDataSvc?` are reserved in the
  Community bean graph; nothing else populates them.
- **Cell hook** — `CellCtrl.setComp()` sets `eGui` *before* `addFeatures()`;
  the stock build then calls `notesSvc?.createNotesFeature(this)` (and destroys
  it on teardown), and its `showNote` path calls
  `notesFeature?.show({ focusEditor })` + `refresh()`. This is how `Shift+F2`
  reaches the feature.
- **Full-width-row hook** — `FullWidthRowFeature.initialiseComp()` calls
  `notesSvc?.createFullWidthNotesFeature(this.rowCtrl)` with refresh sites in
  the row lifecycle.
- **Keys Community wires** — `Shift+F2` on cells and full-width rows only.
  There is no hover/click mouse path in Community; the feature's own
  listeners implement `noteTrigger: 'hover' | 'click'`.
- **`onDataSourceChanged`** — never invoked by Community; `NotesService`
  calls it itself from the managed `notesDataSource` property listener (and
  reads the initial option in postConstruct, since managed listeners fire
  only on change).
- **v36 full-width rows (breaking vs older docs)** — `fullWidthRowCallback`
  is removed. Consumers use `isFullWidthRow(params: { rowNode, … })` +
  `fullWidthCellRenderer` (plain function renderers work via
  `adaptFunction`). The full-width row element carries `.ag-row` *and*
  `.ag-full-width-row`.
- **Context menu** — a menu renders only if items survive `mapItems`/
  `mapMixed` + `filterItems` (leading/consecutive/trailing separators are
  trimmed; null factory results are dropped). `mapItems` resolves only the
  names passed, so an item absent from `DEFAULT_CONTEXT_MENU_ITEMS` (or the
  `getContextMenuItems` return) is never shown. `note` is now in the default
  list; without `@libregrid/notes` the factory returns null and separator
  trimming keeps the menu byte-identical.
- **Grid API** — the Community `GridApi` is a concrete class whose
  constructor binds every key of `gridApiFunctionsMap`, and
  `ApiFunctionService.addFunction` is called from `registerModuleFeatures`
  for each registered module's `apiFunctions`. So
  `api.getNote/setNote/refreshNotes` (this module's `apiFunctions`) and
  `api.showContextMenu` (the ContextMenu module's) both resolve at runtime.
- **Note shape** — `Note { text (required), readOnly?, author?, createdAt?,
  updatedAt?, metadata? }`; `NotesDataSource.getNote/setNote` take
  `{ rowNode, column: Column, location?: 'cell' }` and, for full-width rows,
  `{ rowNode, location: 'fullWidthRow', pinned? }`. The grid API's
  `GetNoteParams/SetNoteParams` accept `column: ColKey` (string | ColDef |
  Column) — resolution happens in `NotesDataService.toColumn`; the service
  passes unresolved params to the data service.

## Delivery

### 15.1 — `@libregrid/notes` package (new)

- `NotesModule` (`moduleName: 'Notes'`, `enterprise: true`,
  `dependsOn: [EnterpriseCoreModule]`) with beans `NotesDataService`
  (`notesDataSvc`) + `NotesService` (`notesSvc`), `lgr-`-prefixed CSS (G4),
  and `apiFunctions { getNote, setNote, refreshNotes }`.
- `NotesDataService` — validates the `notesDataSource` against the module
  name, owns its lifecycle (init/destroy, swap on change), exposes
  `supportsFullWidthRows()`, and resolves `ColKey` params to columns.
- `NotesService` — `getNoteAccess` (note, readOnly, suppression via
  `colDef.suppressNoteActions` boolean|callback), `createNotesFeature` /
  `createFullWidthNotesFeature` (deduped per `rowId::colId` key),
  `showNote`/`setNote`/`refreshNotes` (feature refresh after writes), the
  note popup (header title = author, `Created:`/`Updated:` meta lines,
  textarea vs read-only div, remove button, resize handle, single active
  popup, commit-on-close-if-dirty), and the `note` context-menu item
  (Add / Edit+Remove / View+disabled Remove / View only).
- `NotesFeature` — hover (delay), mouseout (hide delay with re-entry
  window), click (mousedown, button 0), marker class toggling, popup
  placement via a synthetic `contextmenu` event +
  `positionPopupUnderMouseEvent` + `withViewportPopupParent`.
- `colKey.ts` — `isLiveColumn` / `isColumnInstance` / `colIdOf` (Community's
  `isColumn` is `instanceof AgColumn`; duck-typing keeps stubs and live
  columns both working).

### 15.2 — `@libregrid/menu` default menu

`DEFAULT_CONTEXT_MENU_ITEMS` ends with `separator, note`.

### 15.3 — Wiring

tsconfig base paths + vitest alias + `packages/all` barrel,
`bundle-budgets.json` (notes 50 KB, measured 42.0 KB unminified) + consumer
fixture, `apps/docs` route `/notes` (in-memory `FullWidthNotesDataSource`
with `supportsFullWidthRows`, seeded notes incl. a read-only note, a
`suppressNoteActions` column, a full-width row note, `noteTrigger` toggle,
programmatic add/clear), E2E spec.

## Definition of Done

- [x] `npx vitest run packages/notes` — 4 files, 46 tests (module shape,
      data-service unit, service unit, jsdom integration incl. hover/click/
      Shift+F2, read-only, full-width rows, runtime source swap, and the
      context menu).
- [x] Full suite green (133 files, 927 tests) — no regression from the menu
      default-item change.
- [x] Docs route `/notes` + `apps/docs-e2e/src/e2e/notes.spec.ts` (7 tests).
- [x] Parity checklist `docs/parity/cell-notes.md`; `context-menu.md`
      `note` 🟡→✅; gap-list 13A candidate removed; migration guide maps
      `Notes` → `@libregrid/notes`; gap plan A4/P1-8 marked shipped.
- [x] `npm run verify` green (lint, test, build, contamination, versions,
      budgets).
