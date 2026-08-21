# @libregrid/cell-selection

## 1.2.3

### Patch Changes

- cc24da1: minor bug fixes
- Updated dependencies [cc24da1]
  - @libregrid/core@1.2.3

## 1.2.2

### Patch Changes

- @libregrid/core@1.2.2

## 1.2.1

### Patch Changes

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

- @libregrid/core@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies [8735c38]
  - @libregrid/core@1.1.1

## 1.0.1

### Patch Changes

- 1fe2b96: Rewrote every package README with install instructions, usage examples,
  and an API table, and added a LICENSE file to every package (previously
  only NOTICE and README shipped in the published tarball). No runtime
  behavior changed.
- Updated dependencies [1fe2b96]
  - @libregrid/core@1.0.1

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

- 4bad79b: Add cell-range selection, range/fill handles, Excel-compatible clipboard actions,
  configurable status panels, and the Angular Material status-bar presentation shell.

### Patch Changes

- Updated dependencies [a3b983c]
- Updated dependencies [ee4f9cc]
- Updated dependencies [7aa7801]
  - @libregrid/core@1.0.0
