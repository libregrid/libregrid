# Phase 18 — Calculated Columns (gap-plan A2)

**Status:** Complete — `@libregrid/calculated-columns` implemented, tested, validated, demo + e2e, documented.
**Depends on:** Phases 1/13 (`@libregrid/menu` — column + context menu registry), Phase 2 (`@libregrid/row-grouping` — `aggFunc` group aggregation)
**Blocks:** nothing (the expression engine is written to be reused by A1 Formulas)

**Packages:** new `@libregrid/calculated-columns` (`CalculatedColumns`); modified `@libregrid/menu` (default menu arrays gain the `calculatedColumn` / `calculatedColumnRemove` stubs)
**Parity:** [`../parity/calculated-columns.md`](../parity/calculated-columns.md)

---

## Context

Gap-plan A2 — the first stop in the "derived data" family (pairs with A1
Formulas and A3 Batch Edit): read-only values computed from other columns in
the same row, declared in code (`colDef.calculatedExpression`) or created and
edited by end users from the column menu.

Community v36.1.0 already owns most of the runtime: the `calculatedColsSvc`
and `formula` bean slots, the value pipeline (`ValueService.getValueFromData`
routes calculated columns through `formula.resolveValue`), read-only
enforcement (edit/paste/`setValue` all refuse `isCalculatedCol`), the
`formula-error` CSS class + cell tooltip via `getFormulaError`, the header
icon, `AgColumn.anchoredToColId` order restoration, `calculatedColumns`
option validation, and the Grid State `userColumns` section
(`UserColumnService`). This package is the **implementation layer**: the two
beans Community's seams expect, plus the dialog.

## Contracts (verified against `ag-grid-community@36.1.0` dist + public docs)

- `ICalculatedColumnsService` (context slot `calculatedColsSvc`): the 9-method
  lifecycle — `contributeTo(build)` (splice dynamic columns into the column
  build at anchors), `resetDynamicColumnDefs(preserve?)`, `adoptUserColumns()`,
  `restoreDynamicColumnDefs(state)`, `refreshDynamicColumns(source)`,
  `removeCalculatedColumn`, `openCalculatedColumnDialog`, `isEnabled`,
  `isHighlightedColumn`.
- `ColumnModel.buildFromColDefs` calls `contributeTo` between the tree build
  and `finalizeColumnTree`; `rebuildCols(source)` is the contributor rebuild
  seam for add/update/remove.
- `IFormulaService` (context slot `formula`): `resolveValue(column, row)` is
  the calculated-column value source; `getFormulaError(column, row)` drives
  the `formula-error` CSS and the error tooltip; `validateExpression` is the
  dialog's deferred-mode validator.
- `AgColumn.isCalculatedCol` = `calculatedExpression !== undefined &&
  calculatedColsSvc.isEnabled()`; `anchoredToColId` seats created columns
  after their source column in `applyPrevColumnsOrder`.
- `UserColumnService.registerOwner(enabled, ownedProperties)` +
  `setCreatedColumn`/`setOverride`/`removeColumn` — the persistence layer;
  Grid State carries created columns in its `userColumns` section and
  tombstones for removed declared columns.
- The four `calculatedColumn*` public events dispatch through `eventSvc` and
  reach the grid option handlers (public handlers map, v36.1.0).
- Read-only enforcement, formula-error display, the header icon and the
  `ag-calculated-column` / `ag-calculated-column-highlighted` cell/header CSS
  are Community-owned — verified by integration tests, not reimplemented.

## Todo

### 18A — `@libregrid/calculated-columns`

- [x] Package scaffold (`package.json`, `tsconfig.lib.json`, `project.json`, NOTICE, LICENSE, README, generated `version.ts`)
- [x] `expression.ts` — tokenizer, recursive-descent parser, evaluator, provided functions, error codes, validation + reference collection
- [x] `CalculatedColumnFormulaService` (`formula` bean) — value pipeline, per-cell errors, AST cache, invalidation hooks, A1-scope no-ops
- [x] `CalculatedColumnsService` (`calculatedColsSvc` bean) — user-layer owner registration, `contributeTo` anchor splicing, reset/park/restore/adopt lifecycle, validation flips, events, menu items
- [x] `CalculatedColumnsDialog` — title/type/expression fields, pickers, inline autocomplete, live + deferred apply modes
- [x] `CalculatedColumnsModule` — `moduleName: 'CalculatedColumns'`, `enterprise: true`, depends on `EnterpriseCoreModule`
- [x] Menu: `calculatedColumn` (Add / Edit+Remove submenu) and `calculatedColumnRemove` (context) registry contributions overriding the new `@libregrid/menu` stubs
- [x] Unit specs — expression (30), formula service (13), dialog (14), service (24)
- [x] jsdom integration specs (13) — values, chained refs, errors, read-only, add/edit/remove via menus, validation flips, Grid State round-trip, deferred apply, disabled option, group aggregation
- [x] Demo route + Playwright e2e (declared values, add via menu dialog, error codes, event log, axe light + dark)
- [x] Parity checklist `docs/parity/calculated-columns.md`; gap-list row
- [x] Coverage above repo thresholds (statements 89.8 / branches 77.7 / functions 95.3 / lines 93.9)

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Expression grammar/precedence/coercions/functions/errors; formula bean evaluation + invalidation; dialog interactions incl. pickers, autocomplete, deferred mode; service lifecycle (splicing, reset/park/restore, adopt, validation flips, events, menu factories) |
| **Integration** (jsdom, real grid) | Declared + chained values, error codes + `formula-error` class, edit refusal, add/edit/remove through the real menus, column placement, validation flip events, Grid State round-trip, deferred apply, option disabled, `aggFunc` group aggregation |
| **E2E** (Playwright) | Docs route: declared values, add-through-menu flow, error display, event log, axe clean light + dark |

## Notes

- `SUMIF`/`COUNTIF` accept array arguments; cell-range references arrive with
  A1 Formulas (documented in parity).
- The dialog stores `[colId]` references (the storage form) and shows header
  names as labels; the docs' header-name/group-path display reference is a
  documented v1 simplification.
- The expression engine (parser, evaluator, function registry, error model)
  is written as the shared core for A1 Formulas: `formula` is the seam A1
  extends with per-cell storage, and the function registry already exposes
  `getFunction`/`getFunctionNames`.
