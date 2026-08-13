# Phase 3 — Columns Tool Panel

**Status:** 🟡 In progress
**Depends on:** Phase 1 (side-bar host), Phase 2 (grouping, for the drop zones to act on)
**Blocks:** Phase 8 (pivot activates the inert pivot controls)

> ### 🚀 This phase ends with the **`0.1.0` public release**
> Phases 0–3 together are the first shipped version. Beyond this phase's own gate, see the **release criteria** at the end of this file.

**Package:** `@libregrid/columns-tool-panel` (`moduleName: 'ColumnsToolPanel'`)
**Parity:** [`../parity/columns-tool-panel.md`](../parity/columns-tool-panel.md)

---

## Context

Phase 2 made grouping work programmatically. This phase now ships a framework-neutral DOM columns tool panel for visibility, grouping, and aggregation. Pivot controls are present only as visibly inert Phase 8 placeholders.

It is the first real tool panel, so it proves the Phase 1 registration host. The neutral implementation uses native HTML drag as its fallback, with labelled buttons as the keyboard alternative. `@libregrid/material` decorates the same DOM and actions with Angular CDK drag-drop. Dragging from the panel onto the grid header remains unshipped.

Values controls are functional. Pivot sections and the header pivot-zone builder are present but inert until Phase 8 registers pivot; no pivot mutation behavior is shipped.

Visibility, pinning, and column movement flow through public grid APIs and refresh the panel.

---

## Todo

- [x] Bean `colToolPanelFactory`; register the panel with the Phase 1 side-bar host
- [x] Bean `colChooserFactory` — the column chooser popup (shared with the Phase 1 `columnChooser` menu item)
- [x] Column tree UI with groups, expand/collapse, checkbox visibility
- [x] Column search/filter box
- [x] Select-all / un-select-all widget
- [x] Drag to reorder columns
- [ ] Drag from panel onto the grid
- [x] Row-group drop zone (functional)
- [x] Values drop zone (functional — aggregation)
- [x] Pivot drop zone + pivot-mode toggle (**inert until Phase 8**)
- [x] `ColumnsToolPanelParams`: `suppressColumnMove`, `suppressRowGroups`, `suppressValues`, `suppressPivots`, `suppressPivotMode`, `suppressColumnFilter`, `suppressColumnSelectAll`, `suppressColumnExpandAll`, `contractColumnSelection`, `suppressSyncLayoutWithGrid`, `buttons`
- [x] ColDef: `suppressColumnsToolPanel`, `toolPanelClass`
- [x] Grid option: `functionsReadOnly`
- [ ] Grid options: `allowDragFromColumnsToolPanel`, `dragAndDropImageComponent`, `dragAndDropImageComponentParams`
- [x] `IColumnToolPanel` API: `setPivotModeSectionVisible`, `setRowGroupsSectionVisible`, `setValuesSectionVisible`, `setPivotSectionVisible`, `expandColumnGroups`, `collapseColumnGroups`, `setColumnLayout`
- [x] `iRowGroupPanelBuilder` — the standalone row-group panel above the grid (`rowGroupPanelShow`)
- [x] Material CDK drag-drop adapter in `@libregrid/material`

---

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Column tree construction from flat and grouped `columnDefs`. Search filtering incl. group names. `suppress*` params each hide the right section. `setColumnLayout` with a custom arrangement |
| **Integration** | Dragging a column into the row-group zone triggers regrouping. Removing it ungroups. Panel visibility toggles round-trip through column state. `functionsReadOnly` blocks GUI changes but not API changes. `suppressSyncLayoutWithGrid` decouples panel order from grid order |
| **E2E** | Full drag-drop: panel → row-group zone; reorder within the panel; panel → grid header. Checkbox toggles hide/show columns. Expand/collapse column groups. Select-all behaves with a search filter active |
| **a11y** | Labelled buttons provide the keyboard alternative to native drag-drop. Checkboxes labelled; tree exposes `aria-expanded`; axe 0 violations light + dark |

**Specific edge cases to cover:**
- Column groups with mixed visibility (indeterminate checkbox state)
- `allowDragFromColumnsToolPanel: false` blocks drag onto the grid but not internal reorder
- Dragging a column with `enableRowGroup: false` into the group zone must be rejected
- Panel state after `resetColumns`

---

## Acceptance criteria

- [x] Drag a column into the row-group drop zone → grid regroups immediately
- [x] Tool panel reorder, visibility and pinning round-trip correctly through column state
- [x] Values drop zone applies aggregation functions
- [x] Pivot drop zone and pivot-mode toggle present and visibly inert (documented as pending Phase 8)
- [x] Column chooser popup shared with the Phase 1 menu item — one implementation, not two
- [x] Keyboard-accessible alternative to drag-drop
- [x] `functionsReadOnly` prevents GUI mutation of grouping/pivot/aggregation
- [x] Parity checklist fully marked ✅/🟡/❌ with rationale
- [ ] Full Definition of Done (`standards.md` §9) satisfied

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
