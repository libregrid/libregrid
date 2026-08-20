# Phase 14 — Post-1.0 P0 Batch (Gap Plan §9 items 1–6 + A9)

**Status:** ✅ Complete (2026-08-19) — scope chosen by the user on 2026-08-18: the full P0 batch from `ENTERPRISE-GAP-PLAN.md` §9 plus A9 (P0 item 2), then pause. `npm run verify` green; lockstep 1.2.0 changeset staged (`.changeset/p0-batch.md`, not yet consumed).
**Depends on:** Phases 1–13 (shipped 1.1.1), `ENTERPRISE-GAP-PLAN.md` (research), `docs/reference/ag-grid-site-inventory.md` (site evidence, docs v36.1.0)
**Blocks:** nothing

**Packages:** new `@libregrid/row-numbers` (A5), new `@libregrid/column-header-edit` (A7); modified `@libregrid/row-grouping` (A10), `@libregrid/menu` (A10/P0-6), `@libregrid/all` (barrel)
**Parity:** [`../parity/row-numbers.md`](../parity/row-numbers.md), [`../parity/column-header-edit.md`](../parity/column-header-edit.md), [`../parity/aggregation.md`](../parity/aggregation.md) (Show Values As), [`../parity/context-menu.md`](../parity/context-menu.md), [`../parity/column-menu.md`](../parity/column-menu.md), [`../parity/server-side-row-model.md`](../parity/server-side-row-model.md) (A9 close note)

---

## Context

The gap plan's §9 priorities ranked six items P0. This phase delivers all of them,
plus A9 (SSRM API verification, which is P0 item 2) because its outcome is a
verification, not a build. Behavior specs come from the public ag-grid.com
v36.1.0 pages (guardrail G2); the MIT `ag-grid-community@36.1.0` source in
`node_modules` defines the module/bean contracts (guardrail G1: no
`ag-grid-enterprise` anywhere).

Two new packages are both *service features*: they register under reserved
Community bean slots (`rowNumbersSvc`, `colHeaderEditSvc`) that the stock build
already calls, and they contribute to the existing `@libregrid/menu` registry.
Neither needs a new module name beyond the site's own (`RowNumbersModule`,
`ColumnHeaderEditModule`).

## Contracts (verified against `ag-grid-community@36.1.0`)

- **RowNumbers** — grid option `rowNumbers?: boolean | RowNumbersOptions`;
  service column `colKind: 'row-number'` with id
  `ROW_NUMBERS_COLUMN_ID` (`'ag-Grid-RowNumbersColumn'`), built via the
  `BaseSingleColService` pattern (Community's `ColumnModel.refresh()` calls
  `rowNumbersSvc.refreshCols()` and merges the result into the column list;
  the header comp calls `rowNumbersSvc.setupForHeader` on init; CellCtrl
  consults `handleMouseDownOnCell`/`handleKeyDownOnCell` on row-number cells
  and `createRowNumbersRowResizerFeature` for the resizer). CSV export already
  honours `isRowNumberCol` + the `exportRowNumbers` param.
- **ColumnHeaderEdit** — grid option
  `columnHeaderEdit?: ColumnHeaderEditOptions`
  (`applyMode: 'live' | 'deferred'`, `suppressColumnHighlighting`);
  `colDef.headerNameEditable` (also on `ColGroupDef`, via `AbstractColDef`).
  Community's `ColumnNameService.getHeaderName` reads
  `column.headerNameOverride` first (precedence over `headerValueGetter`),
  `AgColumn.setHeaderNameOverride` dispatches `columnHeaderNameChanged`,
  column state serialises `headerName: column.headerNameOverride`
  (`applyFieldState` applies it back), and group state serialises/ applies
  header names through `colModel.groupHeaderNameOverrides`. Community's own
  code calls only the highlight methods (`isHighlightedColumn`/
  `isHighlightedGroup`) — the menu entry point and editor UI are ours to
  build. `setColumnGroupState` (public API) applies group header-name state.
- **Show Values As** — `applyColumnState` dispatches `showValuesAs` to
  `showValuesAsSvc.syncColState`, so menu items can set modes through the
  public API; mode definitions carry `transform`/`formatter`/`displayName`/
  `description`/`transformedDataType`/`params`/`defaultAggFunc`/
  `applicability`/`ready` (`colDef-showValuesAs.d.ts`).
- **SSRM (A9)** — `_ServerSideRowModelGridApi` (all methods tagged
  `@agModule ServerSideRowModelApiModule`) lists exactly nine methods;
  `@libregrid/server-side-row-model`'s `ServerSideRowModelModule` registers
  under `moduleName: 'ServerSideRowModelApi'` and exposes all nine in
  `apiFunctions`. Nothing beyond the implemented contract.

## Todo

### 14.1 — Doc hygiene (P0-1)

- [x] `docs/parity/find.md`: `toolbar` row is stale ❌ — the Quick Access Toolbar shipped in 1.1.0 (see `toolbar.md`)
- [x] `docs/parity/pivoting.md`: `agPivotPanelToolbarItem` row is stale ❌ — shipped with the toolbar
- [x] `docs/guides/migration-guide.md`: "Toolbar" listed as post-1.0 candidate — shipped; "RowNumbers" now shipped by this phase
- [x] `docs/phases/phase-13-hardening.md` 13A: Toolbar row stale (shipped 1.1.0); RowNumbers + column header editing rows now superseded by Phase 14
- [x] `docs/parity/aggregation.md`: re-verify the `percentOfParentColumnTotal` "no pivot support" note (pivot shipped in Phase 8 — the note describes our service, not the baseline)
- [x] `docs/parity/gap-list.md`: refresh stale counts and the 13A candidate list

### 14.2 — A9: SSRM API verification (close)

- [x] Verify the documented `ServerSideRowModelApiModule` surface (nine `_ServerSideRowModelGridApi` methods) against `packages/server-side-row-model` `apiFunctions`
- [x] Record the close in `docs/parity/server-side-row-model.md` and the plan file

### 14.3 — A5: `@libregrid/row-numbers`

- [x] `RowNumbersService extends BaseSingleColService` (bean `rowNumbersSvc`): colDef build (default width/minWidth 60, `lockPosition` left/right by RTL, non-sortable/movable/autosize, `chartDataType: 'excluded'`), `rowNumbers` option listener (`boolean | RowNumbersOptions`)
- [x] Cell-selection integration: clicking a row number selects all currently visible cells in the row (`rangeSvc.setCellRange`), gated on `cellSelection` + `suppressCellSelectionIntegration`
- [x] Row resizer (`enableRowResizer`): drag the row-number cell's bottom edge to resize the row; dispatch `rowResizeStarted`/`rowResizeEnded`
- [x] `RowNumbersModule` (`moduleName: 'RowNumbers'`, `enterprise: true`) + NOTICE/README/budget/fixture/barrel
- [x] Unit + integration tests (column present/absent with the option, numbering, row selection, resizer events, RTL lock, CSV export exclusion + `exportRowNumbers`)
- [x] Docs route + E2E; parity file `docs/parity/row-numbers.md`

### 14.4 — A7: `@libregrid/column-header-edit`

- [x] `ColumnHeaderEditService` (bean `colHeaderEditSvc`, implements `IColumnHeaderEditService`): `isEditable` (`headerNameEditable`, never for calculated columns), `getEditColumnNameMenuItem`, highlight state + `columnHeaderEditHighlightChanged`
- [x] Header name editor: DOM popup on the header; **live** mode applies as you type (Escape/close keeps); **deferred** mode with Apply/Cancel (Apply/Enter commits, Cancel/Escape/close discards)
- [x] Commit path: `column.setHeaderNameOverride` (columns) / `api.setColumnGroupState` (groups) — persisted in column/grid state; `resetColumnState()` reverts
- [x] `editColumnName` menu item via `registerMenuItems` + `showHeaderNameEditor` apiFunction
- [x] `ColumnHeaderEditModule` (`moduleName: 'ColumnHeaderEdit'`, `enterprise: true`) + NOTICE/README/budget/fixture/barrel
- [x] Unit + integration tests (menu item gating, live/deferred apply, persistence + reset, highlight event, group rename)
- [x] Docs route + E2E; parity file `docs/parity/column-header-edit.md`

### 14.5 — A10: Show Values As completion (in `row-grouping` + `menu`)

- [x] `showValuesAsDef.modes`: user-provided modes and overrides of the built-ins (deep-merged; `true`/`false`/`null`/function entries), incl. `transform`, `formatter`, `displayName`, `description`, `transformedDataType`, `params`, `defaultAggFunc` (column promotion), `applicability`, `ready`
- [x] Column menu: `showValuesAs` item registered by `row-grouping`, added to the default column-menu items; gated by `enableShowValuesAs` (per-column always; via `defaultColDef` only for numeric-type or aggFunc columns); submenu sets modes via `api.applyColumnState`
- [x] Parity: `aggregation.md` (`showValuesAsDef` 🟡→✅ with the per-mode `menu` builder documented as the remaining extension point; `enableShowValuesAs` 🟡→✅), `row-grouping.md` column-menu section

### 14.6 — P0-6: context-menu clipboard/export wiring

- [x] Verify the registry override path: `@libregrid/clipboard` (`copy`/`copyWithHeaders`/`copyWithGroupHeaders`/`cut`/`paste`) and `@libregrid/excel-export` (`export`/`csvExport`/`excelExport`) and `@libregrid/row-grouping` (`expandAll`/`contractAll`) register real factories that replace the Phase-1 stubs — add tests asserting the resolution + the invoked API calls
- [x] `docs/parity/context-menu.md`: stale 🟡 rows → ✅ (owning package named); `pinRow*` rows keep 🟡 with the accurate rationale (Community pinned-row API is read-only — no single-row pin/unpin API exists); `note` stays 🟡 (A4, P1)
- [x] `docs/parity/column-menu.md`: `columnFilter` row stale (filter popup is implemented) → ✅; `editColumnName` → ✅ via A7

### 14.7 — Definition of Done

- [x] `npm run verify` green (lint, test:all, build, check:contamination, check:versions, check:budgets + consumer fixtures)
- [x] Changesets for `@libregrid/row-numbers`, `@libregrid/column-header-edit`, `@libregrid/row-grouping`, `@libregrid/menu`, `@libregrid/all`
- [x] `gap-list.md` counts + 13A list refreshed; `ENTERPRISE-GAP-PLAN.md` status updated
