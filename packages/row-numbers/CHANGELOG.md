# @libregrid/row-numbers

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
