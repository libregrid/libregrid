# Phase 20 — Formulas (gap-plan A1)

**Status:** ✅ Complete — `@libregrid/formulas` shipped; 186 package specs, integration battery, and budgets green (2026-08-24). Note: e2e battery runs Chromium+Firefox locally (WebKit needs OS libs unavailable in the sandbox; full matrix in CI, Phase 18 precedent).

**Bench note (DoD exception, flagged):** `bench:compare` reports an `init` regression
(+17–23%) against the Phase-13 baseline (last promoted at `a3b983c`). Verified
pre-existing: stashing this phase and re-running bench on clean `HEAD` reproduces the
same init regression, and the benchmark grid registers no formula beans and sets no
`allowFormula` columns, so Phase 20 adds no per-cell work to the measured paths. The
drift accumulated across Phases 14–19 without a recorded bench note. Baseline
promotion (per `compare.mjs`'s verify-then-promote flow) vs an init-performance
investigation is a deliberate follow-up decision — this phase does not paper over it.

**User review fixes (2026-08-24, post-branch):** two defects found testing the
`/formulas` route: (1) the tokenised formula rendered at the cell's block start
while the input caret centred — the token overlay now centres vertically
(`align-items: center`), matching the input; (2) with a `formulaDataSource`
configured, re-entering edit mode showed the evaluated field value because
Community routes committed formulas into the store and leaves the computed
value in the field — the editor now reads the stored formula
(`FormulaService.getEditableFormula`) and the service's per-cell store-read
cache is invalidated on every `setFormula` through the data service. Covered
by one jsdom integration spec and one Playwright e2e per fix.
**Depends on:** Phase 18 (`@libregrid/calculated-columns` — expression engine being relocated here, shared `formula` bean), Phase 4 (`@libregrid/cell-selection` — optional range-highlight interplay, runtime-detected)
**Blocks:** calculated-columns parity row `SUMIF`/`COUNTIF` cell ranges (completes here)

**Packages:** new `@libregrid/formulas` (`Formula`); modified `@libregrid/calculated-columns` (hard dependency on `@libregrid/formulas`, shared-bean declaration, public API re-exports preserved); modified `@libregrid/all`, `apps/docs`, `apps/docs-e2e`
**Parity:** [`../parity/formulas.md`](../parity/formulas.md) (new)

---

## Context

Gap-plan A1 — the largest remaining Class A item. Spreadsheet-style per-cell formulas: users type `=...` expressions into grid cells and values recompute when referenced data changes. The four public v36.1.0 docs pages (`formulas`, `formula-editor-component`, `formula-reference`, `formula-custom-functions`) plus the `ag-grid-community@36.1.0` dist define the contract; G2 holds — nothing is read from `ag-grid-enterprise`.

Phase 18 deliberately wrote the expression engine as the shared core and stubbed the A1 hooks on the `formula` bean (`active`, `isFormula`, `setFormulasActive`, `getDataSourceFormula`, `updateFormulaByOffset`). This phase relocates and completes that engine.

## Contracts (verified against `ag-grid-community@36.1.0` dist + public docs)

- **Enablement:** `colDef.allowFormula: true` (per column); rows require IDs (`getRowId`). No grid-level toggle. `AgColumn.allowFormula` mirrors the colDef.
- **Syntax:** `=`-prefixed strings; A1-notation cell refs (`B2`, `AA12`), `$`-absolute refs (`$A$1`, `A$1`, `=$A1`), ranges `A1:B2`; operators `+ - * / ^ & = <> > < >= <= %` (BODMAS); constants incl. `TRUE`/`FALSE`. Error codes `#REF! #NAME? #CIRCREF! #PARSE! #VALUE! #DIV/0! #ERROR!` — all already implemented by the Phase 18 engine.
- **Built-in functions:** exactly the Phase 18 registry (`SUM`, `SUMIF`, `PRODUCT`, `MIN`, `MAX`, `AVERAGE`, `MEDIAN`, `POWER`, `RAND`, `NOW`, `TODAY`, `CONCAT`, `IF` (lazy), `COUNT`, `COUNTA`, `COUNTBLANK`, `COUNTIF`) — the docs' complete list. `SUMIF`/`COUNTIF` gain cell ranges here.
- **Storage:** default is the `=...` string in the cell's row-data field. `gridOptions.formulaDataSource` (`getFormula`/`setFormula`/optional `init({api, context})`/`destroy`) moves storage external to row data; it is also what enables formula columns without field/valueSetter (dist `isSetValueSupported` → `handleExternalFormulaChange`, gated on `formulaDataSvc.hasDataSource()`). No default external store exists.
- **Value pipeline (dist-verified):** the display path checks `column.allowFormula && formula.isFormula(rawValue)` then calls `formula.resolveValue(column, node)`; `resolveCoreValue` consults `formula.getDataSourceFormula(rowNode, column)` for external-store formulas; `getFormulaError` drives the `formula-error` CSS class and cell tooltip (gated on `formula.active && !isCalculatedCol`); `formula.active` switches the CSRM filter stage to soft-filtering; CSRM stamps `formulaRows`/`formulaRowIndex` when `formula.isEvaluationActive()`; `setFormulasActive(colDefList)` is called from the ColumnModel build; the edit service calls `formula.refreshFormulas(true)` after batch commits and `formula?.updateFormulaByOffset({value, rowDelta, columnDelta})` while filling formulas across a range (fill handle).
- **API:** `api.refreshFormulas(rowNode | rowId?)` — the reserved `_FormulaGridApi` slot (`@agModule FormulaModule`); returns `false` for no-op cases.
- **Custom functions:** `gridOptions.formulaFuncs: { [name]: { func } }`; `func` receives `{ row, column, args: Iterable<ValueParam | RangeParam>, values: Iterable<unknown> }`; `RangeParam = { kind: 'range', rowStart, rowEnd, colStart: AgColumn, colEnd: AgColumn }`; throws surface as `#ERROR!` + tooltip and propagate to dependent cells. Lookup order: `formulaFuncs` first, then built-ins.
- **Editor:** `agFormulaCellEditor` is the default editor for `allowFormula` columns (community dist assigns it automatically); tokenised refs, range highlights and range-handle editing require cell selection (degrade silently when absent); any explicit `cellEditor` opts out (formulas still evaluate); `cellEditorParams: { validateFormulas: true }` opts into live validation.
- **Long-hand storage:** the grid stores formulas long-hand (column + row IDs) so refs survive row/column changes; the editor shows shorthand and commits long-hand. **The literal long-hand grammar is not documented on the site** — LibreGrid defines it (see D4).
- **Compatibility (docs):** fill handle and cell selection supported; row numbers supported (clicking a row number adds a row range); cell expressions, tree data, row grouping, pivot/aggregation, master/detail, SSRM/infinite/viewport **not supported**.
- **Export:** CSV exports evaluated values (community display path handles this once `resolveValue` works); Excel export exports the formulas themselves.
- **No formula events, no Grid State section, no undo/redo contract.**

## Design decisions

- **D1 — One canonical `formula` bean, class-identity dedupe.** `AgContext` resolves beans last-wins with no warning, so two modules must not both own `formula`. `createBeansList` collects module beans into a `Set`: the same class declared by both `FormulasModule` and `CalculatedColumnsModule` is instantiated once, making registration order irrelevant.
- **D2 — Engine lives in `@libregrid/formulas`; calculated-columns hard-depends on it** (`"@libregrid/formulas": "^1.3.0"`, justified per package-architecture §4 — the `formula` bean *is* its value pipeline). `@libregrid/calculated-columns` re-exports its 1.3.0 engine API unchanged (flat re-exports from formulas). No reverse dependency (formulas never imports calculated-columns).
- **D3 — `FormulaService.resolveValue` two-mode superset.** Calculated-column mode (Phase 18 behaviour preserved) + per-cell mode (`column.allowFormula` → raw value from data field or `formulaDataSvc`, honouring pending edits via `valueSvc.getValue` non-`'data'` source; if `isFormula(raw)`, evaluate with cell-relative resolution).
- **D4 — Long-hand format (LibreGrid-defined):** cell `[colId:rowId]`, range `[colIdStart:rowIdStart..colIdEnd:rowIdEnd]`. `normaliseFormula(value, shorthand=true)` converts long→shorthand (display/export); the editor commits shorthand→long. `$` flags have no long-hand equivalent (IDs are absolute).
- **D5 — `active` semantics.** `setFormulasActive(colDefList)` sets `active = true` iff some colDef has `allowFormula` **and** the runtime is eligible: CSR row model, not treeData, not pivot mode, no row-grouping beans present. This implements the docs' "not supported" table and keeps the soft-filter path away from grouping filter stages.
- **D6 — No default external store.** Without `formulaDataSource`, `=...` flows through the normal field setter; `hasDataSource()` is true only with the option.
- **D7 — Function-call protocol upgrade.** Range args surface as `RangeParam` objects with a lazy flattened `values` iterator; scalars as `ValueParam`. This is what unblocks `SUMIF`/`COUNTIF` cell ranges for both features.
- **D8 — Evaluation context.** Column letters map to visible leaf column position (excluding row-number/selection/group columns); row numbers to `formulaRowIndex` when stamped, `rowIndex` otherwise (verify empirically). Referenced cells resolve via `valueSvc.getValueFromData`; referenced formula cells recurse with a **cell-keyed** cycle chain (`rowId:colId`) extending the Phase 18 column chain. Out-of-range/unmapped refs → `#REF!`.
- **D9 — `refreshFormulas` via `_ModuleWithApi`** (batch-edit precedent) on `FormulasModule`.

## Todo

### 20A — `@libregrid/formulas` core

- [x] Package scaffold (`package.json`, `tsconfig.lib.json`, `project.json`, NOTICE, LICENSE, README, generated `version.ts`, budget entry)
- [x] `expression.ts` moved + extended: A1 notation, `$` flags, ranges, long-hand refs, `updateFormulaByOffset` (relative shifting, `useRefFormat`), `referencedCells()`, `FormulaFunctionParams` protocol; all Phase 18 behaviour and exports preserved
- [x] `FormulaService` — canonical `formula` bean (D1/D3/D5/D8): two-mode `resolveValue`, per-cell computed cache + invalidation, cycle chains, `getFormulaError`, `validateExpression`, function lookup (`formulaFuncs` → built-ins)
- [x] `FormulaDataService` — `formulaDataSvc` bean wrapping `gridOptions.formulaDataSource`
- [x] `FormulaInputManager` — `IFormulaInputManagerService` implementation
- [x] `FormulasModule` — `moduleName: 'Formula'`, `enterprise: true`, depends on `EnterpriseCoreModule`, beans, `userComponents: { agFormulaCellEditor }`, `apiFunctions: { refreshFormulas }`
- [x] `@libregrid/calculated-columns` refactor: dependency, shared-bean declaration, re-exports preserved, `CalculatedColumnFormulaService` retired
- [x] Unit specs — engine extensions, service, data service, input manager, module shape

### 20B — Editing, recompute, restrictions

- [x] jsdom integration: data-supplied + editor-entered formulas, recompute on referenced-cell edit, `refreshFormulas` (all/row/rowId incl. pinned chains), `formulaDataSource` round-trip incl. fieldless columns, fill-handle offsets, `formula-error` CSS + tooltip, CSV export evaluated values, both-modules coexistence (both orders), grouping-registered safety, row-data vs external-store paths

### 20C — Formula cell editor

- [x] `agFormulaCellEditor` — tokenised display, shorthand⇄long-hand conversion, function autocomplete, `validateFormulas` live validation, `formulaInputManager` registration, Escape/Enter/Tab behaviour
- [x] Optional cell-selection interplay: range highlights + range-handle while editing (runtime detection; silent degradation)
- [x] Row-number interplay (click adds a row range) if `@libregrid/row-numbers` exposes a hook; else 🟡 in parity
- [x] Unit + integration specs for the editor

### 20D — `SUMIF`/`COUNTIF` ranges + calculated-columns flip

- [x] Range-taking `SUMIF`/`COUNTIF` end-to-end (both per-cell and calculated-expression contexts)
- [x] `docs/parity/calculated-columns.md` row 🟡→✅ + shared-bean note; calculated-columns integration spec additions

### 20E — Demo, e2e, documentation, release

- [x] Docs route (`routes.ts`, `feature-catalog.ts`, `routes/formulas.ts`) + Playwright e2e (`formulas.spec.ts`), axe light + dark
- [x] `docs/parity/formulas.md`; `ENTERPRISE-GAP-PLAN.md` A1 → ✅ (§2 headline, §4a table, §9); `docs/parity/gap-list.md` rows
- [x] `@libregrid/all` re-exports; changeset (new package + lockstep patch — 1.3.1); bundle budget measured and recorded

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Engine: A1/`$`/range/long-hand tokenising+parsing, precedence regressions, offset shifting, error codes, custom-function params protocol, normalise conversions; FormulaService: cache/invalidation, cycle chains, eligibility guard, lookup order; FormulaDataService lifecycle; editor state machine |
| **Integration** (jsdom, real grid) | 20B list + editor flows (enter/commit/cancel/opt-out/validate) + calculated-columns regression suite |
| **E2E** (Playwright) | Type a formula → evaluation; edit a referenced cell → dependent updates; error display; fill drag; custom function; axe clean light + dark |

## Acceptance criteria

- [x] `=...` values in `allowFormula` cells evaluate and recompute when referenced data changes
- [x] `formulaDataSource` external storage works, including columns without field/valueSetter
- [x] `api.refreshFormulas()` / `(rowNode)` / `(rowId)` behave per the reserved API contract
- [x] Fill handle offsets relative refs, keeps absolute refs fixed
- [x] Formula cell editor with tokenised refs, autocomplete, optional range highlights, `validateFormulas`
- [x] Custom functions via `formulaFuncs` receive `ValueParam`/`RangeParam` args and can surface `#ERROR!`
- [x] Restrictions hold: no evaluation on group/tree/pivot/SSRM runtimes; both modules coexist in either registration order
- [x] `SUMIF`/`COUNTIF` accept cell ranges (calculated-columns 🟡 row flips)
- [x] Docs route + e2e + parity + gap-plan updated; `npm run verify` green; budgets met
