# Phase 3 — Columns Tool Panel

**Status:** ✅ Complete — Columns Tool Panel implementation, docs, E2E, and Definition-of-Done verified 2026-08-13. The 0.1 publication operation remains externally owned.
**Depends on:** Phase 1 (side-bar host), Phase 2 (grouping, for the drop zones to act on)
**Blocks:** Phase 8 (pivot replaces the static placeholders with functional controls)

> ### 🚀 This phase ends with the **`0.1.0` public release**
>
> Phases 0–3 together are the first shipped version. Beyond this phase's own gate, see the **release criteria** at the end of this file.

**Package:** `@libregrid/columns-tool-panel` (`moduleName: 'ColumnsToolPanel'`)
**Parity:** [`../parity/columns-tool-panel.md`](../parity/columns-tool-panel.md)

---

## Context

Phase 2 made grouping work programmatically. This phase adds a framework-neutral DOM Columns tool panel.
The panel manages visibility, pinning, grouping, values, column order, search, and grouped column trees.

This phase proves the Phase 1 tool-panel host. The neutral panel uses native HTML drag as its fallback.
Labelled buttons provide the keyboard alternative. `@libregrid/material` decorates the same DOM and actions with Angular CDK drag-drop.

The Row Groups and Values sections are functional. The panel also shows static Pivot Mode and Column Labels sections.
These sections contain only the text `Available in Phase 8`. This phase does not ship a pivot toggle, pivot drop target, or pivot mutation.
The row-group panel builder can also create an inert `PivotDropZone` component.
Phase 3 does not mount this component in the Columns panel or the grid header.

Visibility, pinning, and column movement flow through public grid APIs and refresh the panel.

The package also owns the shared `showColumnChooser()` and `hideColumnChooser()` APIs. The chooser uses the same panel implementation.
The chooser hides Row Groups, Values, Pivot Mode, and Column Labels. It supports the `ColumnChooserParams` layout and suppression options.

`RowGroupingPanelModule` supplies the standalone row-group panel for `rowGroupPanelShow`.
It supports `always` and `onlyWhenGrouping`, removal, reorder buttons, native drops, and `functionsReadOnly`.

The following Phase 3 gaps remain explicit:

- Drag into the column-header area is not implemented. A drop cannot show, hide, or place a column in that area.
- `allowDragFromColumnsToolPanel` is not read. It does not block any native or CDK drag path.
- `dragAndDropImageComponent` and `dragAndDropImageComponentParams` are not implemented.
- `rowGroupPanelSuppressSort` is not implemented. The standalone row-group panel does not provide sort indicators or sort actions.
- Pivot behavior remains in Phase 8.
- Existing Row Groups and Values members cannot reorder inside the main Columns panel.
- `getState()` returns expansion state, but the panel does not restore `initialState` or persist state through the side-bar state.

---

## Todo

- [x] Bean `colToolPanelFactory`; register the panel with the Phase 1 side-bar host
- [x] Bean `colChooserFactory` — the column chooser popup (shared with the Phase 1 `columnChooser` menu item)
- [x] Column tree UI with groups, expand/collapse, checkbox visibility
- [x] Column search/filter box
- [x] Select-all / un-select-all widget
- [x] Drag to reorder columns
- [x] Drag from the panel into the column-header area — explicitly deferred to Phase 13 after a parity/bundle audit; Phase 3 keeps the accessible internal reorder and function-zone interactions
- [x] Row-group drop zone (functional)
- [x] Values drop zone (functional — aggregation)
- [x] Static Pivot Mode and Column Labels placeholders, labelled `Available in Phase 8`
- [x] Inert `PivotDropZone` builder product, not mounted in the panel or header
- [x] Functional pivot drop zone and pivot-mode toggle — explicitly owned by **Phase 8**; Phase 3 ships verified inert seams only
- [x] `ColumnsToolPanelParams`: `suppressColumnMove`, `suppressRowGroups`, `suppressValues`, `suppressPivots`, `suppressPivotMode`, `suppressColumnFilter`, `suppressColumnSelectAll`, `suppressColumnExpandAll`, `contractColumnSelection`, `suppressSyncLayoutWithGrid`, `buttons`
- [x] ColDef: `suppressColumnsToolPanel`, `toolPanelClass`
- [x] Grid option: `functionsReadOnly`
- [x] Grid options: `allowDragFromColumnsToolPanel`, `dragAndDropImageComponent`, `dragAndDropImageComponentParams`, `rowGroupPanelSuppressSort` — explicitly deferred to Phase 13; documented in parity with rationale
- [x] `IColumnToolPanel` API: `setPivotModeSectionVisible`, `setRowGroupsSectionVisible`, `setValuesSectionVisible`, `setPivotSectionVisible`, `expandColumnGroups`, `collapseColumnGroups`, `setColumnLayout`, `syncLayoutWithGrid`, `getState`
- [x] `iRowGroupPanelBuilder` — the standalone row-group panel above the grid (`rowGroupPanelShow`)
- [x] Material CDK drag-drop adapter in `@libregrid/material`

---

## Test plan

| Tier            | Coverage                                                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**        | Column tree construction, group-name search, section suppression, custom layout, mixed visibility, full-grid reorder indices, deferred state, factories, and drag-adapter registration |
| **Integration** | Panel registration, visibility, grouping, values, and standalone row-group-panel behavior                                                                                              |
| **E2E**         | Internal CDK reorder, native Row Groups and Values drops, checkbox visibility, search, chooser open/close, and labelled button actions                                                 |
| **a11y**        | Labelled buttons provide the keyboard alternative. Checkboxes are labelled. The tree exposes `aria-expanded`. Axe reports 0 violations in light and dark modes.                        |

**Specific edge cases to cover:**

- Column groups with mixed visibility (indeterminate checkbox state)
- `allowDragFromColumnsToolPanel` is not implemented. It does not affect internal reorder or Row Groups and Values drops.
- The option also does not block a native drop into the standalone row-group panel.
- Drag into the column-header area is not implemented.
- Dragging a column with `enableRowGroup: false` into the group zone must be rejected
- Panel state after `resetColumns`
- Reorder indices when `suppressColumnsToolPanel` excludes columns
- Select-all when search matches a group name
- Deferred state after an external grid API change

The completed test suite also covers chooser API ownership, adapter and side-bar cleanup, grid-event synchronization, mixed group visibility, excluded-column reorder indices, and group-name Select All.
The current suite does not include a direct `columnsReset` assertion.
It does not directly test eligibility rejection in either the standalone row-group zone or the main Columns-panel zone.
It does not directly test `suppressColumnFilter`, `suppressColumnSelectAll`, or three of the four section-visibility methods.
It also does not directly assert removal of the Columns panel's Grid API listeners during destruction.

---

## Acceptance criteria

- [x] Drag a column into the row-group drop zone → grid regroups immediately
- [x] Tool panel reorder, visibility and pinning round-trip correctly through column state
- [x] Values drop zone applies aggregation functions
- [x] Static Pivot Mode and Column Labels placeholders are visible and marked for Phase 8
- [x] Column chooser popup shared with the Phase 1 menu item — one implementation, not two
- [x] Keyboard-accessible alternative to drag-drop
- [x] `functionsReadOnly` prevents GUI mutation of grouping/pivot/aggregation
- [x] Parity checklist fully marked ✅/🟡/❌ with rationale
- [x] Full Definition of Done (`standards.md` §9) satisfied

The implemented scope passes the current automated gates. Header-area drag, custom drag images, and function-member reordering are explicit optional Phase 13 work; pivot remains Phase 8. They are not hidden Phase 3 debt.

## Shipped interface

### Modules and components

- `ColumnsToolPanelModule` registers the `columns` side-bar panel and the column chooser Grid API functions.
- `ColumnsToolPanel` implements the framework-neutral panel.
- `RowGroupingPanelModule` registers the standalone row-group panel.
- `RowGroupingPanel` renders that panel above the grid.

### Material adapter

`provideLibreGridMaterialTheme()` installs the Material menu renderer, side-bar renderer, and Columns tool-panel CDK adapter.
The service removes these adapters when Angular destroys the provider scope.

The CDK adapter decorates the neutral panel. It does not duplicate panel state or mutation rules.
It supports internal reorder and drops into Row Groups and Values.

The public `registerColumnsToolPanelDragDropAdapter()` seam permits another UI package to install a drag adapter.

### Framework-neutral fallback

The neutral panel uses native HTML drag for internal reorder and Row Groups or Values drops.
The same rows expose labelled move, group, value, remove, pin, and unpin buttons.

`suppressColumnMove` removes the native and CDK drag source from each column row.
This disables drag reorder and drag into Row Groups or Values. The labelled grouping and value buttons remain available.
`functionsReadOnly` blocks Row Groups and Values mutations in both panel surfaces.

### Column tree and state

The panel builds flat and nested trees from the current column definitions.
`suppressColumnsToolPanel` removes a column from the panel without changing its full-grid reorder index.

Search matches column labels and group labels. A group-label match includes all leaves in that group.
Select All and Unselect All operate on the current search result.

Group checkboxes show a mixed state when their leaf visibility differs.
`toolPanelClass` accepts a string, string array, or callback.

### Column chooser

`ColumnsToolPanelModule` owns `api.showColumnChooser(params?)` and `api.hideColumnChooser()`.
The `columnChooser` menu item appears only when the grid registers `ColumnsToolPanelModule`.
The menu item forwards the selected column's `columnChooserParams`.

The chooser supports `columnLayout`, `suppressSyncLayoutWithGrid`, `suppressColumnFilter`, `suppressColumnSelectAll`, `suppressColumnExpandAll`, and `contractColumnSelection`.
It always hides Row Groups, Values, Pivot Mode, and Column Labels.

The chooser uses a native modal DOM overlay. It does not use the shared PopupService.

### Apply and Cancel

The `apply` button enables deferred mode. The `cancel` button appears only when `apply` is also configured.
Deferred mode covers visibility and pinning.

Grouping and value changes are deferred when their setter APIs are available.
They remain immediate when a setter API is unavailable.
Column reorder remains immediate.

External grid events refresh the deferred snapshots. A later Apply does not overwrite a newer external change.

### Layout and state APIs

- `setColumnLayout(colDefs)` sets a custom panel layout.
- `syncLayoutWithGrid()` clears that custom layout unless `suppressSyncLayoutWithGrid` is true.
- `getState()` returns `expandedGroupIds`.
- `expandColumnGroups(groupIds?)` and `collapseColumnGroups(groupIds?)` update group expansion.
- The four section-visibility methods show or hide Row Groups, Values, Pivot Mode, and Column Labels.

`getState()` is retrieval-only in Phase 3. The panel ignores `initialState.expandedGroupIds`.
The side-bar state does not persist or restore this tool-panel state.

The main Columns panel can add and remove Row Groups and Values members.
It cannot reorder existing members. The standalone row-group panel has row-group reorder buttons.

### Standalone row-group panel

`RowGroupingPanelModule` registers the `AG-GRID-HEADER-DROP-ZONES` selector.
The panel renders only the row-group drop zone in Phase 3.

`rowGroupPanelShow: 'always'` keeps it visible. `onlyWhenGrouping` shows it only when a row-group column exists.
The `never` setting hides it.

The row-group zone supports remove and reorder buttons. It also accepts eligible native column drops.
`functionsReadOnly` disables its mutations.

The builder can create an inert Pivot drop-zone component for the Phase 8 seam.
The header does not mount this component in Phase 3.

### Lifecycle

The side-bar host destroys each panel instance when it is destroyed.
The Columns panel removes grid listeners and its drag adapter during destruction.
Adapter replacement cleans the previous attachment before it decorates the panel again.

### Packaging and evidence

- `@libregrid/columns-tool-panel` targets `ag-grid-community >=36.1.0 <37`.
- The package includes its README, NOTICE, generated version, Nx targets, and TypeScript build configuration.
- The package has a 47 KB unminified JavaScript budget. The last measured build was 45.0 KB.
- The last measured minified consumer fixture was 37.2 KB.
- The Phase 3 Changeset includes Core, Menu, Side Bar, Material, and Columns tool panel changes.
- The docs route covers the live Columns panel and chooser.
- The Playwright route has nine tests. These include light and dark axe checks.

---

## 🚀 `0.1.0` release criteria — additional to the phase gate above

Phases 0–3 constitute the first public release. Before tagging `0.1.0`:

- [ ] All of Phases 0, 1, 2 and 3 have their acceptance criteria met
- [ ] **Honest scope statement** in the README: what LibreGrid does today (grouping, aggregation, columns tool panel, menus, side bar, Material theming) and what it does **not** yet do (pivot, SSRM, tree data, master/detail, cell selection, clipboard, Excel export, filters, charts). Link the roadmap. **Do not imply parity that does not exist.**
- [ ] Quick-start works verbatim from a clean `npm i ag-grid-community @libregrid/row-grouping`
- [ ] Migration note for `ag-grid-enterprise` users covering the shipped features only
- [ ] All published packages carry `NOTICE` + README attribution (G3)
- [ ] npm scope `@libregrid` claimed and packages published with provenance
- [ ] Docs site live with a route per shipped feature
- [ ] Announcement copy reviewed against **G4.2** — official tagline, no prohibited phrasings
- [ ] Conformance matrix green across the supported `ag-grid-community` range
- [ ] Bundle sizes and benchmarks recorded as the 0.1 baseline

> **Set expectations honestly.** 0.1 is a useful subset, not a drop-in replacement for AG Grid Enterprise. Overstating scope at launch costs more credibility than a narrow but truthful release ever will.
