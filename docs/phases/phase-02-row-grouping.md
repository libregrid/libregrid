# Phase 2 — Row Grouping & Aggregation

**Status:** ✅ Complete
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
- **`pivotStage` runs _before_ `aggStage`.** Pivot (Phase 8) will slot into this pipeline. Don't hard-code assumptions that aggregation always sees non-pivoted columns.

Performance is a first-class requirement: grouping 100k rows is a normal workload, and this is the phase most likely to regress the benchmark.

> **Ship as five sequential PRs.** Do not attempt this as one PR — it is too large to review and too easy to get subtly wrong.

---

## Todo

### PR 2.1 — Stage plumbing ✅

- [x] `GroupStage` implementing `_IRowNodeGroupStage`, bean name `groupStage`
- [x] Required members: `treeData`, `grouping`, `hasTreeData`, `hasRowGrouping`, `refreshProps`, `execute(params: RefreshModelParams): boolean | undefined`
- [x] `FlattenStage` implementing `_IRowNodeFlattenStage`, bean name `flattenStage`
- [x] Group `RowNode` creation: keys, levels, `childrenAfterGroup`, `allLeafChildren`
- [x] ColDef `rowGroup`, `enableRowGroup`
- [x] _Acceptance:_ `rowGroup: true` on a ColDef produces group rows with correct child counts
- [x] **Benchmark-route compatibility regression repaired:** `RowGroupingModule` depends on the documented `SharedRowGrouping`, `SharedAggregation`, and `CsrmGroupStages` internal seam modules. Community validates the grouping and aggregation ColDef flags through those names; a fresh Chromium benchmark now asserts zero AG Grid diagnostics.

### PR 2.2 — Aggregation ✅

- [x] `AggFuncService` (bean `aggFuncSvc`) with built-ins `sum`, `min`, `max`, `count`, `avg`, `first`, `last`
- [x] `AggregationStage` (bean `aggStage`, `step = 'aggregate'`)
- [x] `FilterAggregateStage` (bean `filterAggStage`, `step = 'filter_aggregates'`)
- [x] Options: `aggFuncs`, `suppressAggFuncInHeader` (deferred to 2.3), `aggregateOnlyChangedColumns` (🟡 full traversal for now), `suppressAggFilteredOnly`, `groupAggFiltering` (🟡 full version in 2.5), `alwaysAggregateAtRootLevel`, `getGroupRowAgg`
- [x] ColDef: `aggFunc`, `initialAggFunc`, `enableValue`, `allowedAggFuncs`, `defaultAggFunc`, `valueIndex` (🟡), `initialValueIndex` (🟡)
- [x] API: `getValueColumns`, `addValueColumns`, `removeValueColumns`, `setValueColumns`, `setColumnAggFunc`, `addAggFuncs`, `clearAggFuncs`
- [x] `rowNode.getAggregatedChildren(colKey)` and `(colKey, true)` for deep traversal (Community method over our tree; pivot-key semantics in Phase 8)
- [x] `ValueColsService` (bean `valueColsSvc`) — required so `_applyColumnState` routes `aggFunc` state
- [x] `RowGroupColsService` (bean `rowGroupColsSvc`) — required for Community's `treegrid` grid role and row-group column API; `setRowGroupColumns`/`addRowGroupColumns`/`removeRowGroupColumns`/`moveRowGroupColumn`/`getRowGroupColumns` now functional
- [x] `GroupFilterStage` (bean `groupFilterStage`) — minimal recursive version; PR 2.5 adds `groupAggFiltering`

### PR 2.3 — Auto group column ✅

- [x] `autoColSvc` (bean names verified against `context.ts` over this file's draft names — see `docs/parity/row-grouping.md`), `showRowGroupCols`, `showRowGroupColValueSvc`
- [x] `expansionSvc` — not in the original draft list, but discovered to be required: `RowNode.setExpanded`/`.expanded`/`.isExpandable()` all delegate to it, and it's absent from `AllCommunityModule`
- [x] `agGroupCellRenderer` user component with expand/collapse affordance (click, dblclick, Enter)
- [x] `GROUP_AUTO_COLUMN_ID` handling
- [x] Options: `groupDisplayType` (🟡 `singleColumn` only), `autoGroupColumnDef`, `showOpenedGroup`, `groupHideOpenParents` (🟡 single hidden-ancestor level), `groupHideParentOfSingleChild`, `groupAllowUnbalanced`
- [ ] Options not implemented this PR — see `docs/parity/row-grouping.md` for rationale per option: `groupRowRenderer`/`groupRowRendererParams` (❌ tied to unimplemented `groupRows` display type), `groupHideColumnsUntilExpanded`, `groupLockGroupColumns`, `groupMaintainOrder`, `suppressGroupChangesColumnVisibility`
- [x] _Acceptance:_ auto group column renders with working expand/collapse; `autoGroupColumnDef` overrides apply — verified by integration tests and manually in the docs app (`/row-grouping`)

### PR 2.4 — Expand/collapse, ordering, totals ✅

- [x] Options: `isGroupOpenByDefault` (takes priority over `groupDefaultExpanded` when both set), `initialGroupOrderComparator` (applied in `GroupStage` at tree-build time — it "executes before filtering and aggregation" per ag-grid.com, so it does not belong in a post-aggregate stage), `groupTotalRow`, `grandTotalRow` (🟡 inline `'top'`/`'bottom'` only), `groupSuppressBlankHeader` (came free from `FooterService` linking `.sibling` — Community's own `ValueService.displayIgnoresAggData` already implements the gating)
- [x] API: `expandAll`, `collapseAll`, `resetRowGroupExpansion` — no new API functions needed; Community's `ClientSideRowModelApiModule` already provides all three (calls `beans.expansionSvc` directly), inert since PR 2.3 until now verified end-to-end. `ExpansionService.resetExpansion` was fixed to actually reset to defaults (trigger a `group`-step refresh) rather than blindly collapsing everything, which is what it did before this PR
- [x] `GroupSortStage` (bean `groupSortStage`) — discovered mid-implementation that Community stops calling its own `sortStage` **entirely** once grouping is active (`hierarchical && beans.groupSortStage || beans.sortStage`, not "call both"), so this bean owns root-level sorting too, not just recursion into subgroups
- [x] `FooterService` (bean `footerSvc`) for `groupTotalRow`/`grandTotalRow` — a total row is `node.sibling`, built with Community's own `_createRowNodeSibling` and given the id Community's own `getRowNode`/`getSpecialRowNode` already resolve (`GROUP_TOTAL_ROW_ID_PREFIX + groupNode.id`)
- [x] `RowNode.id` stamping on group nodes (`GroupStage`, `${parentId}-${colId}-${key}`) plus an id→node map backing `getNonLeaf` — needed for `api.getRowNode(GROUP_TOTAL_ROW_ID_PREFIX + groupId)` to resolve
- [x] **Bug found and fixed**: `FlattenStage` never read `childrenAfterSort` at all (it read `childrenAfterAggFilter`/`childrenAfterFilter`/`childrenAfterGroup`, none of which reflect sort order) — meaning sorting had zero effect on the displayed row order since PR 2.1, for both root and grouped rows alike. Caught by this PR's own sort test; fixed by preferring `childrenAfterSort` first in both `flatten()` and `resolveDisplayNode()`
- [x] **Bug found and fixed**: `AggregationStage` only aggregated the root node when `alwaysAggregateAtRootLevel` was true — meaning `grandTotalRow` had nothing to display by default. Fixed by also aggregating root whenever `grandTotalRow` is set (`_getGrandTotalRow(gos)`)
- [x] Group expansion state survives sort, filter, and row-data updates (integration-tested). `GroupStage` preserves the previous expansion state by deterministic group ID while rebuilding after `rowDataUpdated`; new groups still use the configured expansion default
- [ ] Sticky group rows — **not implemented**, and deliberately scoped out rather than half-built. Confirmed via `suppressGroupRowsSticky`/`suppressStickyTotalRow` docs and the `IStickyRowService`/`IStickyRowFeature` interfaces (`createStickyRowFeature`, `extraTopHeight`/`extraBottomHeight`, `checkStickyRows`) that this is a scroll-linked, viewport-pinning DOM feature requiring deep `RowRenderer`/`RowCtrl` integration — a distinct, self-contained feature area, not a bean-registration seam like everything else in this phase. Registering nothing for `stickyRowSvc` is a safe default (Community's `RowRenderer` already branches on its absence). Total/group rows render correctly at their configured position; they just scroll normally instead of sticking. See `docs/parity/row-grouping.md` for full rationale — revisit as its own PR if prioritised

### PR 2.5 — Group filter & show-values-as ✅

- [x] `groupFilterStage` extended with full `groupAggFiltering` — reuses Community's own `FilterManager.doesRowPassAggregateFilters`/`isAggregateFilterPresent` (the exact seam already built for this). Discovered along the way: once a filter sits on a column FilterManager treats as aggregatable, it can register _only_ in the aggregate bucket, not the child one — both `isChildFilterPresent()`-only gating and `doesRowPassFilter()`-only leaf checks silently no-op in that case; fixed by gating on `isAnyFilterPresent()` and requiring a leaf to pass _both_ `doesRowPassFilter` and `doesRowPassAggregateFilters` (each defaults to "pass" when its own bucket is empty, so the combination is correct in every case, not just this one). `iGroupFilterService` (bean `groupFilter`, `isGroupFilter`/`isFilterAllowed`/`isFilterActive`/`updateFilterFlags`) is a _separate_ seam for the group-column-header filter icon UI — not implemented, no UI consumes it yet
- [x] `showValuesAsSvc` (bean) — 5 built-in modes; see `docs/parity/row-grouping.md` for exact scope/gaps (custom mode registry and pivot-dependent modes deferred, both undocumented by Community call sites)
- [x] ColDef: `showValuesAs`, `initialShowValuesAs`, `showValuesAsDef`, `enableShowValuesAs` (read by `isMenuEligible`, not wired to any visible menu — see parity doc)
- [x] `rowGroupPanelShow` — implemented by Phase 3's separate `RowGroupingPanelModule` for `always`, `onlyWhenGrouping`, and `never`
- [ ] `rowGroupPanelSuppressSort` — still not implemented after Phase 3; the standalone panel has no sort indicators or sort actions
- [ ] `groupHierarchyConfig` — deferred; niche (`colDef.groupHierarchy` custom-component registry), no consumer of `colDef.groupHierarchy` exists yet
- [ ] `refreshAfterGroupEdit` — deferred; controls re-aggregation timing after an inline cell edit, and LibreGrid has no cell-editing feature yet in any package
- [x] Contribute `rowGroup`, `rowUnGroup`, `expandAll`, `contractAll`, `valueAggSubMenu` items to the Phase 1 menu registry — via `registerMenuItems` at module scope (`menuItems.ts`), no edits to `@libregrid/menu`. Registering makes them _resolvable_; they are not added to `DEFAULT_COLUMN_MENU_ITEMS`/`DEFAULT_CONTEXT_MENU_ITEMS` (those are static Phase-1-owned arrays — a consumer opts in via `getColumnMenuItems`/`contextMenuItems`). **Build gotcha found and fixed**: a bare `import './menuItems'` for its registration side effect was silently dropped by esbuild's production build despite being reachable, because `menuItems.ts` has no used exports and the package declares `sideEffects: false` — esbuild prunes _any_ import of a side-effect-free file with no used bindings, reachability alone isn't enough. Fixed by listing the file explicitly in `package.json`'s `sideEffects` array (both the `src/*.ts` and `dist/*.js` paths, since this monorepo's dev builds resolve straight to `src` via `tsconfig.base.json` path mapping while a published consumer would resolve `dist`). `docs/reference/package-architecture.md` §6 only documented this trap for CSS; module-scope _registration_ side effects are the same trap under a different name — worth a doc update if this pattern recurs

---

## Test plan

| Tier            | Coverage                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**        | Each agg func against `[]`, all-null, mixed null, non-numeric, single value, and large arrays. `avg` weighting across nested group levels. Group key derivation for null/undefined/duplicate values. Stage `refreshProps` correctness                                                                                                                                                                    |
| **Integration** | Single- and multi-level grouping produces correct group counts and aggregates. Expansion state survives sort → filter → `setGridOption('rowData', ...)`. `getGroupRowAgg` overrides column aggs. `suppressAggFilteredOnly` and `groupAggFiltering` change totals as documented. `expandAll`/`collapseAll` fire the documented events. Custom `aggFuncs` registered via grid option and via `addAggFuncs` |
| **E2E**         | Click group expand/collapse chevrons. Group totals render at the bottom of expanded groups and at the grid end. Sticky group rows are explicitly out of scope and need a separate future PR.                                                                                                                                                                                                             |
| **Performance** | 3 grouping dimensions plus a summed value column. Benchmark API grouping (group + aggregate) across 10k, 100k, and 1M rows; compare against the promoted Chromium baseline                                                                                                                                                                                                                               |
| **a11y**        | Group rows expose `aria-expanded`; expand/collapse reachable by mouse and keyboard; axe 0 violations light + dark                                                                                                                                                                                                                                                                                        |

**Specific edge cases to cover:**

- Unbalanced groups with `groupAllowUnbalanced`
- `null`/`undefined` group keys (must not collapse into one bucket unintentionally)
- `groupHideOpenParents` combined with `showOpenedGroup`
- Grand total with `alwaysAggregateAtRootLevel` on and off
- `aggregateOnlyChangedColumns` — verify untouched columns are genuinely not recomputed

---

## Acceptance criteria

- [x] Multi-level grouping with aggregates over **100k rows** performs within baseline
- [x] Group expansion state survives sort, filter and data updates
- [x] All seven built-in agg funcs correct, including null handling
- [x] Custom agg funcs work via both `aggFuncs` option and `addAggFuncs` API
- [x] `expandAll` / `collapseAll` API and events match the parity checklist
- [x] Auto group column renders with working expand/collapse; `autoGroupColumnDef` overrides apply
- [x] Group and grand total rows correct in all documented positions
- [x] Menu items contributed to Phase 1's registry **without editing `@libregrid/menu`**
- [x] Both parity checklists fully marked ✅/🟡/❌ with rationale
- [x] **No bench regression** vs. Phase-0 baseline
- [x] Full Definition of Done (`standards.md` §9) satisfied
