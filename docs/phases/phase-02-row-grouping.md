# Phase 2 — Row Grouping & Aggregation

**Status:** ⬜ Not started
**Depends on:** Phase 1
**Blocks:** Phases 3 (drop zones), 8 (pivot), 9 (SSRM grouping), 10 (tree data)

**Package:** `@libregrid/row-grouping` (`moduleName: 'RowGrouping'`)
**Parity:** [`../parity/row-grouping.md`](../parity/row-grouping.md), [`../parity/aggregation.md`](../parity/aggregation.md)

---

## Context

**The largest and most important phase.** Row grouping is the single most-demanded Enterprise feature, and pivot, tree data, SSRM grouping and the tool-panel drop zones all build directly on what is written here.

The integration mechanism is the Client-Side Row Model pipeline (`api-seams.md` §6). Community's CSRM already calls stage beans defensively:

```ts
this.beans.aggStage?.execute(changedPath);
```

So the entire integration is **registering beans under the correct names**. There is no other wiring. Community fills `filterStage` and `sortStage`; we supply `groupStage`, `aggStage`, `filterAggStage`, `groupFilterStage`, `groupSortStage` and `flattenStage`.

Execution order — memorise this, it explains most ordering bugs:

```
groupStage → filterStage → groupFilterStage → pivotStage → aggStage
          → sortStage → groupSortStage → filterAggStage → flattenStage
```

Two design notes that will save rework:

- **`groupStage` is shared with tree data (Phase 10).** Its interface carries `treeData`, `grouping`, `hasTreeData` and `hasRowGrouping` flags precisely because one bean serves both. Structure it so Phase 10 adds a mode rather than a parallel implementation.
- **`pivotStage` runs *before* `aggStage`.** Pivot (Phase 8) will slot into this pipeline. Don't hard-code assumptions that aggregation always sees non-pivoted columns.

Performance is a first-class requirement: grouping 100k rows is a normal workload, and this is the phase most likely to regress the benchmark.

> **Ship as five sequential PRs.** Do not attempt this as one PR — it is too large to review and too easy to get subtly wrong.

---

## Todo

### PR 2.1 — Stage plumbing

- [ ] `GroupStage` implementing `_IRowNodeGroupStage`, bean name `groupStage`, `step = 'group'`
- [ ] Required members: `treeData`, `grouping`, `hasTreeData`, `hasRowGrouping`, `refreshProps`, `execute(params: RefreshModelParams): boolean | undefined`
- [ ] `FlattenStage` implementing `_IRowNodeFlattenStage`, bean name `flattenStage`
- [ ] Group `RowNode` creation: keys, levels, `childrenAfterGroup`, `allLeafChildren`
- [ ] ColDef `rowGroup`, `enableRowGroup`
- [ ] *Acceptance:* `rowGroup: true` on a ColDef produces group rows with correct child counts

### PR 2.2 — Aggregation

- [ ] `AggFuncService` (bean `aggFuncSvc`) with built-ins `sum`, `min`, `max`, `count`, `avg`, `first`, `last`
- [ ] `AggregationStage` (bean `aggStage`, `step = 'aggregate'`)
- [ ] `FilterAggregateStage` (bean `filterAggStage`, `step = 'filter_aggregates'`)
- [ ] Options: `aggFuncs`, `suppressAggFuncInHeader`, `aggregateOnlyChangedColumns`, `suppressAggFilteredOnly`, `groupAggFiltering`, `alwaysAggregateAtRootLevel`, `getGroupRowAgg`
- [ ] ColDef: `aggFunc`, `initialAggFunc`, `enableValue`, `allowedAggFuncs`, `defaultAggFunc`, `valueIndex`, `initialValueIndex`
- [ ] API: `getValueColumns`, `addValueColumns`, `removeValueColumns`, `setValueColumns`, `setColumnAggFunc`, `addAggFuncs`, `clearAggFuncs`
- [ ] `rowNode.getAggregatedChildren(colKey)` and `(colKey, true)` for deep traversal

### PR 2.3 — Auto group column

- [ ] `autoGenColsSvc`, `showRowGroupColsSvc`
- [ ] `agGroupCellRenderer` user component with expand/collapse affordance
- [ ] `GROUP_AUTO_COLUMN_ID` handling
- [ ] Options: `groupDisplayType`, `autoGroupColumnDef`, `groupRowRenderer`, `groupRowRendererParams`, `showOpenedGroup`, `groupHideOpenParents`, `groupHideColumnsUntilExpanded`, `groupHideParentOfSingleChild`, `groupLockGroupColumns`, `groupMaintainOrder`, `groupAllowUnbalanced`, `suppressGroupChangesColumnVisibility`

### PR 2.4 — Expand/collapse, ordering, totals

- [ ] Options: `groupDefaultExpanded`, `isGroupOpenByDefault`, `initialGroupOrderComparator`, `suppressGroupRowsSticky`, `groupTotalRow`, `grandTotalRow`, `suppressStickyTotalRow`, `groupSuppressBlankHeader`
- [ ] API: `expandAll`, `collapseAll`
- [ ] `GroupSortStage` (bean `groupSortStage`)
- [ ] Group expansion state survives sort, filter and data update
- [ ] Sticky group rows

### PR 2.5 — Group filter & show-values-as

- [ ] `groupFilterStage` (bean), `iGroupFilterService`
- [ ] `showValuesAsSvc`
- [ ] ColDef: `showValuesAs`, `initialShowValuesAs`, `showValuesAsDef`, `enableShowValuesAs`
- [ ] Options: `rowGroupPanelShow`, `rowGroupPanelSuppressSort`, `groupHierarchyConfig`, `refreshAfterGroupEdit`
- [ ] Contribute `rowGroup`, `rowUnGroup`, `expandAll`, `contractAll`, `valueAggSubMenu` items to the Phase 1 menu registry

---

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Each agg func against `[]`, all-null, mixed null, non-numeric, single value, and large arrays. `avg` weighting across nested group levels. Group key derivation for null/undefined/duplicate values. Stage `refreshProps` correctness |
| **Integration** | Single- and multi-level grouping produces correct group counts and aggregates. Expansion state survives sort → filter → `setRowData`. `getGroupRowAgg` overrides column aggs. `suppressAggFilteredOnly` and `groupAggFiltering` change totals as documented. `expandAll`/`collapseAll` fire the documented events. Custom `aggFuncs` registered via grid option and via `addAggFuncs` |
| **E2E** | Click group expand/collapse chevrons. Sticky group row stays pinned while scrolling. Group totals render in the right place for `groupTotalRow: 'top' \| 'bottom'` |
| **Performance** | 100k rows, 3 group levels, 4 aggregated columns: initial group+aggregate, re-aggregate after a single cell edit, expand/collapse of a large group. Compare to `bench/baseline.json` |
| **a11y** | Group rows expose `aria-expanded`; expand/collapse reachable by keyboard; axe 0 violations light + dark |

**Specific edge cases to cover:**
- Unbalanced groups with `groupAllowUnbalanced`
- `null`/`undefined` group keys (must not collapse into one bucket unintentionally)
- `groupHideOpenParents` combined with `showOpenedGroup`
- Grand total with `alwaysAggregateAtRootLevel` on and off
- `aggregateOnlyChangedColumns` — verify untouched columns are genuinely not recomputed

---

## Acceptance criteria

- [ ] Multi-level grouping with aggregates over **100k rows** performs within baseline
- [ ] Group expansion state survives sort, filter and data updates
- [ ] All seven built-in agg funcs correct, including null handling
- [ ] Custom agg funcs work via both `aggFuncs` option and `addAggFuncs` API
- [ ] `expandAll` / `collapseAll` API and events match the parity checklist
- [ ] Auto group column renders with working expand/collapse; `autoGroupColumnDef` overrides apply
- [ ] Group and grand total rows correct in all documented positions
- [ ] Menu items contributed to Phase 1's registry **without editing `@libregrid/menu`**
- [ ] Both parity checklists fully marked ✅/🟡/❌ with rationale
- [ ] **No bench regression** vs. Phase-0 baseline
- [ ] Full Definition of Done (`standards.md` §9) satisfied
