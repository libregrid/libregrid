# Phase 8 — Pivot

**Status:** ⬜ Not started
**Depends on:** Phase 2 (grouping + aggregation), Phase 3 (drop zones to activate)
**Blocks:** Phase 9 (SSRM pivoting), Phase 12 (pivot charts)

**Package:** `@libregrid/pivot` (`moduleName: 'Pivot'`, `'PivotModule'`)
**Parity:** [`../parity/pivoting.md`](../parity/pivoting.md)

---

## Context

Pivot mode transposes grouped data: row groups stay as rows, pivot columns become dynamically generated **pivot result columns**, and aggregations fill the intersections.

The mechanism is `pivotStage` (`_IRowNodePivotStage`), which runs **after** `groupStage` and `filterStage` but **before** `aggStage` — so aggregation operates on the pivoted column set. Its `execute()` returns a `boolean` indicating whether the `changedPath` should be deactivated, which happens when pivot columns change and cached paths are no longer valid. Getting that return value wrong causes stale aggregates that are very hard to diagnose.

The genuinely novel work is **pivot result columns**: they don't exist in `columnDefs`, they're generated from data values. That means column identity, ordering, state persistence and the secondary-column lifecycle all need care. `getPivotResultColumn(pivotKeys, valueColId)` is the lookup contract.

This phase also activates the pivot and values drop zones built inert in Phase 3.

---

## Todo

- [ ] `PivotStage` implementing `_IRowNodePivotStage`, bean `pivotStage`, `step = 'pivot'`
- [ ] Correct `execute()` return semantics (deactivate `changedPath` when pivot columns change)
- [ ] Bean `pivotColDefSvc` (`iPivotColDefService`) — generates pivot result column defs
- [ ] Bean `pivotResultColsSvc` (`iPivotResultColsService`) — owns the result column set
- [ ] Pivot column groups (nested headers for multi-level pivot keys)
- [ ] Pivot totals: per-group and grand totals across pivot columns
- [ ] `iCalculatedColumns` integration
- [ ] Options: `pivotMode`, `pivotPanelShow`, `pivotPanelSuppressSort`
- [ ] ColDef: `pivot`, `enablePivot`
- [ ] API: `isPivotMode`, `getPivotColumns`, `setPivotColumns`, `addPivotColumns`, `removePivotColumns`, `getPivotResultColumn`, `setPivotResultColumns`, `getPivotResultColumns`
- [ ] Activate Phase 3's pivot + values drop zones and the pivot-mode toggle
- [ ] Column state persistence across pivot-mode toggling
- [ ] Contribute `pivotChart` menu-item stub for Phase 12

---

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Pivot result column ID generation and uniqueness for multi-key pivots. Column ordering determinism. `getPivotResultColumn` lookup by `pivotKeys` + `valueColId`. Header name derivation with and without `suppressAggFuncInHeader` |
| **Integration** | Fixture dataset produces the expected result-column set and correct intersection aggregates. Toggling `pivotMode` on→off→on preserves original column state. Adding/removing a pivot column regenerates result columns. Pivot totals and grand totals correct. Pivot combined with multiple row-group levels |
| **E2E** | Drag a column into the pivot drop zone → result columns appear. Toggle pivot mode from the tool panel. Expand/collapse pivot column groups |
| **Performance** | 100k rows, 2 row-group levels × 2 pivot keys × 3 value columns: initial pivot within baseline; re-pivot after changing a pivot column |
| **a11y** | Nested pivot headers expose correct grouping semantics; axe 0 violations light + dark |

**Specific edge cases to cover:**
- Pivot key with high cardinality (guard against generating thousands of columns — document the practical limit)
- `null` / `undefined` pivot key values
- Pivot with no value columns configured
- Pivot with no row groups configured
- `setPivotResultColumns` with explicit defs overriding generation
- Sorting on a pivot result column

---

## Acceptance criteria

- [ ] Pivot mode produces correct result columns and totals against a fixture dataset
- [ ] Toggling pivot mode preserves column state in both directions
- [ ] Multi-level pivot keys render nested column groups correctly
- [ ] Pivot totals and grand totals correct
- [ ] Phase 3's pivot and values drop zones now functional; pivot-mode toggle works
- [ ] `getPivotResultColumn(pivotKeys, valueColId)` resolves reliably
- [ ] High-cardinality behavior documented (practical column limit stated)
- [ ] No bench regression vs. Phase-0 baseline
- [ ] Parity checklist fully marked ✅/🟡/❌ with rationale
- [ ] Full Definition of Done (`standards.md` §9) satisfied
