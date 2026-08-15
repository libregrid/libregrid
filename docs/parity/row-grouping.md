# Parity — Row Grouping

**Source:** https://www.ag-grid.com/angular-data-grid/grouping/ · transcribed 2026-08-11
**Phase:** 2 · **Package:** `@libregrid/row-grouping`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `groupDisplayType` | 🟡 | PR 2.3 — only `'singleColumn'` (the default) is implemented; `'multipleColumns'`, `'groupRows'` and `'custom'` are not read at all |
| `autoGroupColumnDef` | ✅ | PR 2.3 — merged into the generated colDef by `AutoGenColsService`; `colId`/`showRowGroup` stay non-overridable |
| `groupRowRenderer` | ❌ | Only meaningful for `groupDisplayType: 'groupRows'` (full-width group rows), which isn't implemented — won't-do until that mode lands |
| `groupRowRendererParams` | ❌ | Same as `groupRowRenderer` |
| `showOpenedGroup` | ✅ | PR 2.3 — `ShowRowGroupColsValueService.getDisplayedNode` walks a leaf row up to its nearest group ancestor; integration-tested |
| `groupHideOpenParents` | 🟡 | PR 2.3 — `FlattenStage` hides an expanded group's own row and `ShowRowGroupColsValueService` substitutes its value onto the first child; only **one** hidden-ancestor level is substituted — a chain of 2+ consecutively-expanded hidden ancestors collapses onto one row but only the nearest one's value shows |
| `groupHideColumnsUntilExpanded` | ❌ | Not implemented — needs per-row column suppression across the whole row, not just the auto column; no roadmap item — deferred post-1.0 (phase-13 hardening) |
| `groupHideParentOfSingleChild` | ✅ | PR 2.3 — `FlattenStage.resolveDisplayNode` elides a group whose only child is itself (or, for `'leafGroupsOnly'`, whose only child is a leaf); integration-tested |
| `initialGroupOrderComparator` | ✅ | PR 2.4 — applied in `GroupStage` at tree-build time, before filtering/aggregation exist to compare on (matches ag-grid.com: "executes before filtering and aggregation"); integration-tested |
| `groupAllowUnbalanced` | ✅ | PR 2.3 — `GroupStage` attaches a row with a `null`/`undefined`/`''` value at a level directly under the parent instead of a `(Blanks)` bucket; integration-tested |
| `groupMaintainOrder` | ❌ | Not implemented — requires order tracking across `refreshModel` calls, but the tree is rebuilt from scratch each pass; deferred post-1.0 |
| `groupDefaultExpanded` | ✅ | PR 2.2 — `-1`/number levels honoured at tree creation |
| `isGroupOpenByDefault` | ✅ | PR 2.4 — takes priority over `groupDefaultExpanded` when both are set (per ag-grid.com: "only one... should be used"); integration-tested |
| `suppressGroupRowsSticky` | ❌ | Sticky group rows are not implemented (see "Sticky rows" below) — this option is a no-op since `stickyRowSvc` is never registered, which is a safe default (Community handles its absence gracefully) |
| `rowGroupPanelShow` | ✅ | `RowGroupingPanelModule` supplies the header row-group zone. `always` and `onlyWhenGrouping` visibility are integration-tested; `never` hides it. |
| `rowGroupPanelSuppressSort` | ❌ | The header row-group panel is shipped, but it has no sort behavior and does not read this option. |
| `pivotPanelSuppressSort` | 🟡 | Phase 8 shipped — see `docs/parity/pivoting.md`: the option is preserved as a strict-order signal, but interactive pivot-label sorting is not yet implemented |
| `groupLockGroupColumns` | ❌ | Not implemented — column drag-lock pairs with Phase 3's drag-and-drop tool panel; deferred post-1.0 (phase-13 13A lists the columns-panel drag interactions as long tail) |
| `groupHierarchyConfig` | ❌ | Not implemented — niche `colDef.groupHierarchy` custom-component registry with no consumer; deferred post-1.0 |
| `suppressDragLeaveHidesColumns` | ❌ | Not implemented — controls whether dragging a column out of the grid hides it; LibreGrid has no drag-out-of-grid hide behaviour (would pair with Phase 3's drag-and-drop tool panel); deferred post-1.0 |
| `suppressGroupChangesColumnVisibility` | ❌ | Not implemented — no column-auto-hide-on-grouping behaviour exists for this option to suppress; would only matter alongside the tool-panel drag/drop surface (phase-13 13A long tail, post-1.0) |
| `ssrmExpandAllAffectsAllRows` | ✅ | Implemented by Phase 9's `@libregrid/server-side-row-model` (✅ in `server-side-row-model.md`): defaults apply to subsequently materialized group nodes; loaded nodes expand/collapse immediately; exercised in `serverSideRowModelModule.spec.ts` |
| `refreshAfterGroupEdit` | ❌ | Not implemented — controls re-aggregation timing after an inline cell edit, and LibreGrid has no cell-editing feature yet; deferred post-1.0 |
| `groupAggFiltering` | ✅ | PR 2.5 — `GroupFilterStage` reuses Community's own `FilterManager.doesRowPassAggregateFilters`; see "Group Aggregate Filtering" below; integration-tested (`true`, callback form, and interaction with normal per-leaf filtering) |
| `groupTotalRow` | ✅ | PR 2.4 — `FooterService`; only shows while the owning group is expanded, per ag-grid.com ("to display when the group is expanded"); integration-tested |
| `grandTotalRow` | 🟡 | PR 2.4 — `'top'`/`'bottom'` (inline) supported and integration-tested; `'pinnedTop'`/`'pinnedBottom'` are not — pinning requires routing through the pinned row model, a separate seam this PR doesn't touch |
| `suppressStickyTotalRow` | ❌ | Not implemented — total rows aren't sticky (`stickyRowSvc` is never registered), so this option is a no-op; sticky rows are a documented post-1.0 candidate (phase-13 13A; see "Sticky rows" below) |
| `groupSuppressBlankHeader` | ✅ | PR 2.4 — free once `FooterService` links `groupNode.sibling`: Community's own `ValueService.displayIgnoresAggData` already gates on `node.sibling` existing; integration-tested |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `rowGroup` | ✅ | PR 2.1 — GroupStage creates group rows |
| `enableRowGroup` | ✅ | Gates the Phase 2 menu contribution and the Phase 3 native panel/header row-group controls and drops. |
| `showValuesAs` | ✅ | PR 2.5 — see "Show Values As" below |
| `initialShowValuesAs` | ✅ | PR 2.5 — create-only, per doc; integration-tested via `resolveColumn`'s `applyInitial` flag |
| `showValuesAsDef` | 🟡 | PR 2.5 — `precision`/`suppressHeaderIndicator` read; `modes` (custom mode registry / built-in overrides) not implemented |
| `enableShowValuesAs` | 🟡 | PR 2.5 — read by `isMenuEligible`, but nothing in this PR renders the eligible menu (see "Show Values As" below) |

## Auto Group Column (PR 2.3)

| Item | Status | Notes |
|---|---|---|
| `autoColSvc` bean | ✅ | `AutoGenColsService` — generates the single auto-group `AgColumn` (`ColKind: 'auto-group'`) that `ColumnModel.refreshCols` splices in; reacts to `columnRowGroupChanged` |
| `showRowGroupCols` bean | ✅ | `ShowRowGroupColsService` — stamps `AgColumn.showRowGroupCol`; `interleaveSortedColumns`/`fillCoupledSortIndexMap`/`isGroupSortMixed` are minimal identity defaults pending the row-group-panel coupled-sort UI (PR 2.5) |
| `showRowGroupColValueSvc` bean | ✅ | `ShowRowGroupColsValueService` — the actual seam Community's `ValueService.getValueForDisplay` routes group-column values through |
| `expansionSvc` bean | ✅ | `ExpansionService` — `RowNode.setExpanded`/`.expanded`/`.isExpandable()` all delegate here; without it `setExpanded` is a silent no-op. PR 2.4: `resetExpansion` now actually resets to defaults (triggers a `group`-step refresh, since defaults are computed at tree-build time) rather than blindly collapsing; `getExpansionState`/`setExpansionState` still key off `RowNode.id`, now stamped by `GroupStage` (see below) |
| `agGroupCellRenderer` | ✅ | `GroupCellRenderer` — expand/collapse chevron (click, double-click unless `suppressDoubleClickExpand`, Enter unless `suppressEnterExpand`), value, child count (unless `suppressCount`), indentation (unless `suppressPadding`), `aria-expanded`; PR 2.4 adds footer-row rendering (see below) |
| `GROUP_AUTO_COLUMN_ID` | ✅ | Community's literal (`'ag-Grid-AutoColumn'`) reused verbatim — required for interoperability, not invented |
| `cellRendererParams.innerRenderer` / `innerRendererParams` / `innerRendererSelector` | ❌ | Not implemented — `GroupCellRenderer` has no custom inner-renderer (component/selector) support; deferred post-1.0 |
| `cellRendererParams.checkbox` | ❌ | Deprecated upstream since v33 in favour of `rowSelection.checkboxLocation` — won't-do |
| `cellRendererParams.totalValueGetter` | ✅ | PR 2.4 — function form only (string/expression form unsupported); `GroupCellRenderer` calls it directly for a footer row's group-column text, falling back to the literal `'Total'` (ag-grid.com documented default) |

## Sorting, Ordering & Totals (PR 2.4)

| Item | Status | Notes |
|---|---|---|
| `groupSortStage` bean | ✅ | `GroupSortStage` — Community stops calling its own `sortStage` entirely once grouping is active (`hierarchical && beans.groupSortStage \|\| beans.sortStage`), so this bean owns the root level too, not just recursion into subgroups. Recursively sorts every level's `childrenAfterAggFilter` into `childrenAfterSort` via the same `sortOptions`/`rowNodeSorter` Community itself uses; integration-tested with multi-level, per-level-independent sort by a value column |
| `footerSvc` bean | ✅ | `FooterService` — backs `groupTotalRow`/`grandTotalRow`. A total row is `node.sibling`, built with Community's own `_createRowNodeSibling` and given the id Community's own `getRowNode` already resolves (`GROUP_TOTAL_ROW_ID_PREFIX + groupNode.id`; the root's is `GRAND_TOTAL_ROW_ID` for free). `getTotalValue`/`doesCellShowTotalPrefix`/`applyTotalPrefix` are implemented for interface completeness but have no call sites in Community or in `GroupCellRenderer` (which hardcodes the same documented default directly, having no bean access) |
| `RowNode.id` (group nodes) | ✅ | PR 2.4 — `GroupStage` stamps `${parentId}-${colId}-${key}` on every group node and maintains an id→node map backing `getNonLeaf`, which `ClientSideRowModel.getRowNode` needs to resolve `GROUP_TOTAL_ROW_ID_PREFIX + groupId` lookups; integration-tested |
| Sticky rows (`stickyRowSvc` / `IStickyRowService`) | ❌ | **Not implemented.** Confirmed via `suppressGroupRowsSticky`/`suppressStickyTotalRow` docs and the `IStickyRowService`/`IStickyRowFeature` interfaces that this is a scroll-linked, viewport-pinning DOM feature requiring deep `RowRenderer`/`RowCtrl` integration (creating/destroying pinned `RowCtrl`s, tracking `extraTopHeight`/`extraBottomHeight` against live scroll position) — a distinct, self-contained feature area, not a bean-registration seam like the rest of this phase. Registering nothing for `stickyRowSvc` is a safe default: Community's `RowRenderer` already branches on its absence (`gridBodyCtrl.setStickyTopHeight(0)`). Group/total rows render correctly at their configured position; they simply scroll normally instead of sticking. Sticky rows are a documented post-1.0 candidate (phase-13 13A). Revisit as its own PR if prioritised |

## Group Aggregate Filtering (PR 2.5)

| Item | Status | Notes |
|---|---|---|
| `groupAggFiltering` | ✅ | `GroupFilterStage` — reuses Community's own `FilterManager.doesRowPassAggregateFilters`. When a group's own aggregated value passes, its entire subtree is included unfiltered ("also includes all of its descendent rows", per ag-grid.com). The fail case isn't documented at the algorithm level (not independently verifiable — Enterprise source is off-limits per G1); the interpretation shipped here is that a failing group simply falls through to ordinary per-leaf filtering, so aggregate-filtering is purely an *additional* way for a subtree to survive, never a way to exclude one |
| Empirical fix | ✅ | Once a filter sits on a column FilterManager treats as aggregatable, it can register **only** in the aggregate bucket (`isAggregateFilterPresent`), not the child one (`isColumnFilterPresent`/`isChildFilterPresent`) — and both `doesRowPassFilter`/`doesRowPassAggregateFilters` "pass by default" when their own bucket is empty. A leaf must therefore pass **both** checks; gating on `isChildFilterPresent()` alone (the original PR 2.2 code, matching Community's own non-hierarchical `FilterStage`) silently stopped filtering leaf rows at all once `groupAggFiltering` was configured. Fixed by gating on `isAnyFilterPresent()` and combining both leaf checks |
| `iGroupFilterService` (bean `groupFilter`) | ❌ | Not implemented — this *separate* seam (`isGroupFilter`/`isFilterAllowed`/`isFilterActive`/`updateFilterFlags`) for showing a filter icon on the group column's header has no UI consumer; deferred post-1.0 |

## Show Values As (PR 2.5)

| Item | Status | Notes |
|---|---|---|
| `showValuesAsSvc` bean | ✅ | `ShowValuesAsService`. Confirmed against the compiled bundle: Community's own `ValueService` calls only `isApplying`/`transform`/`formatValue` (the display path) and the header "Σ" indicator calls only `isApplying`/`getActiveModeTooltip` — both read `column.showValuesAs`/`column.showValuesAsDef` directly as plain writable `AgColumn` fields. Every other interface method has zero Community call sites; we self-drive `resolveColumn` via `newColumnsLoaded`, the same `autoColSvc`/`expansionSvc` self-driven-lifecycle pattern from PR 2.3 |
| `percentOfGrandTotal` | ✅ | Sum of all leaf values for the column (prefers `rootNode.aggData` when grouped, else sums leaves directly) — works with or without row grouping; integration-tested |
| `percentOfColumnTotal` | ✅ | Identical to `percentOfGrandTotal` — correct, not a gap: the interface's own doc says `columnTotal()` "equal to `grandTotal()` unless pivoting", and there is no pivot support |
| `percentOfRowTotal` | ✅ | Sum of `valueColsSvc.columns`' values on that row; integration-tested |
| `percentOfParentRowTotal` | ✅ | Nearest group ancestor's aggregate; falls back to the grand total for a top-level row (no group parent); integration-tested |
| `percentOfParentColumnTotal` | ❌ | Always inapplicable — `parentColumnTotal()` is documented as "null when not pivoting", and there is no pivot support. `isApplying` returns `false` for this mode, so cells show the raw value rather than a broken transform; integration-tested |
| `showValuesAsDef.modes` (custom modes / built-in overrides) | ❌ | Not implemented — only the five built-in modes resolve; the custom-mode registry / built-in overrides are deferred post-1.0 |
| `ShowValuesAsModeDef.menu` (per-mode custom submenu builder) | ❌ | Not implemented — per-mode custom submenu builders are not provided; `getMenuItems` offers a flat mode list only |
| Column-menu integration | 🟡 | `isMenuEligible`/`getMenuItems`/`setColumnShowValuesAs` are implemented and unit-testable directly, but **not wired into `@libregrid/menu`'s `ColumnMenuFactory`** — doing so would mean editing `@libregrid/menu`, which this PR's menu-item contributions are explicitly scoped to avoid. `colDef.showValuesAs` and `setColumnShowValuesAs` (called programmatically) are the two ways to select a mode this PR ships; there's no visible column-menu entry point yet |

## Menu Contributions (PR 2.5)

| Item | Status | Notes |
|---|---|---|
| `rowGroup` / `rowUnGroup` | ✅ | `menuItems.ts` — offered only when ungrouped + `colDef.enableRowGroup: true` / currently grouped, respectively; unit-tested |
| `expandAll` / `contractAll` | ✅ | Grid-wide (`api.expandAll`/`collapseAll`) when there's no `params.node`; scoped to just that subtree (recursive `IRowNode.setExpanded`) when invoked from a context menu on a specific row — there's no scoped expansion API, `expansionSvc.expandAll` is grid-wide only. Hidden entirely when no row-group columns are active; unit-tested |
| `valueAggSubMenu` | ✅ | Lists `colDef.allowedAggFuncs`, or else the seven built-ins, as a checked submenu; `MenuActionParams` exposes only `{ column, node, value, api }` (no bean access, matching every other menu item factory in this codebase), so a custom `aggFunc` registered via `aggFuncs`/`addAggFuncs` and not listed in `allowedAggFuncs` won't appear; unit-tested |
| Registry contribution mechanism | ✅ | `registerMenuItems` at module scope, per `registryApi.ts`'s documented pattern — zero edits to `@libregrid/menu`. Registering makes items *resolvable*, not automatically visible: `DEFAULT_COLUMN_MENU_ITEMS`/`DEFAULT_CONTEXT_MENU_ITEMS` are static, Phase-1-owned arrays; a consumer opts these in via `getColumnMenuItems`/`contextMenuItems` (e.g. `(params) => [...params.defaultItems, 'separator', 'rowGroup', 'rowUnGroup']`) |
| Build-time gotcha | ✅ fixed | A bare `import './menuItems'` (for its registration side effect) was silently dropped by esbuild's production build — reachable from `RowGroupingModule`, but `menuItems.ts` has no used exports and the package declares `sideEffects: false`, and esbuild prunes any import of a side-effect-free file with no used bindings regardless of reachability. Fixed by listing the file in `package.json`'s `sideEffects` array. Verified by grepping the built docs-app bundle for the registered item text. `docs/reference/package-architecture.md` §6 only documents this trap for CSS; a module-scope registration side effect is the same trap under a different name |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `expandAll` | ✅ | PR 2.4 — no new API function needed: Community's own `ClientSideRowModelApiModule` already provides `expandAll`/`collapseAll`/`resetRowGroupExpansion`, calling `beans.expansionSvc` directly; they were inert until `expansionSvc` was registered in PR 2.3. Integration-tested end-to-end |
| `collapseAll` | ✅ | PR 2.4, see above |
| `resetRowGroupExpansion` | ✅ | PR 2.4, see above — now genuinely resets to `groupDefaultExpanded`/`isGroupOpenByDefault` defaults rather than collapsing |
| `setRowGroupColumns` | ✅ | PR 2.2 — via `rowGroupColsSvc` |
| `addRowGroupColumns` | ✅ | |
| `removeRowGroupColumns` | ✅ | |
| `getRowGroupColumns` | ✅ | |
| `moveRowGroupColumn` | ✅ | |
| `getCellValue` (auto group column) | ✅ | PR 2.3 — routes through `showRowGroupColValueSvc`; integration-tested |

## Callbacks

| Callback | Status | Notes |
|---|---|---|
| `initialGroupOrderComparator` | ✅ | PR 2.4 — see Grid Options above |
| `isGroupOpenByDefault` | ✅ | PR 2.4 — see Grid Options above |

## Events

| Event | Status | Notes |
|---|---|---|
| `rowGroupOpened` | ❌ | Not implemented — `expandedChanged` fires on the `RowNode` itself (consumed by `GroupCellRenderer`), but the grid-level `rowGroupOpened` event is not dispatched; deferred post-1.0 |
| `expandOrCollapseAll` | ❌ | Not implemented — `expandAll`/`collapseAll` work (see API Methods) but do not fire the grid-level `expandOrCollapseAll` event; deferred post-1.0 |
| `columnRowGroupChanged` | ✅ | Dispatched by `RowGroupColsService.dispatchColChange`; `AutoGenColsService` and `ShowRowGroupColsService` both react to it |

> The docs page did not enumerate API methods or events. The entries above are the expected surface — **verify against the live docs and the `_RowGroupingGridApi` type when working Phase 2**, and add anything missing.
