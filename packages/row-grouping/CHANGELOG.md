# @libregrid/row-grouping

## 1.2.3

### Patch Changes

- cc24da1: minor bug fixes
- Updated dependencies [cc24da1]
  - @libregrid/core@1.2.3
  - @libregrid/menu@1.2.3

## 1.2.2

### Patch Changes

- Updated dependencies [982d1cd]
  - @libregrid/menu@1.2.2
  - @libregrid/core@1.2.2

## 1.2.1

### Patch Changes

- Updated dependencies [b6836f0]
  - @libregrid/menu@1.2.1
  - @libregrid/core@1.2.1

## 1.2.0

### Minor Changes

- 3a7c86d: P0 enterprise-parity batch: Row Numbers, live column/group header editing, Show Values As, SSRM row grouping, and the group-header column menu.

  - **New `@libregrid/row-numbers`** — the AG Grid Community row-number column with 1-based numbering, RTL lock, and the row-height resizer handle. Clicking a row number selects the whole visible row (the press is consumed by the row-numbers feature and recorded through the cell-selection range service).
  - **New `@libregrid/column-header-edit`** — inline `headerName` editing for `headerNameEditable` columns and column groups, in `live` (Enter commits) and `deferred` (Apply commits) modes, exposed as the `Edit Column Name` column-menu item.
  - **Column menu now accepts a column-group target** — right-clicking a group header opens the column menu with the `AgProvidedColumnGroup` as the menu target. Per-column items (sort, auto-size this column, column chooser, column filter) are hidden for group targets; grid-level items (auto-size all, reset columns) and group-capable items (edit column name) remain. `MenuActionParams.column` is widened to `Column | AgProvidedColumnGroup | null`.
  - **Show Values As** — `colDef.showValuesAsDef`, built-in number/currency/percent/scientific/bytes modes, grid-wide `defaultColDef` merging, the `Show Values As` column-menu item, and `setColumnShowValuesAs`/`getColumnsShowValuesAs` API.
  - **Server-Side Row Model row grouping** — row group/pivot support for SSRM (group by, aggregation, expand/contract, value-agg menu) so `@libregrid/row-grouping` works across row models.
  - **Cell selection** — the row-numbers feature owns the press on its column; a cell drag never starts from a row-number cell, so a row-number click selects the row instead of a single cell.
  - **`@libregrid/all`** re-exports the two new modules.

### Patch Changes

- Updated dependencies [3a7c86d]
- Updated dependencies [192f180]
- Updated dependencies [c4c47ae]
- Updated dependencies [3a7c86d]
  - @libregrid/menu@1.2.0
  - @libregrid/core@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies [8735c38]
  - @libregrid/core@1.1.1
  - @libregrid/menu@1.1.1

## 1.0.1

### Patch Changes

- 1fe2b96: Rewrote every package README with install instructions, usage examples,
  and an API table, and added a LICENSE file to every package (previously
  only NOTICE and README shipped in the published tarball). No runtime
  behavior changed.
- Updated dependencies [1fe2b96]
  - @libregrid/core@1.0.1
  - @libregrid/menu@1.0.1

## 1.0.0

### Major Changes

- a3b983c: Phase 13 — 1.0.0 release: parity audit, honest gap list, migration guide,
  bundle budgets with tree-shaking fixtures, dist purity checks, dependency and
  attribution CI checks, Angular signal ergonomics, the @libregrid/all barrel,
  accessibility fixes, and hardened CI across Chromium, Firefox and WebKit.

  Publication is externally owned: run the changesets release workflow from
  main and publish with npm provenance (--provenance) as documented in
  docs/phases/phase-13-hardening.md.

### Minor Changes

- 7aa7801: PR 2.1 — Stage plumbing: GroupStage, FlattenStage, and package scaffolding for AG Grid Community row grouping.
- 7aa7801: PR 2.2 — Aggregation: AggFuncService with seven built-ins, aggStage/filterAggStage pipeline beans, ValueColsService and RowGroupColsService (enabling `treegrid` role and the row-group/value column APIs), minimal GroupFilterStage, and `groupDefaultExpanded` support.
- 39bdeb0: PR 2.3 — Auto group column: `AutoGenColsService` (bean `autoColSvc`), `ShowRowGroupColsService`/`ShowRowGroupColsValueService` (the seam Community's `ValueService` routes group-column values through), `ExpansionService` (bean `expansionSvc`, required for `RowNode.setExpanded` to do anything), and the `agGroupCellRenderer` user component with a click/dblclick/Enter expand-collapse affordance. Supports `autoGroupColumnDef`, `groupDisplayType: 'singleColumn'`, `showOpenedGroup`, `groupHideOpenParents`, `groupHideParentOfSingleChild`, and `groupAllowUnbalanced`.
- 1bbfdc5: PR 2.4 — Expand/collapse, ordering & totals: `GroupSortStage` (bean `groupSortStage`, which Community calls _instead of_ its own `sortStage` once grouping is active, so it owns root-level sorting too), `FooterService` (bean `footerSvc`) for `groupTotalRow`/`grandTotalRow`, `initialGroupOrderComparator` and `isGroupOpenByDefault` support in `GroupStage`, and stable `RowNode.id`s on group nodes. `api.expandAll`/`collapseAll`/`resetRowGroupExpansion` now work end-to-end (Community's own API functions were inert without `expansionSvc`, registered in PR 2.3). Also fixes two latent bugs found while building this: `FlattenStage` never read `childrenAfterSort`, so sorting never affected display order since PR 2.1; and `AggregationStage` never aggregated the root node unless `alwaysAggregateAtRootLevel` was set, so `grandTotalRow` had nothing to show. Sticky group/total rows are explicitly out of scope — a separate, self-contained `RowRenderer`/`RowCtrl` DOM-pinning feature; see `docs/parity/row-grouping.md`.
- 1bbfdc5: PR 2.5 — Group filter & Show Values As: full `groupAggFiltering` support in `GroupFilterStage` (reusing Community's own `FilterManager.doesRowPassAggregateFilters`, with a fix for a filter-bucket classification quirk that otherwise silently disabled per-leaf filtering once `groupAggFiltering` was configured), a new `ShowValuesAsService` (bean `showValuesAsSvc`) implementing the five built-in "Show Values As" percent-of-total modes, and menu-item contributions (`rowGroup`, `rowUnGroup`, `expandAll`, `contractAll`, `valueAggSubMenu`) registered into `@libregrid/menu`'s registry with zero edits to that package. Also fixes a production-build bug where the menu registration's side effect was silently dropped by esbuild despite being reachable — `menuItems.ts` needed an explicit `sideEffects` array entry, not just an import.

### Patch Changes

- 4bad79b: Add the client-side Pivot module with generated nested result columns,
  intersection aggregation, pivot APIs, functional Columns-panel controls, and
  the documented high-cardinality guard.
- 4bad79b: Add Tree Data source shapes and managed reparenting plus Master/Detail nested-grid lifecycle, caching, and refresh strategies.
- 985c5f9: Preserve group expansion state across row-data updates by restoring deterministic group IDs after regrouping, and restore every nested group's rows when filters are cleared.
- Updated dependencies [4bad79b]
- Updated dependencies [f0d2329]
- Updated dependencies [a3b983c]
- Updated dependencies [ee4f9cc]
- Updated dependencies [7aa7801]
  - @libregrid/menu@1.0.0
  - @libregrid/core@1.0.0
