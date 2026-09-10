# Phase 21 — Row Grouping Edit (gap-plan A8)

## Correctness follow-up (2026-09-10)

The initial implementation notes below are historical where they describe the
missing changed-path factory or the manual aggregation workaround. The follow-up
fills `changedPathFactory` with row/ancestor tracking and removes that workaround:
Community now batches nested edits into one aggregate pass and refreshes visible
group cells after leaf edits too. Column-level incremental aggregation remains
unimplemented.

Additional corrections cover percentage distribution for weighted averages,
exact bigint arithmetic, the active aggregation function after column-state
changes, filtered aggregation inputs, and nested pivot edits. Generated pivot
columns now inherit group-editing configuration. Regression tests exercise the
real grid, rendered group cells, pivot isolation, and ordinary leaf edits.

The diagnosing-bugs regression loop exposed failures that the original 76 tests
missed: stale leaf-edit totals, incorrect averages, and precision loss above 2^53.

## Original implementation record

**Status:** ✅ Complete (2026-09-10) — `@libregrid/row-grouping` extended with
`RowGroupingEditModule`, `RowGroupingEditService`, `AggregatedChildrenService` and
`distributeGroupValue`. 76 new specs green (55 unit + 21 jsdom integration); the full
`row-grouping` suite is 411 green across 26 files; `@libregrid/all` + docs route built;
parity/gap-plan/gap-list updated. Two Community bean-slot findings recorded (see
"What actually shipped" below).
**Depends on:** Phase 2 (`@libregrid/row-grouping` — `GroupStage`, `AggregationStage`,
`ValueColsService`, `RowGroupColsService`, `AggFuncService`); `@libregrid/core`
(`EnterpriseCoreModule` seam-record pattern)
**Blocks:** gap-plan A11 (group-row dragging) — `refreshAfterGroupEdit` is the flag
Community's `RowDragService` reads to allow managed drag-between-groups, so A11 inherits
this phase's seam rather than inventing one.

**Packages:** modified `@libregrid/row-grouping` (**no new package** — per
`ENTERPRISE-GAP-PLAN.md` §3 A8); modified `@libregrid/all`
**Parity:** [`../parity/row-grouping.md`](../parity/row-grouping.md) (update
`refreshAfterGroupEdit`; add rows for `groupRowEditable`, `groupRowValueSetter`,
`getAggregatedChildren`)

---

## Context

Gap-plan **A8** — the second-to-last Class A item (only A11 remains after it).
`RowGroupingEditModule` is Enterprise v36.1.0: it makes group-row cells editable and
**distributes** a group-level edit down to the descendant rows that feed the group's
aggregation.

The plan's one-line description ("option + re-aggregation timing") understates the
surface. The v36.1.0 baseline defines a complete integration contract in
`ag-grid-community` — the bean slots, the module-name validation, and the entire public
type surface already exist. What is missing is the runtime engine, which upstream ships
in `ag-grid-enterprise`.

**This is a seam-filling phase, not a new subsystem.** It is the same shape as Phase 17
(`@libregrid/batch-edit`), except the seams live in `@libregrid/row-grouping` rather
than in a new package.

**The stale blocker is confirmed stale.** `docs/parity/row-grouping.md:35` and
`docs/phases/phase-02-row-grouping.md:97` both defer this because "LibreGrid has no
cell-editing feature yet". Cell editing is **Community stock** (this repo's own Class D
list, §5), and Community's `RowDragService.computeVisibility` already reads
`refreshAfterGroupEdit` today. The option simply was never implemented.

## Contracts (verified against the `ag-grid-community@36.1.0` dist)

### Module names and validation

- `EnterpriseModuleName` includes `'RowGroupingEdit'`; `AgModuleName` includes
  `'RowGroupingEditModule'` (`interfaces/iModule.d.ts`).
- The colDef validation map maps exactly two options to that module:
  - `groupRowEditable` → `'RowGroupingEdit'` (plus `'TextEditor'` when no explicit
    `cellEditor`)
  - `groupRowValueSetter` → `'RowGroupingEdit'`
- `refreshAfterGroupEdit` is validated against `["RowGrouping", "TreeData"]` — **not**
  `RowGroupingEdit`. Both names must therefore be registered for a clean grid.
- The module-name registry (`EnterpriseModuleName: 1` map) already contains
  `RowGroupingEdit`, so registering the name is all that is required.

### Bean slots the baseline expects us to fill

| Bean | Interface | Status in LibreGrid |
| --- | --- | --- |
| `rowGroupingEditValueSvc` | `IRowGroupingEditValueSvc` (`context.d.ts:275`) | **absent** |
| `aggChildrenSvc` | `IAggregatedChildrenSvc` (`context.d.ts:264`) | **absent** |

`IRowGroupingEditValueSvc` is exactly two methods:

```ts
isGroupCellEditable(rowNode, column): boolean;
setGroupDataValue(rowNode, column, newValue, oldValue, eventSource, valueChanged): boolean | undefined;
```

`IAggregatedChildrenSvc` is one:

```ts
getAggregatedChildren(rowNode, col, recursive?): RowNode[];
```

### Call site 1 — editability (`main.cjs.js` ≈43134, `isCellEditable`)

```js
if (rowNode.group && colDef.groupRowEditable != null) {
  if (beans.rowGroupingEditValueSvc?.isGroupCellEditable(rowNode, column)) return true;
  return existingEditing(beans, editPosition);
}
```

**Consequence of the missing bean:** for a group row with `groupRowEditable` set, the
optional-call returns `undefined` → falsy → **a group cell can never start an edit**.
The normal `colDef.editable` path is not reached in this branch.

### Call site 2 — distribution (`main.cjs.js` ≈36623, `ValueService.setDataValue`)

The ordinary value-set path runs first (external formula → `computeValueChange` with
`valueSetter`/`field`), producing `valueSetterChanged`. Then, only for group rows:

```js
changeDetectionSvc?.beginDeferred();
try {
  if (rowNode.group) {
    const groupResult = this.rowGroupingEditValueSvc?.setGroupDataValue(
      rowNode, column, newValue, oldValue, eventSource,
      valueSetterChanged || newValue !== oldValue
    );
    if (groupResult !== undefined) {
      if (!valueSetterChanged && !groupResult) return false;
      return this.finishValueChange(rowNode, column, params, eventSource, newValue);
    }
  }
  ...
} finally { changeDetectionSvc?.endDeferred(); }
```

Return contract: `undefined` → no `groupRowValueSetter` configured, caller uses the
normal path; `true` → children changed; `false` → no child changed (a no-op when the
value setter also changed nothing).

### What already works — do NOT rebuild

- **Row refresh and the deferred batching.** `ChangeDetectionService`
  (`changeDetectionSvc`, Community stock) listens to `cellValueChanged`, accumulates a
  `ChangedPath`, and on the outermost `endDeferred()` refreshes the affected rows
  (leaf-node changes are attributed to `node.parent`). Its own doc comment names
  `groupRowValueSetter` as a nested caller, i.e. it was written for this feature. Call
  site 2 wraps `setGroupDataValue` in `beginDeferred()/endDeferred()`, so the batching
  and the row refresh are free.
  **Correction (found during implementation):** the aggregation half of that flush is
  *not* free. `endDeferred()` only runs `csrm.doAggregate(path)` when
  `beans.changedPathFactory` produced a batched path, and **that bean slot is also
  declared and unfilled** — so `path` is always `null`, the aggregation pass is skipped,
  and `aggData` goes stale. Verified directly: in a grouped grid a plain leaf edit
  (100 → 900) left the group's `aggData` at `300` until a manual aggregate. Phase 21
  therefore calls `csrm.doAggregate()` itself after a distribution (D8). See the
  follow-up at the end of this file.
- **`ColDef` types.** `groupRowEditable` and `groupRowValueSetter` are already declared on
  `ColDef` (`entities/colDef.d.ts:417,436`), and every contract type is **publicly
  exported** from `ag-grid-community`'s `main.d.ts`: `GroupRowEditableCallback(+Params)`,
  `GroupRowValueSetterParams`, `GroupRowValueSetterFunc`, `GroupRowValueSetterOptions`,
  `GroupRowValueSetterDistribution(+Entry/Record/Options)`,
  `DistributionGetValueParams`, `DistributionSetValueParams`. **Import them — do not
  re-declare or augment.**
- **Generic row dragging.** Community's `RowDragModule` is stock (Class D). No drag code
  is in scope for this phase.

### Public contract details (from `colDef-groupRowValueSetter.d.ts`, 394 lines)

- **`groupRowEditable`** — `boolean | GroupRowEditableCallback`. `GroupRowEditableCallbackParams`
  extends `ColumnFunctionCallbackParams`. **Only this option opens the edit entry point**
  (call site 1 gates on `groupRowEditable != null`).
- **`groupRowValueSetter`** — `boolean | GroupRowValueSetterFunc | GroupRowValueSetterOptions`.
  Governs *distribution*, and "fires for every `setDataValue` call when active, regardless
  of `groupRowEditable`" — i.e. it also applies to API/undo/paste writes. Columns with
  either option do **not** require `field` or `valueSetter`.
- **Non-editable resolution:** if `groupRowValueSetter` resolves to `false`/`null` (via
  `distribution: false`, a per-aggFunc record entry, or `groupRowValueSetter: false`), the
  cell is **not editable even when `groupRowEditable` is `true`**.
- **`GroupRowValueSetterParams`:** `api`, `context`, `column`, `colDef`, `oldValue`,
  `newValue`, `node`, `data`, `eventSource`, `valueChanged`, `aggregatedChildren`.
- **`aggregatedChildren` semantics:** leaf groups → the data rows; non-leaf groups → the
  child group rows, and calling `setDataValue()` on a child group cascades recursively
  (the built-in does this automatically); **pivot mode** → only rows matching the edited
  pivot column's keys. CSRM only.
- **`GroupRowValueSetterFunc`** returns `true` if at least one child changed; `void`/
  `undefined` is treated as `true`.
- **Distribution strategies:**
  - `'uniform'` — divides equally: for `sum` each child gets `newValue / childCount`; for
    `avg` each child is set to `newValue` directly.
  - `'percentage'` — scales each child proportionally, preserving relative weights;
    **falls back to `'uniform'` when the current total is zero**.
  - `'increment'` — distributes only the delta: for `sum` each child gets
    `delta / childCount` added; for `avg` the full delta is added to every child.
    `delta = newValue − oldValue`, taken from `params.oldValue` whenever it is present.
    A direct `distributeGroupValue(params, options?)` caller may pass a null `oldValue`;
    the delta is then derived from the children's current total, which for `sum` — the
    strategy's intended aggFunc — is the same number as the group's previous value. For
    any other aggFunc, supply `oldValue` to get the documented delta.
  - `'overwrite'` — writes `newValue` to every child.
- **Defaults by aggFunc:** no aggFunc → `'overwrite'`; `sum` → `'uniform'`; `avg` →
  `'overwrite'`; `count`/`min`/`max`/`first`/`last` → **disabled** (editable only via an
  explicit per-aggFunc record entry of `true` or a strategy); custom aggFuncs → disabled
  unless `distribution` is set or `default` enables them.
- **`distribution: true`** enables built-in defaults for distributable aggFuncs *and*
  custom aggFuncs (which get `'overwrite'`), but still not the
  `count`/`min`/`max`/`first`/`last` set.
- **Record entries** may be a strategy string, `true`, `false`/`null`, an options object,
  or a callback; `undefined` inherits from the parent (deep-merge); unmatched aggFuncs fall
  through to `default`, then to the built-in defaults. An entry of `true` is the documented
  way to *enable* `count`/`min`/`max`/`first`/`last` (which resolve to `'overwrite'`), and it
  does so when named by aggFunc key (`distribution: { count: true }`). A nested entry object
  behaves the same way (`distribution: { min: { distribution: true } }`). `default` applies
  to unlisted custom aggFuncs and no-aggFunc columns, but **never** to the five
  non-distributable built-ins — they must be listed explicitly (matches ag-grid.com).
- **`precision`:** `number | false`. Auto-detect (when `undefined`) from
  `cellEditorParams.precision`, else `0` if `cellEditorParams.step` is a whole number, else
  no rounding. Rounding **remainder is spread across children so their total matches
  exactly** (`10 / 3` at `precision: 0` → `[4, 3, 3]`). `bigint` columns always distribute as
  integers. The group row's displayed value is re-computed by the aggFunc afterwards, so
  only `sum` guarantees the honoured precision.
- **`getValue` / `setValue` overrides**, defaulting to
  `node.getDataValue(column, 'value')` and `node.setDataValue(column, value, 'data')`.
- **`distributeGroupValue(params, options?)`** is the built-in, publicly documented as
  imported from `ag-grid-enterprise`. **It does not exist in the community dist** (verified
  — zero references), so under guardrail **G2** it must be implemented from these public
  types and docs, never read out of the enterprise package.

### `refreshAfterGroupEdit`

- Declared at `gridOptions.d.ts:1144`, default `false` (`gridOptionsDefault.d.ts:102`).
- Documented behaviour: "When `true`, the grid re-evaluates the grouping hierarchy after
  editing a grouped column value, moving the row to the correct group instantly. **Also
  enables managed row dragging to update grouped column values so rows can move between
  groups.**"
- `RowDragService.computeVisibility` already reads it (Community stock): with
  `rowDragManaged` on and grouping or pivot active and the option false → the drag handle is
  `'hidden'`; pivoting → `'disabled'`; active filter or sort → `'disabled'`. The service
  already listens for changes to `["rowDragManaged", "suppressRowDrag", "refreshAfterGroupEdit"]`,
  so a runtime toggle re-evaluates visibility for free.

## Design decisions

- **D1 — Beans live in `@libregrid/row-grouping`; `RowGroupingEditModule` is a name-only
  record.** The distribution engine needs `ValueColsService`, `RowGroupColsService` and
  `AggFuncService`, so the services belong with the grouping module. Separate
  `moduleName: 'RowGroupingEdit'` record (no beans) exposes the name the two colDef
  validations demand. This mirrors the existing `SharedRowGrouping`/`SharedAggregation`
  name-record pattern in `packages/row-grouping/src/rowGroupingModule.ts:54-73`.
  - **Consequence to accept:** holding the seam means `ag-grid-community`'s own
    `RowGroupingEdit` name is claimed, so this package must be registered for
    `groupRowEditable` to validate — the same trade-off already accepted for the existing
    seam records.
- **D2 — `AggregatedChildrenService` as `aggChildrenSvc`.** CSRM-only; immediate children
  for `recursive` falsy, all descendant leaves otherwise; leaf (non-group) nodes → `[]`;
  pivot-mode leaf groups filtered by the pivot column's keys. This is **also a
  currently-invisible gap**: `RowNode.getAggregatedChildren()` delegates to this bean and
  returns `[]` today, so the public API method is silently broken in LibreGrid regardless
  of A8. Fixing it is in scope here because `GroupRowValueSetterParams.aggregatedChildren`
  depends on it.
- **D3 — `RowGroupingEditService` as `rowGroupingEditValueSvc`,** implementing the two
  interface methods. `isGroupCellEditable` evaluates the `groupRowEditable`
  boolean/callback **and** resolves the effective distribution for the column's aggFunc,
  returning `false` when that resolution is `false`/`null` (the documented
  non-editable override). `setGroupDataValue` returns `undefined` when no
  `groupRowValueSetter` is configured (so the caller keeps the normal path), otherwise
  resolves the setter — custom callback, `true`, options object, or a record entry — and
  returns a strict boolean.
- **D4 — `distributeGroupValue(params, options?)` exported from `@libregrid/row-grouping`,**
  implementing the four strategies, the per-aggFunc defaults, `default` fallback,
  `precision` auto-detect plus remainder spreading, the `getValue`/`setValue` overrides,
  and recursion through non-leaf child groups. **G2:** built from the public types above;
  no enterprise source is consulted.
- **D5 — `refreshAfterGroupEdit` is implemented as a hierarchy re-run, not new plumbing.**
  When true, a grouped-column value edit must re-evaluate the group hierarchy so the row
  moves. `GroupStage`/`AggregationStage` already run as CSRM steps and
  `changeDetectionSvc.endDeferred()` already drives `doAggregate`; the phase wires the
  re-group trigger and adds the option to the relevant `refreshProps` so a runtime toggle
  refreshes. The exact upstream step set is not observable from the community dist — verify
  empirically that a moved row lands in the right group and that expansion state survives
  (Phase 2's `GroupStage` already preserves expansion by deterministic ID).
- **D6 — No new events, no Grid State section.** The docs define none for this feature;
  edits surface through the ordinary `cellValueChanged`/`rowDataUpdated` path. Confirm
  during 21E rather than assuming.
- **D7 — Registration surface.** `RowGroupingEditModule` joins `@libregrid/all` and the
  docs app feature catalog; `refreshAfterGroupEdit` needs no new module name beyond the
  existing `RowGrouping` record. **As built:** `AggregatedChildrenService` lives in
  `RowGroupingModule` (it is a general grouping capability that also repairs the public
  `rowNode.getAggregatedChildren()` for non-editing users), while
  `RowGroupingEditService` lives in `RowGroupingEditModule`, which `dependsOn`
  `EnterpriseCoreModule` + `RowGroupingModule`. This is the open question 3 answer.
- **D8 — The edit service re-runs the aggregate step itself.** `setGroupDataValue`
  calls `csrm.doAggregate()` after a distribution that changed at least one child. This
  mirrors what `ChangeDetectionService.endDeferred()` *would* do, and is the same cost
  (LibreGrid's `AggregationStage` ignores the changed path and re-traverses the tree
  either way). It exists only because `changedPathFactory` is unimplemented; once that
  slot is filled the explicit call becomes redundant and should be removed.
- **D9 — No `refreshAfterGroupEdit` entry in any stage's `refreshProps`.** The option is
  read live at edit time (and by Community's `RowDragService`, which already listens for
  changes itself), so toggling it changes no structure and must not trigger a refresh.
  This supersedes the "option in the relevant stage refreshProps" todo line.

## Todo

### 21A — `aggChildrenSvc` (`AggregatedChildrenService`)

- [x] `AggregatedChildrenService` implementing `_IAggregatedChildrenSvc`; `beanName: 'aggChildrenSvc'`
- [x] Immediate children for leaf groups; child group rows for non-leaf groups; `[]` for leaf nodes
- [x] `recursive: true` → all descendant leaf rows (fresh array per call, per the doc)
- [x] Pivot-mode key filtering for pivot columns on leaf groups (mirrors `AggregationStage`)
- [x] CSRM-only: every other row model returns `[]`
- [x] jsdom integration: `rowNode.getAggregatedChildren()` returns real children; leaf node → `[]`

### 21B — `RowGroupingEditModule` + `RowGroupingEditService`

- [x] `RowGroupingEditService` as `rowGroupingEditValueSvc` (D3): `isGroupCellEditable`, `setGroupDataValue`
- [x] `groupRowEditable` boolean + callback forms; `GroupRowEditableCallbackParams` assembled via `gos.addCommon`
- [x] Distribution resolution shared by both methods (aggFunc → record entry → `default` → built-in default); `false`/`null` → not editable
- [x] `setGroupDataValue` return contract: `undefined` (neither option configured) / `true` / `false`
- [x] `RowGroupingEditModule` record — `moduleName: 'RowGroupingEdit'`, `enterprise: true`, depends on `EnterpriseCoreModule` + `RowGroupingModule`
- [x] Both validations confirmed by integration test: `groupRowEditable`/`groupRowValueSetter` → `RowGroupingEdit`, `refreshAfterGroupEdit` → `RowGrouping`. The assertion waits out Community's 50 ms missing-module debounce and was verified to fail when `RowGroupingEditModule` is not registered
- [x] Integration: a group cell enters edit mode via `api.startEditingCell`; the callback form runs; `groupRowValueSetter: false` blocks the edit

### 21C — `distributeGroupValue` engine

- [x] Four strategies: `uniform`, `percentage` (zero-total → `uniform` fallback), `increment`, `overwrite`
- [x] `sum`-vs-`avg` semantics per strategy (uniform divides for `sum`, assigns for `avg`; increment divides the delta for `sum`, adds the full delta for `avg`)
- [x] Per-aggFunc `distribution` records: string / `true` / `false` / `null` / options object / callback; `undefined` inherits; unmatched → `default` → built-in defaults
- [x] Defaults by aggFunc (no aggFunc `overwrite`, `sum` `uniform`, `avg` `overwrite`; `count`/`min`/`max`/`first`/`last` and custom aggFuncs disabled unless explicitly enabled)
- [x] `precision`: auto-detect (`cellEditorParams.precision`, then whole-number `step`), `false` disables, remainder spread so the child total matches exactly, `bigint` always integers
- [x] `getValue`/`setValue` overrides with the documented defaults; destroyed children skipped; non-numeric edits written through
- [x] Recursion is delegated to the child nodes' own `setDataValue` (a non-leaf child group re-enters the seam), per the documented cascade
- [x] 55 unit specs: strategy matrix × aggFunc, precision/remainder, override hooks, record/`default`/`true`/`false` resolution (including `default` never enabling `count`/`min`/`max`/`first`/`last`)
- [x] jsdom integration: a group edit distributes to children, the group re-aggregates in the same pass, and a custom callback setter is supported
- [x] Exported `distributeGroupValue(params, options?)` from the package barrel; `resolveDistributionPlan`/`applyDistributionPlan`/`roundAndSpread` are package-private (post-review)

### 21D — `refreshAfterGroupEdit`

- [x] Re-evaluates the group hierarchy when an active row-group column is edited and the option is true; the row moves to the correct group (`refreshModel({ step: 'group', rowDataUpdated: true })`)
- [x] Read live rather than added to `refreshProps` (D9)
- [x] Tree data treated as "any edit may re-path" (the hierarchy comes from the row data)
- [x] jsdom integration: editing the grouped column relocates the row (US 2 children → 1, UK 1 → 2); with the flag off the row stays put
- [x] Interaction covered: distributing an edit **to the grouped column itself** (`groupRowEditable` on a row-group column) while `refreshAfterGroupEdit` is on writes every child and re-homes the whole group without losing a write

### 21E — Wiring, parity, docs

- [x] `RowGroupingEditModule` registered in `@libregrid/all` (+ `allModule.spec.ts`)
- [x] `docs/parity/row-grouping.md`: `refreshAfterGroupEdit` ❌ → ✅ with real rationale; added `groupRowEditable`, `groupRowValueSetter` and an "Editing Groups" section covering both beans, `distributeGroupValue`, defaults, precision, editability and the two 🟡 findings
- [x] `docs/parity/gap-list.md` counts (Row grouping 54/4/20 → 63/6/19), headline 6 rewritten, headline 7 added for the stale-aggregate finding
- [x] `ENTERPRISE-GAP-PLAN.md`: A8 moved to §4a, §2 headline corrected, **1.2.3 → 1.3.1** drift fixed, §9 priorities updated
- [x] Stale "no cell-editing feature yet" rationales fixed: `docs/parity/row-grouping.md` and `docs/phases/phase-02-row-grouping.md`
- [x] Docs app route `/group-editing` (NAV, route, feature catalog, route guide, `main.ts` registration) — `ng build docs` exits 0
- [x] Playwright e2e `apps/docs-e2e/src/e2e/group-editing.spec.ts` (distribution, other groups untouched, axe light + dark)
- [x] `npm run verify` green

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Distribution matrix (4 strategies × `sum`/`avg`/no-aggFunc/`count`/custom); `precision` auto-detect and remainder spreading; `getValue`/`setValue` overrides; record/`default`/`true`/`false`/`null`/`undefined` resolution — including an explicit per-aggFunc entry of `true` enabling each of `count`/`min`/`max`/`first`/`last`, a top-level `distribution: true` still suppressing them, and `default` never enabling those five; `increment` delta from `oldValue` (and its null fallback); `isGroupCellEditable` including the `groupRowValueSetter: false` override; `setGroupDataValue` `undefined`/`true`/`false` returns; `aggChildrenSvc` immediate vs recursive vs pivot vs leaf-node |
| **Integration** (jsdom, real grid) | Group cell enters edit mode and commits; edit distributes to descendants and the group re-aggregates; one aggregation pass per distribution (deferred change detection); non-leaf cascade; `bigint`; leaf-group vs non-leaf-group; `refreshAfterGroupEdit` moves the row and preserves expansion (asserted both ways: expanded groups stay expanded, collapsed groups stay collapsed); flag false leaves behaviour unchanged; `getAggregatedChildren` returns real children and matches the aggregation scope under `suppressAggFilteredOnly` |
| **E2E** (Playwright) | Edit a group row value in the docs route → children and group total update; drag handle appears with `rowDragManaged` + flag; axe clean light + dark |

## Acceptance criteria

- [x] A group row with `groupRowEditable` can be edited; without it, nothing changes
- [x] Distribution honours every documented strategy, default, record form, and precision rule
- [x] `groupRowValueSetter: false` makes the cell non-editable even with `groupRowEditable: true`
- [x] A distribution writes once and re-aggregates in a single pass (D8)
- [x] `refreshAfterGroupEdit: true` re-homes an edited row into the correct group
- [x] `rowNode.getAggregatedChildren()` no longer returns `[]`
- [x] Both module-name validations pass with no missing-module report
- [x] `npm run verify` green

## Open questions — resolved

1. **Which node `cellValueChanged` fires on.** Measured: the distribution produces one
   event per written child plus one for the group node itself (`N + 1`). Undo/redo of a
   distributed edit is **still unverified** — a distributed group edit writes `N` child
   values, so Phase 17's note that single-undo grouping is partial in Community needs a
   follow-up before the feature is advertised as undo-safe.
2. **The CSRM step set for the re-group.** `refreshModel({ step: 'group', rowDataUpdated:
   true })`; the `step` switch falls through group → filter → pivot → aggregate →
   filter_aggregates → sort → map, and `rowDataUpdated` makes `GroupStage` preserve
   expansion by deterministic ID.
3. **Which module owns `aggChildrenSvc`.** Not observable from the community dist.
   Decided (D7): it belongs to `RowGroupingModule`, because it also repairs the public
   `rowNode.getAggregatedChildren()` for users who never touch group editing.
4. **Auto-group column rename.** Out of scope: only `aggFunc` value columns are covered.
   A group-column rename (`colDef.groupRowEditable` on the auto-group column) would need
   key rewriting, which nothing in the docs describes.

## What actually shipped (and what it uncovered)

**Shipped** in `@libregrid/row-grouping` (no new package):

| File | Contents |
| --- | --- |
| `aggregatedChildrenService.ts` | `aggChildrenSvc` — fills the second unfilled slot |
| `rowGroupingEditService.ts` | `rowGroupingEditValueSvc` — both seam methods + `refreshAfterGroupEdit` |
| `distributeGroupValue.ts` | `distributeGroupValue` (public) plus the package-private `resolveDistributionPlan`, `applyDistributionPlan`, `roundAndSpread`, `aggFuncInfoFor` |
| `pivotKeys.ts` | `pivotKey` — shared pivot-bucket normalisation for `AggregationStage` and `aggChildrenSvc` |
| `rowGroupingEditModule.ts` | The `RowGroupingEdit` module record |
| `distributeGroupValue.spec.ts` | 55 unit specs |
| `rowGroupingEdit.integration.spec.ts` | 21 jsdom specs against a real grid |

**Public API surface (post-review).** Only `RowGroupingEditModule` and
`distributeGroupValue` are exported from the package barrel for this phase — the two
beans are registered through their modules and are not values consumers import
(`standards.md` §6.6, "beans are not public API"), and the `distributeGroupValue.ts`
internals stay package-private. The package as a whole still carries an older,
broader barrel (the pre-existing `GroupStage`/`AggFuncService`/stage exports); whether
to sweep those is a separate decision, not part of A8.

**Two unfilled Community bean slots were found.** `aggChildrenSvc` is now filled.
**`changedPathFactory` is not** — and that has a user-visible consequence beyond this
phase:

- `ChangeDetectionService.endDeferred()` only calls `csrm.doAggregate(path)` when the
  factory produced a batch path, so with no factory **group aggregates never refresh from
  change detection**. An ordinary leaf edit leaves `aggData` stale (verified: 100 → 900 on
  a leaf left the group total at 300 until a manual `refreshClientSideRowModel('aggregate')`).
- Phase 21 works around it for group edits (D8) but deliberately does **not** implement
  `IChangedPathFactory` here. That is a core-infrastructure change: `ensureRowsPath` feeds
  `refreshModel`'s `changedPath`, which Community stages read, so it deserves its own phase
  with its own regression pass rather than riding along inside a feature phase.
- Recommended as the next item — it is a correctness fix for every grouping user, and it
  retires the `doAggregate()` workaround.

**Guardrail G2 held:** `distributeGroupValue` was reconstructed from the public
`GroupRowValueSetter*` types in `ag-grid-community@36.1.0`. Nothing was installed from or
read out of `ag-grid-enterprise`.

## Guardrails

- **G2:** nothing is installed from or read out of `ag-grid-enterprise`. `distributeGroupValue`
  is reconstructed from the public types in `ag-grid-community@36.1.0` and the site docs.
- **Baseline:** all classifications are docs/API v36.1.0. Re-run the inventory fetch if the
  peer baseline (`ag-grid-community >=36.1.0 <37`) moves.
