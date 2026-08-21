# @libregrid/all

## 1.2.2

### Patch Changes

- Updated dependencies [982d1cd]
  - @libregrid/menu@1.2.2
  - @libregrid/advanced-filter@1.2.2
  - @libregrid/angular@1.2.2
  - @libregrid/batch-edit@1.2.2
  - @libregrid/cell-selection@1.2.2
  - @libregrid/clipboard@1.2.2
  - @libregrid/column-header-edit@1.2.2
  - @libregrid/columns-tool-panel@1.2.2
  - @libregrid/core@1.2.2
  - @libregrid/excel-export@1.2.2
  - @libregrid/filters-tool-panel@1.2.2
  - @libregrid/find@1.2.2
  - @libregrid/integrated-charts@1.2.2
  - @libregrid/master-detail@1.2.2
  - @libregrid/material@1.2.2
  - @libregrid/multi-filter@1.2.2
  - @libregrid/notes@1.2.2
  - @libregrid/pivot@1.2.2
  - @libregrid/rich-select@1.2.2
  - @libregrid/row-grouping@1.2.2
  - @libregrid/row-numbers@1.2.2
  - @libregrid/server-side-row-model@1.2.2
  - @libregrid/server-side-selection@1.2.2
  - @libregrid/set-filter@1.2.2
  - @libregrid/side-bar@1.2.2
  - @libregrid/sparklines@1.2.2
  - @libregrid/status-bar@1.2.2
  - @libregrid/tree-data@1.2.2
  - @libregrid/viewport-row-model@1.2.2

## 1.2.1

### Patch Changes

- Updated dependencies [b6836f0]
  - @libregrid/menu@1.2.1
  - @libregrid/advanced-filter@1.2.1
  - @libregrid/angular@1.2.1
  - @libregrid/batch-edit@1.2.1
  - @libregrid/cell-selection@1.2.1
  - @libregrid/clipboard@1.2.1
  - @libregrid/column-header-edit@1.2.1
  - @libregrid/columns-tool-panel@1.2.1
  - @libregrid/core@1.2.1
  - @libregrid/excel-export@1.2.1
  - @libregrid/filters-tool-panel@1.2.1
  - @libregrid/find@1.2.1
  - @libregrid/integrated-charts@1.2.1
  - @libregrid/master-detail@1.2.1
  - @libregrid/material@1.2.1
  - @libregrid/multi-filter@1.2.1
  - @libregrid/notes@1.2.1
  - @libregrid/pivot@1.2.1
  - @libregrid/rich-select@1.2.1
  - @libregrid/row-grouping@1.2.1
  - @libregrid/row-numbers@1.2.1
  - @libregrid/server-side-row-model@1.2.1
  - @libregrid/server-side-selection@1.2.1
  - @libregrid/set-filter@1.2.1
  - @libregrid/side-bar@1.2.1
  - @libregrid/sparklines@1.2.1
  - @libregrid/status-bar@1.2.1
  - @libregrid/tree-data@1.2.1
  - @libregrid/viewport-row-model@1.2.1

## 1.2.0

### Minor Changes

- f4d6a72: Add `@libregrid/batch-edit`: batch editing for Community grids. The module registers the four `GridApi` functions the Community build reserves (`startBatchEdit`, `commitBatchEdit`, `cancelBatchEdit`, `isBatchEditing`) on top of the Community edit service, so staged cell edits can be committed in one pass or cancelled — plus the staged-edit highlight styles.
- 3a7c86d: A4: cell and full-width-row notes (Enterprise `Notes` module parity).

  - **New `@libregrid/notes`** — the AG Grid Community notes feature. Provide a `notesDataSource` (or a `FullWidthNotesDataSource` with `supportsFullWidthRows: true`) and register `NotesModule`. Notes open on hover (`noteTrigger: 'hover'`, `noteShowDelay`, `noteHideDelay`), on click (`noteTrigger: 'click'`), or with `Shift+F2`. Noted cells and full-width rows are marked with the `lgr-cell-has-note` class. The popup edits text only (metadata is rendered as provided), commits on close when changed, and honours `note.readOnly`. `colDef.suppressNoteActions` (boolean or callback) hides note interactions per column — suppressed cells with an existing note only offer _View Note_. `notesDataSource` can be set or cleared at runtime with `setGridOption`; the grid reacts without a redraw. Grid API: `getNote`, `setNote`, `refreshNotes` (the reserved Enterprise method names).
  - **Context menu `note` item is now in the default menu** — `DEFAULT_CONTEXT_MENU_ITEMS` ends with a `note` entry. Without `@libregrid/notes` registered the factory resolves to nothing and the menu is unchanged (separator trimming); with it, cells gain _Add Note_ / _Edit Note_ + _Remove Note_ / _View Note_ (read-only) items.
  - **`@libregrid/all`** re-exports the notes module.

- 192f180: Calculated columns (gap-plan A2, Phase 18): read-only derived data columns with spreadsheet-style expressions. New `@libregrid/calculated-columns` package — the `calculatedColsSvc` + `formula` bean implementations over Community's v36.1.0 seams: bracket-reference expression engine with provided functions and formula error codes, dialog-created columns with anchor placement and Grid State persistence, menu contributions, edit highlighting and the four `calculatedColumn*` events. The accessible add/edit modal includes a visual token canvas, draggable and keyboard-insertable Columns/Functions/Operators/Values palettes, movable and removable expression pills, inline literal editing, a synchronized raw formula field, and live/deferred apply modes. `@libregrid/menu` gains the `calculatedColumn` (column menu) and `calculatedColumnRemove` (context menu) default stubs.
- 3a7c86d: P0 enterprise-parity batch: Row Numbers, live column/group header editing, Show Values As, SSRM row grouping, and the group-header column menu.

  - **New `@libregrid/row-numbers`** — the AG Grid Community row-number column with 1-based numbering, RTL lock, and the row-height resizer handle. Clicking a row number selects the whole visible row (the press is consumed by the row-numbers feature and recorded through the cell-selection range service).
  - **New `@libregrid/column-header-edit`** — inline `headerName` editing for `headerNameEditable` columns and column groups, in `live` (Enter commits) and `deferred` (Apply commits) modes, exposed as the `Edit Column Name` column-menu item.
  - **Column menu now accepts a column-group target** — right-clicking a group header opens the column menu with the `AgProvidedColumnGroup` as the menu target. Per-column items (sort, auto-size this column, column chooser, column filter) are hidden for group targets; grid-level items (auto-size all, reset columns) and group-capable items (edit column name) remain. `MenuActionParams.column` is widened to `Column | AgProvidedColumnGroup | null`.
  - **Show Values As** — `colDef.showValuesAsDef`, built-in number/currency/percent/scientific/bytes modes, grid-wide `defaultColDef` merging, the `Show Values As` column-menu item, and `setColumnShowValuesAs`/`getColumnsShowValuesAs` API.
  - **Server-Side Row Model row grouping** — row group/pivot support for SSRM (group by, aggregation, expand/contract, value-agg menu) so `@libregrid/row-grouping` works across row models.
  - **Cell selection** — the row-numbers feature owns the press on its column; a cell drag never starts from a row-number cell, so a row-number click selects the row instead of a single cell.
  - **`@libregrid/all`** re-exports the two new modules.

- 3a7c86d: Phase 16 — server-side selection for SSRM grids over very large data sets.

  - **New `@libregrid/server-side-selection`** — durable, spec-based row selection for AG Grid Community server-side row model grids. Registers a `selectionSvc` bean for SSRM (Community's `RowSelectionModule` gates its service to the client-side/infinite/viewport row models, so SSRM grids previously had no selection service and every selection gesture was a silent no-op). Adds the compact selection spec (`all` filter terms, `group` route terms, server-only exceptions/additions) captured from UI and API selection, debounced into small `applyOps` batches, and hydrated back onto the datasource cache via `resolveSelected`. Includes the footer (per-page + total counts, spec-level Select All / Deselect All, and the R6 "Show All Selected" selection view) and tab-isolated `{gridId}:{tabId}` identity.
  - **`@libregrid/server-side-row-model`** — the row model now keeps a per-node selection working copy: `getSsrmRoute` exposes a node's group route, `forEachNodeAfterFilter` walks the loaded-and-filtered set, node-creation sites call `updateRowSelectable`, `refreshStore` preserves and reapplies the working copy, `setDatasource` resets it, and evicted blocks purge their selection state so it is re-resolved from the spec on reload.
  - **`@libregrid/all`** re-exports the new module, services, and types.

  Selection semantics: terms accumulate (R1), survive filter changes (R2), exceptions override terms (R3), Select All (filtered) clears in-scope exceptions then appends the term (R4), groups are atomic both directions (R5), the selection view is `selected(spec) ∧ filterModel` with filters untouched (R6), and the header checkbox is viewport-only (R7). See `docs/phases/phase-16-server-side-selection.md`.

### Patch Changes

- Updated dependencies [f4d6a72]
- Updated dependencies [3a7c86d]
- Updated dependencies [02eb07e]
- Updated dependencies [192f180]
- Updated dependencies [c4c47ae]
- Updated dependencies [3a7c86d]
- Updated dependencies [3a7c86d]
  - @libregrid/batch-edit@1.2.0
  - @libregrid/notes@1.2.0
  - @libregrid/menu@1.2.0
  - @libregrid/advanced-filter@1.2.0
  - @libregrid/row-numbers@1.2.0
  - @libregrid/column-header-edit@1.2.0
  - @libregrid/cell-selection@1.2.0
  - @libregrid/row-grouping@1.2.0
  - @libregrid/server-side-selection@1.2.0
  - @libregrid/server-side-row-model@1.2.0
  - @libregrid/angular@1.2.0
  - @libregrid/clipboard@1.2.0
  - @libregrid/columns-tool-panel@1.2.0
  - @libregrid/core@1.2.0
  - @libregrid/excel-export@1.2.0
  - @libregrid/filters-tool-panel@1.2.0
  - @libregrid/find@1.2.0
  - @libregrid/integrated-charts@1.2.0
  - @libregrid/master-detail@1.2.0
  - @libregrid/material@1.2.0
  - @libregrid/multi-filter@1.2.0
  - @libregrid/pivot@1.2.0
  - @libregrid/rich-select@1.2.0
  - @libregrid/set-filter@1.2.0
  - @libregrid/side-bar@1.2.0
  - @libregrid/sparklines@1.2.0
  - @libregrid/status-bar@1.2.0
  - @libregrid/tree-data@1.2.0
  - @libregrid/viewport-row-model@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies [8735c38]
  - @libregrid/columns-tool-panel@1.1.1
  - @libregrid/core@1.1.1
  - @libregrid/material@1.1.1
  - @libregrid/advanced-filter@1.1.1
  - @libregrid/angular@1.1.1
  - @libregrid/cell-selection@1.1.1
  - @libregrid/clipboard@1.1.1
  - @libregrid/excel-export@1.1.1
  - @libregrid/filters-tool-panel@1.1.1
  - @libregrid/find@1.1.1
  - @libregrid/integrated-charts@1.1.1
  - @libregrid/master-detail@1.1.1
  - @libregrid/menu@1.1.1
  - @libregrid/multi-filter@1.1.1
  - @libregrid/pivot@1.1.1
  - @libregrid/rich-select@1.1.1
  - @libregrid/row-grouping@1.1.1
  - @libregrid/server-side-row-model@1.1.1
  - @libregrid/set-filter@1.1.1
  - @libregrid/side-bar@1.1.1
  - @libregrid/sparklines@1.1.1
  - @libregrid/status-bar@1.1.1
  - @libregrid/tree-data@1.1.1
  - @libregrid/viewport-row-model@1.1.1

## 1.1.0

### Minor Changes

- Re-export the new `ExcelExportModule` from `@libregrid/excel-export` (Phase 5).

### Patch Changes

- Updated dependencies [7312462]
- Updated dependencies [d3dee30]
- Updated dependencies [f93785a]
- Updated dependencies [dd13ee4]
- Updated dependencies [850d64f]
- Updated dependencies [51865cd]
- Updated dependencies [1dad6a3]
- Updated dependencies [1317045]
  - @libregrid/excel-export@1.1.0

## 1.0.1

### Patch Changes

- 1fe2b96: Rewrote every package README with install instructions, usage examples,
  and an API table, and added a LICENSE file to every package (previously
  only NOTICE and README shipped in the published tarball). No runtime
  behavior changed.
- Updated dependencies [1fe2b96]
  - @libregrid/advanced-filter@1.0.1
  - @libregrid/angular@1.0.1
  - @libregrid/cell-selection@1.0.1
  - @libregrid/clipboard@1.0.1
  - @libregrid/columns-tool-panel@1.0.1
  - @libregrid/core@1.0.1
  - @libregrid/filters-tool-panel@1.0.1
  - @libregrid/find@1.0.1
  - @libregrid/integrated-charts@1.0.1
  - @libregrid/master-detail@1.0.1
  - @libregrid/material@1.0.1
  - @libregrid/menu@1.0.1
  - @libregrid/multi-filter@1.0.1
  - @libregrid/pivot@1.0.1
  - @libregrid/rich-select@1.0.1
  - @libregrid/row-grouping@1.0.1
  - @libregrid/server-side-row-model@1.0.1
  - @libregrid/set-filter@1.0.1
  - @libregrid/side-bar@1.0.1
  - @libregrid/sparklines@1.0.1
  - @libregrid/status-bar@1.0.1
  - @libregrid/tree-data@1.0.1
  - @libregrid/viewport-row-model@1.0.1

## 1.0.0

### Major Changes

- a3b983c: Phase 13 — 1.0.0 release: parity audit, honest gap list, migration guide,
  bundle budgets with tree-shaking fixtures, dist purity checks, dependency and
  attribution CI checks, Angular signal ergonomics, the @libregrid/all barrel,
  accessibility fixes, and hardened CI across Chromium, Firefox and WebKit.

  Publication is externally owned: run the changesets release workflow from
  main and publish with npm provenance (--provenance) as documented in
  docs/phases/phase-13-hardening.md.

### Patch Changes

- Updated dependencies [4bad79b]
- Updated dependencies [4bad79b]
- Updated dependencies [4bad79b]
- Updated dependencies [4bad79b]
- Updated dependencies [4bad79b]
- Updated dependencies [f0d2329]
- Updated dependencies [81a990d]
- Updated dependencies [4bad79b]
- Updated dependencies [4bad79b]
- Updated dependencies [a3b983c]
- Updated dependencies [4bad79b]
- Updated dependencies [ee4f9cc]
- Updated dependencies [4bad79b]
- Updated dependencies [7aa7801]
- Updated dependencies [7aa7801]
- Updated dependencies [39bdeb0]
- Updated dependencies [1bbfdc5]
- Updated dependencies [1bbfdc5]
- Updated dependencies [985c5f9]
  - @libregrid/pivot@1.0.0
  - @libregrid/row-grouping@1.0.0
  - @libregrid/columns-tool-panel@1.0.0
  - @libregrid/material@1.0.0
  - @libregrid/advanced-filter@1.0.0
  - @libregrid/find@1.0.0
  - @libregrid/rich-select@1.0.0
  - @libregrid/cell-selection@1.0.0
  - @libregrid/clipboard@1.0.0
  - @libregrid/status-bar@1.0.0
  - @libregrid/server-side-row-model@1.0.0
  - @libregrid/viewport-row-model@1.0.0
  - @libregrid/menu@1.0.0
  - @libregrid/side-bar@1.0.0
  - @libregrid/set-filter@1.0.0
  - @libregrid/multi-filter@1.0.0
  - @libregrid/filters-tool-panel@1.0.0
  - @libregrid/tree-data@1.0.0
  - @libregrid/master-detail@1.0.0
  - @libregrid/core@1.0.0
  - @libregrid/integrated-charts@1.0.0
  - @libregrid/sparklines@1.0.0
  - @libregrid/angular@1.0.0
