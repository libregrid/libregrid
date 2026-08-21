# @libregrid/menu

## 1.2.1

### Patch Changes

- b6836f0: Fix context and column submenus closing the instant they are hovered.

  Menus are `position: absolute`, so anything that moves the document — a page
  scroll, a `scroll-behavior: smooth` animation, a late popup re-position — slides
  the menu out from under a stationary pointer. The browser then fires
  `mouseleave`/`mouseenter` with no user intent behind them, which cancelled the
  pending submenu open or destroyed an open submenu with no way to reopen it. The
  symptom was intermittent: the submenu flashed open and vanished, or never
  appeared, depending on whether something happened to move the menu.

  Enter/leave events are now checked against the menu's position at the last real
  pointer movement, so only genuine pointer movement opens and closes submenus.
  Deliberate hover-out still closes them as before.

- @libregrid/core@1.2.1

## 1.2.0

### Minor Changes

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

### Patch Changes

- c4c47ae: Fix: right-clicking a column header opened the LibreGrid header context menu underneath the browser's native context menu. The header context-menu path now suppresses the native menu when the LibreGrid menu opens (a `suppressHeaderContextMenu` header still keeps the browser default).
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

- f0d2329: Add context and column menus, a resizable side-bar host, and Material theme integration for AG Grid Community.
- ee4f9cc: Add the Columns tool panel, shared column chooser, standalone row-group panel, and Material CDK drag-drop adapter.

### Patch Changes

- 4bad79b: Enforce column-level suppression of header menus, header filter popups, and
  header context menus, and record the completed Phase 1 closeout.
- Updated dependencies [a3b983c]
- Updated dependencies [ee4f9cc]
- Updated dependencies [7aa7801]
  - @libregrid/core@1.0.0
