# Phase 21 — Code Review (gap-plan A8, Row Grouping Edit)

**Date:** 2026-09-10 (post-implementation review)
**Fixed point:** `HEAD` (`6a5af6e`, branch `docs/release-new-package-flow`) — the work is uncommitted in the working tree.
**Spec reviewed:** [`phase-21-row-grouping-edit.md`](./phase-21-row-grouping-edit.md)
**Axes:** Standards (repo standards + Fowler smell baseline) and Spec (fidelity to the phase spec), reviewed independently.

**Scope:** 16 modified files + 10 new files, centered on `@libregrid/row-grouping`
(`RowGroupingEditModule`, `RowGroupingEditService`, `AggregatedChildrenService`,
`distributeGroupValue`) plus docs/parity/wiring.

---

## Summary

- **Spec:** 1 real bug + 1 partial + 1 minor + 1 hygiene item. Worst: `distribution: { count: true }` silently fails to enable `count`/`min`/`max`/`first`/`last`.
- **Standards:** 5 documented-standard findings + 3 baseline smells. Worst: beans/helpers over-exported as public API (`standards.md` §6.6 / `package-architecture.md` §5.5), though it extends a pre-existing barrel pattern.

---

## Spec findings

### 1. Bug — per-aggFunc `true` entry suppresses `count`/`min`/`max`/`first`/`last`

- **Spec:** L177–179 — `count`/`min`/`max`/`first`/`last` are "disabled (editable only via an explicit per-aggFunc record entry of `true` or a strategy)".
- **Code:** `packages/row-grouping/src/distributeGroupValue.ts` — `interpretEntry` routes `entry === true` (L170–173) into `builtInOrCustomOverwrite`, whose first guard (L92–93) returns `SUPPRESSED` for any `DEFAULT_DISABLED` name.
- **Effect:** `groupRowValueSetter: { distribution: { count: true } }` resolves to not-editable and writes nothing.
- **Root cause:** the same helper is reused for top-level `distribution: true` (where suppressing `count` is correct — spec L180–182) and for a per-aggFunc record entry `true` (where it must enable).
- **Coverage gap:** only `count: 'overwrite'` is tested (`distributeGroupValue.spec.ts:181–186`); `count: true` has none. Affects `min`/`max`/`first`/`last` identically.

### 2. Partial — `refreshAfterGroupEdit` expansion preservation is asserted nowhere

- **Spec:** test plan L331 ("moves the row and preserves expansion"); D5 L250 ("verify empirically … expansion state survives").
- **Code:** `rowGroupingEditService.ts:132` delegates to `refreshModel({ step: 'group', rowDataUpdated: true })`.
- **Gap:** `rowGroupingEdit.integration.spec.ts:349–372` only asserts re-homing (US 2→1, UK 1→2) with default-collapsed groups. No test expands a group, edits, and checks expansion survives. Mechanism may be correct; the required verification is missing.

### 3. Minor — `increment` base falls back to `sum`

- **Spec:** L173–174 — delta = `newValue − oldValue`.
- **Code:** `distributeGroupValue.ts:311` uses `oldValue ?? sum`, so a null `oldValue` (direct `distributeGroupValue` callers) distributes `newValue − currentTotal`. Underspecified edge, silent semantic divergence.

### 4. Scope / hygiene — stray `rel-log.tmp`

- Untracked CI log (≈3,231 lines) at the repo root; not part of the feature. Should be deleted or gitignored. It also records a release run with `ALLOW_NEW_PACKAGES=true`, which `AGENTS.md` says never to suggest.
- No other scope creep: `resolveDistributionPlan`/`applyDistributionPlan`/`roundAndSpread`/`aggFuncInfoFor` exports are spec'd (L305/L371), D8 `reaggregate()` is spec'd, D9 (no `refreshProps` entry) held.

### Verified OK

Four strategies + sum/avg semantics (uniform divides-for-sum/assigns-for-avg, increment full-delta-for-avg), percentage zero-total → uniform fallback, precision auto-detect/remainder/bigint-int, the default-by-aggFunc table (disabled-by-default half), record→`default`→built-in resolution, `precision`/`getValue`/`setValue` deep-merge, the `groupRowValueSetter: false` non-editable override, the `undefined`/`true`/`false` return contract, and both module-name registrations (`RowGroupingEdit` + `refreshAfterGroupEdit` validation against `RowGrouping`/`TreeData`).

---

## Standards findings

### Guardrails — PASS

`moduleName: 'RowGroupingEdit'` is a real `EnterpriseModuleName` literal (no `as any`); bean slots `aggChildrenSvc`/`rowGroupingEditValueSvc` match `context.d.ts:264/275`; G2 held (reconstructed from public types, enterprise never read); G4.1a identifiers correct; `_IRowGroupingEditValueSvc`/`_IAggregatedChildrenSvc`/`_getClientSideRowModel` are acknowledged G5 internals. No `any` in source.

### Documented-standard findings

1. **Beans exported as public API** — `packages/row-grouping/src/index.ts` exports `AggregatedChildrenService` and `RowGroupingEditService`, repeated in `packages/all/src/index.ts`. Violates `standards.md` §6.6 + `package-architecture.md` §5.5 ("Beans are not public API"). *Judgement call* — mirrors a pre-existing barrel pattern (`GroupStage`, `AggFuncService` already exported).
2. **Over-exported helpers** — same barrel exports `resolveDistributionPlan`, `applyDistributionPlan`, `roundAndSpread`, `aggFuncInfoFor`, `type DistributionPlan`; only `distributeGroupValue` is the documented public entry. *Speculative Generality* + §5.5 ("every extra export is a tree-shaking liability"). *Judgement.*
3. **Missing per-symbol `@feature`** (`standards.md` §6.8): `distributeGroupValue` and the helpers carry TSDoc but no `@feature`/`@gridOption` tag (the `@feature` sits only at file top). *Minor.*
4. **Changeset marks `patch` for a new feature** — `.changeset/row-grouping-edit-phase-21.md`; `standards.md` §12 reserves `minor` for "new feature or package". *Judgement.*
5. **Typed `ColDef` discarded** — `resolveDistributionPlan(colDef?: Record<string, unknown>)` re-reads `groupRowEditable`/`groupRowValueSetter` via string keys already typed on `ColDef`, contradicting the phase doc's own "Import them — do not re-declare".

### Baseline smells (judgement calls)

- **Duplicated Code** — `pivotKey()` in `aggregatedChildrenService.ts` mirrors `AggregationStage` normalisation; the `childrenAfterAggFilter ?? … ?? childrenAfterGroup` chain repeats in `getAggregatedChildren` and `collectLeaves`.
- **`as never`** at `distributeGroupValue.spec.ts:294` bypasses type checking (test-only).
- **Mysterious Name / null double-duty** — `aggFuncInfoFor` returns `name: null` for both "no aggFunc" and "custom fn"; `resolveDistributionPlan` `null` conflates "suppressed" and "not configured".

---

## Recommended follow-ups

1. Fix `interpretEntry` so a per-aggFunc record entry of `true` enables `count`/`min`/`max`/`first`/`last` (likely `'overwrite'`), while top-level `distribution: true` keeps suppressing them. Add a `count: true` unit test.
2. Add an integration test asserting expansion survives `refreshAfterGroupEdit` re-homing.
3. Remove (or gitignore) `rel-log.tmp`.
4. Decide whether the barrel should stop exporting beans/internal helpers; if so, trim to the module objects + `distributeGroupValue` (+ `DistributionPlan` type).

---

## Follow-ups applied

All four recommended follow-ups are done, plus the four documented-standard findings and
the `as never` baseline smell.

| # | Fix | Where |
|---|---|---|
| 1 | **Record-entry enablement split from top-level `true`.** Resolution now carries an `explicit` flag alongside the picked entry: an entry named by aggFunc key enables the five default-disabled aggFuncs with `'overwrite'`; a top-level `distribution: true` still suppresses them. Nested entry objects (`{ distribution: true }`) follow the same rule. | `distributeGroupValue.ts` |
| 1 | **27 new unit specs** replacing the single `count: 'overwrite'` case: `true` for each of `count`/`min`/`max`/`first`/`last`, `{ distribution: true }`, `sum: true` still routing to `uniform`, `default` *not* enabling each of the five non-distributable aggFuncs, `default` applying to custom and no-aggFunc columns, and the `increment` delta contract both with and without `oldValue`. 38 → 55 specs. | `distributeGroupValue.spec.ts` |
| 2 | **Expansion preservation asserted both ways** against a real grid: with `groupDefaultExpanded: -1` the re-homed groups' leaves stay displayed after the refresh; with defaults, collapsed groups stay collapsed. 16 → 21 integration specs. | `rowGroupingEdit.integration.spec.ts` |
| 3 | `rel-log.tmp` deleted (it was untracked; `*.log` was already ignored, this was a stray `.tmp`). | repo root |
| 4 | **Barrel trimmed.** `@libregrid/row-grouping` now exports `RowGroupingEditModule` + `distributeGroupValue` for this phase — the two beans and the `distributeGroupValue.ts` internals are gone from the barrel, and `@libregrid/all`'s matching re-exports were dropped. The internals keep `@internal` TSDoc markers (`roundAndSpread`/`aggFuncInfoFor` stay exported for their direct-import unit tests, matching the repo's existing `showValuesAsService.ts` convention). | `index.ts` (row-grouping + all) |
| — | **Per-symbol `@feature`/`@gridOption`** added on `distributeGroupValue`. | `distributeGroupValue.ts` |
| — | **Changeset `patch` → `minor`** for both packages, per `standards.md` §12. | `.changeset/row-grouping-edit-phase-21.md` |
| — | **`ColDef` used instead of `Record<string, unknown>`** in `resolveDistributionPlan`; the setter/editable options are read through their real, already-typed property names. | `distributeGroupValue.ts` |
| — | **`as never` removed** from the `getValue`/`setValue` spec, which now builds a typed `GroupRowValueSetterOptions`. | `distributeGroupValue.spec.ts` |
| — | **Duplicated `pivotKey` extracted** to `pivotKeys.ts`, shared by `AggregationStage` and `aggChildrenSvc`; the repeated `childrenAfterAggFilter ?? …` chain collapsed into one helper. | `pivotKeys.ts`, `aggregatedChildrenService.ts`, `aggregationStage.ts` |
| — | **`AggFuncInfo` naming clarified** with a state table documenting why `name: null` is two different states and that `custom` disambiguates them. | `distributeGroupValue.ts` |

**Deliberately not changed:**

- The `resolveDistributionPlan` `null`-return conflation is left as-is and documented: it
  returns `null` for both "suppressed" and "not configured", which is precisely the
  contract `isGroupCellEditable`/`setGroupDataValue` want — the caller already knows which
  of the two options it looked for.
- The pre-existing broad barrel (`GroupStage`, `AggFuncService`, the stage/services
  exports) is untouched. Sweeping it is a package-wide API decision, not part of A8.

---

## Doc-parity round (post-review)

A follow-up comparison against
[ag-grid.com/javascript-data-grid/grouping-edit](https://www.ag-grid.com/javascript-data-grid/grouping-edit/)
found and fixed two more divergences:

| Fix | Detail | Where |
|---|---|---|
| `default` never enables the five non-distributable aggFuncs | The page states `count`/`min`/`max`/`first`/`last` "are NOT affected by `default` and must always be listed explicitly." The `default` fallback in `pickRecordEntry` was applying to them; a guard now skips `default` for those five while still applying it to unlisted custom aggFuncs and no-aggFunc columns. | `distributeGroupValue.ts`, `distributeGroupValue.spec.ts` |
| `aggregatedChildren` matches the aggregation scope under `suppressAggFilteredOnly` | The page says `aggregatedChildren` "respects `suppressAggFilteredOnly`". With the option on, the group total spans all children while the filter hides some; `AggregatedChildrenService` now returns the full post-group set instead of the filtered array, so an edit distributes to exactly the rows behind the displayed total. | `aggregatedChildrenService.ts`, `rowGroupingEdit.integration.spec.ts` |

Both were verified by integration/unit tests (411 green across 26 files at the time of
writing). The remaining known, documented limitation is `increment` without `oldValue`,
whose delta falls back to the children's total — the documented `newValue − oldValue` is
unrecoverable when a direct `distributeGroupValue` caller omits it.
