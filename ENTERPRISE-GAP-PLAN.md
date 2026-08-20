# ENTERPRISE-GAP-PLAN — ag-grid.com Enterprise features missing from LibreGrid

**Status:** PROPOSAL — research complete, no implementation decisions made
**Date:** 2026-08-18
**Companion to:** [`LIBREGRID-PLAN.md`](LIBREGRID-PLAN.md) (master plan) — this is a
strategic inventory of *what is missing*, not a numbered phase. Per repo convention:
each item below becomes a phase file only after it is chosen.

---

## 1. What was done, and where the evidence lives

Two sources are cross-referenced throughout:

1. **The site** — a full fetch of ag-grid.com's Angular docs (296 pages, all
   HTTP 200, docs **version 36.1.0** — the same baseline LibreGrid peers on,
   `ag-grid-community >=36.1.0 <37`) plus the licence-pricing page. How the site
   marks Enterprise (per-page `isEnterprise` flags, nav tree, `(e)` badges,
   API-metadata module flags) and the full result — 154 enterprise pages,
   141 community pages, 32 enterprise modules, 65-row pricing comparison —
   are recorded with citations in
   [`docs/reference/ag-grid-site-inventory.md`](docs/reference/ag-grid-site-inventory.md).
2. **This repo** — the per-feature parity tables in `docs/parity/` (status legend
   ⬜/✅/🟡/❌), `docs/parity/gap-list.md`, `docs/guides/migration-guide.md`, and
   `docs/phases/phase-13-hardening.md` (13A post-1.0 list), audited as of
   2026-08-15 (published `1.1.1`).

**Scope rule applied:** a feature counts as "missing" only if the *site* (v36.1.0)
classifies it Enterprise **and** LibreGrid has no working counterpart. Features the
site classifies Community are not gaps even if older repo documents assumed
otherwise (§5 corrects several of those assumptions).

Guardrail G2 held throughout: nothing was installed from or read out of
`ag-grid-enterprise`; all classification comes from the public site.

---

## 2. Summary

Of the site's Enterprise surface (32 enterprise modules / 154 docs pages, grouped
into ~25 feature areas):

| Bucket | Count | Meaning |
| --- | --- | --- |
| **Shipped with gaps** (Class B) | ~14 feature areas | `@libregrid/*` package exists; documented ❌/🟡 parity rows remain |
| **No counterpart** (Class A) | 11 feature areas | Enterprise on the site, no LibreGrid package and no parity coverage |
| **Not gaps — Community on the site** (Class D) | 14 feature areas | Stock `ag-grid-community` provides them; some older docs assumed Enterprise |
| **Out of scope / declined** (Class C) | 3 | PDF export, commercial chart types, licence key (N/A) |

Headline: the large structural features (row grouping, aggregation, pivoting,
SSRM, tree data, master/detail, tool panels, menus, clipboard, Excel export,
charts, sparklines, filters, find, cell selection) are already shipped. The
remaining missing surface is mostly **cell-level productivity features**
(formulas, calculated columns, batch editing, notes, row numbers, header editing,
group editing, AI toolkit) plus a long tail of option-level gaps in shipped
packages.

---

## 3. Class A — Enterprise features with no LibreGrid counterpart

Each entry: site evidence (inventory §refs) → current state → proposed action.
All proposals are pending user decision.

### A1. Formulas — `FormulaModule`
- **Site:** 4 pages (`formulas`, `formula-editor-component`, `formula-reference`,
  `formula-custom-functions`) — spreadsheet-style cell expressions that update when
  referenced data changes; tokenising formula editor; operator/function reference;
  custom functions. Pricing row: Formulas = E. Inventory §8.
- **State:** no package. Note: plain cell *expressions* are Community; Formulas is
  the Enterprise add-on layer on top.
- **Proposed:** new `@libregrid/formulas` package (formula engine + editor
  component + custom-function registry). Largest Class A item.

### A2. Calculated Columns — `CalculatedColumnsModule`
- **Site:** `calculated-columns` page; pricing row: Calculated Columns = E.
- **State:** no package.
- **Proposed:** new `@libregrid/calculated-columns`. Natural first stop in the
  "derived data" family (pairs with A1/A3).

### A3. Batch Editing — `BatchEditModule`
- **Site:** `batch-editing` page; pricing row: Batch Editing = E. Cell editing
  itself is **Community** (§5), so batch editing is the only editing gap.
- **State:** no package.
- **Proposed:** new `@libregrid/batch-edit` (queue/apply/discard semantics per
  the docs page). Builds on stock Community editing — no editing engine work needed.

### A4. Cell Notes — `NotesModule`
- **Site:** `notes` page; pricing row: Cell Notes = E.
- **State:** no package; already tracked as a post-1.0 candidate
  (`gap-list.md`, migration guide); the context-menu `note` item is a registered
  stub in `@libregrid/menu` (stubs listed in `docs/parity/context-menu.md`).
- **Proposed:** new `@libregrid/notes`; wires the existing menu stub.

### A5. Row Numbers — `RowNumbersModule`
- **Site:** `row-numbers` page; pricing row: Row Numbers = E.
- **State:** no package; tracked post-1.0 candidate.
- **Proposed:** new `@libregrid/row-numbers`. Small, self-contained.

### A6. AI Toolkit — `AiToolkitModule`
- **Site:** `ai-toolkit` page — LLM integration for grid state via natural
  language with structured outputs; pricing row: AI Toolkit = E. (The AI Features
  section's other two features — **MCP Server** and **AI Skills** — are
  **Community** on the site; not gaps.)
- **State:** no package; tracked post-1.0 candidate.
- **Proposed:** new `@libregrid/ai-toolkit`. Strategic item; scope depends on the
  documented API surface.

### A7. Column Header Editing — `ColumnHeaderEditModule`
- **Site:** "Editable Header Name (e)" section on the `column-headers` page.
- **State:** no package; tracked post-1.0; `editColumnName` column-menu item is a
  registered stub (`docs/parity/column-menu.md`).
- **Proposed:** new `@libregrid/column-header-edit`. Small; unblocks the menu stub.

### A8. Editing Group Values — `RowGroupingEditModule`
- **Site:** `grouping-editing` page ("Row Grouping - Editing Groups").
- **State:** `refreshAfterGroupEdit` ❌ in `docs/parity/row-grouping.md`. Its
  recorded rationale — "LibreGrid has no cell-editing feature yet" — is now
  **stale**: cell editing is Community stock (§5), so the blocker no longer
  stands.
- **Proposed:** fold into `@libregrid/row-grouping` (option + re-aggregation
  timing), no new package.

### A9. SSRM API module — `ServerSideRowModelApiModule`
- **Site:** flagged Enterprise in API metadata (inventory §7); the `ssrm-api`
  page documents the SSRM contract interfaces, which `@libregrid/server-side-row-model`
  implements (49 ✅ / 0 🟡 / 0 ❌).
- **State:** no separate package, but the documented interface surface appears
  covered by the SSRM package.
- **Proposed:** **verify and close** — confirm the v36.1.0 API module exposes
  nothing beyond the already-implemented contract; if not, a thin seam or a
  documented "provided by stock" note. Cheapest Class A item.

### A10. Show Values As — `ShowValuesAsModule` (partial)
- **Site:** `aggregation-show-values-as` page — percent of grand total / parent
  group modes.
- **State:** implemented in `@libregrid/row-grouping` but 🟡: no `modes`
  configuration and not wired into `@libregrid/menu`'s column menu
  (`docs/parity/aggregation.md`).
- **Proposed:** complete the 🟡 (add modes, register the menu item) — no new package.

### A11. Group Row Dragging — (grouping DnD)
- **Site:** `grouping-row-dragging` page (Enterprise) — reordering group rows by
  drag.
- **State:** **untracked** — no parity row exists and no package references the
  group-drag events (verified by source search 2026-08-18). Generic row DnD is
  Community stock; the group-row flavour is the Enterprise part.
- **Proposed:** add a parity row to `docs/parity/row-grouping.md`, then decide
  (likely post-1.0, pairs with the columns-panel drag long tail).

---

## 4. Class B — shipped packages with documented gaps

From `docs/parity/` (audited 2026-08-15). These are *not* "missing features" but
the residual ❌/🟡 rows inside them — included so the plan covers the full
"missing from our offerings" picture:

| Package | Gaps (❌ / 🟡) |
| --- | --- |
| `row-grouping` | sticky rows ❌ (`stickyRowSvc` never registered); `groupDisplayType` 🟡 (singleColumn only); group row renderer + params ❌; grand total row 🟡 (no `pinnedTop`/`pinnedBottom`); `groupHideColumnsUntilExpanded` ❌; `groupMaintainOrder` ❌; `groupLockGroupColumns` ❌; `groupHierarchyConfig` ❌; `suppressDragLeaveHidesColumns` ❌; `suppressGroupChangesColumnVisibility` ❌; `rowGroupPanelSuppressSort` ❌; `rowGroupOpened`/`expandOrCollapseAll` events ❌; group filter icon ❌ |
| `aggregation` (in row-grouping) | `suppressAggFuncInHeader` ❌; `aggregateOnlyChangedColumns` 🟡; show values as 🟡 (see A10); `percentOfParentColumnTotal` note says "no pivot support" — **needs re-verification**, pivot shipped in Phase 8 |
| `excel-export` | images ❌ (`addImageToCell`); tables ❌ (`exportAsExcelTable`); notes ❌ (`processNoteCallback`, `suppressGridNotesExport`, `suppressPrependAuthorToNotes`) — the 5.9 descoped set |
| `integrated-charts` | commercial chart types ❌ (polar / statistical / funnel — commercial AG Charts only; on the pricing page they are **Bundle-only**, see Class C) |
| `columns-tool-panel` | `allowDragFromColumnsToolPanel` ❌; `dragAndDropImageComponent(Params)` ❌; `rowGroupPanelSuppressSort` ❌ (drag long tail) |
| `menu` (context) | stubs not yet wired: pinRow/pinTop/pinBottom/unpinRow, expandAll/contractAll, copy/copyWithHeaders/copyWithGroupHeaders/cut/paste, csvExport/excelExport, note |
| `menu` (column) | stubs: columnFilter, pinSubMenu, editColumnName (post-1.0), calculatedColumn; rowGroup/rowUnGroup/expandAll/contractAll/valueAggSubMenu opt-in (not in default set) |
| `cell-selection` | handle direction/reduction options 🟡 (deferred) |
| `multi-filter` | custom reactive display component 🟡 |
| `tree-data` | `treeDataChildrenField`/`treeDataParentIdField` 🟡 (blank leaf names); sticky rows ❌ |
| `pivot` | `pivotPanelSuppressSort` 🟡 (interactive sort) |
| `find` | its single ❌ row is **stale** (`toolbar` — shipped; see §7) |

---

## 5. Class D — NOT gaps: features the site classifies Community (v36.1.0)

Older planning material in this repo assumed some of these were Enterprise. The
site's own v36.1.0 flags (inventory §9, "Previously-Enterprise features now
Community") say otherwise. **No LibreGrid work is required** for these — stock
`ag-grid-community` provides them, and LibreGrid must not imply otherwise in docs:

- **Cell editing** (all provided editors, full-row, validation)
- **Row dragging / drag & drop** (general, managed, unmanaged, external dropzone,
  between grids) — the *group* and *tree* row-dragging pages are the Enterprise
  ones (tree data DnD is already ✅ in LibreGrid; group row drag is A11)
- **Column spanning** and **row spanning**
- **Printing**
- **Excel import** (CSV export is also Community)
- **Undo / Redo edits**
- **Value cache**
- **Infinite Row Model**
- **Aligned grids**
- **Reference data**
- **Touch support**
- **MCP Server** and **AI Skills** (only the AI Toolkit is Enterprise)
- **Cell expressions** (only the Formulas feature is Enterprise)
- Basic SSRM operations (sorting/filtering/selection/pagination rows on the
  pricing page are Community; the SSRM *model* and its advanced operations are
  Enterprise)

---

## 6. Class C — out of scope / declined (site-confirmed)

| Feature | Site status | Decision on record |
| --- | --- | --- |
| PDF export | Not offered on the site (no page, no pricing row) | Not planned (migration guide) — stays declined |
| Commercial AG Charts chart types (polar / statistical / funnel) | Pricing page: AG Charts Enterprise and Integrated Charts are **Enterprise-Bundle-only** | Declined — commercial product surface, outside the community-equivalent scope |
| Installing a licence key | Enterprise docs page (`license-install`) | N/A — LibreGrid has no licence gate by design |

---

## 7. Doc hygiene — stale notes this research surfaced

The toolbar shipped in **1.1.0** (`@libregrid/toolbar`, `docs/parity/toolbar.md`
audited 2026-08-15: `toolbar` option ✅ and all built-in items ✅; only
`toolbarItem` registered-name lookup 🟡), but several documents still call it
❌ / post-1.0:

1. `docs/parity/find.md:15` — `toolbar` ❌ row (stale; also inflates the gap-list
   find count to "1 ❌").
2. `docs/parity/pivoting.md:17` — `agPivotPanelToolbarItem` ❌ row (stale).
3. `docs/guides/migration-guide.md` — "Notes, RowNumbers, **Toolbar**, AI toolkit
   — post-1.0 candidates" (Toolbar part stale).
4. `docs/phases/phase-13-hardening.md` 13A — `Toolbar` listed under
   `[x] ❌ post-1.0`.
5. `docs/parity/gap-list.md` — 13A list omits the shipped toolbar; per-domain
   counts inherit the stale rows.

Also: `docs/parity/aggregation.md` `percentOfParentColumnTotal` note ("no pivot
support") predates the Phase 8 pivot package — re-verify.

**Proposed action:** a docs-only pass correcting items 1–5 and re-verifying the
aggregation note. No code.

**Done in Phase 14 (P0-1), 2026-08-18/19.** Items 1–5 corrected as listed
(`find.md` + `pivoting.md` toolbar rows ✅, migration guide post-1.0 list
trimmed to Notes/AI toolkit, phase-13 13A toolbar row marked shipped,
`gap-list.md` counts + 13A list refreshed). The `percentOfParentColumnTotal`
note lives in the Show Values As section of `docs/parity/row-grouping.md`
(referenced from `aggregation.md`): re-verified — it describes **our**
`showValuesAs` service, not the Enterprise baseline; the service does not
compute pivot-axis totals, so the mode reports `applicability: 'hide'` outside
pivot (omitted from the menu) and `'inapplicable'` inside, with `isApplying`
`false` so cells show the raw value.

---

## 8. Angular story — site vs LibreGrid (context, not a gap)

The site's Angular getting started (inventory §2) is: `npm install
ag-grid-angular` → `ModuleRegistry.registerModules([AllCommunityModule])` →
standalone component with `imports: [AgGridAngular]` and
`<ag-grid-angular [rowData] [columnDefs]>`. Feature parity comes from registering
Enterprise modules from `ag-grid-enterprise`.

LibreGrid's Angular story is the same registration mechanism with
`@libregrid/*` modules instead of the enterprise package, plus
`provideLibreGrid()` / `createGridApiSignals()` typed helpers and the Material
theme bridge (`docs/guides/migration-guide.md` maps module → module). The site's
Angular docs make no reference to LibreGrid (expected). No action required; noted
so the plan is complete on the page the user asked about.

---

## 9. Proposed priorities (proposal — needs decision)

Ordered by (value ÷ effort) and by unblocking existing stubs first:

**P0 — small, unblocks stubs and docs (candidates for the next release):**

**Shipped — Phase 14 (`docs/phases/phase-14-p0-batch.md`), 2026-08-18/19:**
1. ✅ §7 doc-hygiene pass (docs-only) — items 1–5 corrected, aggregation note re-verified.
2. ✅ A9 SSRM API verification — closed with a note: the v36.1.0 module's nine-method
   `_ServerSideRowModelGridApi` surface is fully exposed (no new code).
3. ✅ A7 Column header editing — new `@libregrid/column-header-edit`; group entry point
   is the group-header right-click context menu (Community v36 renders no group menu
   button), per-column menu items hide for group targets.
4. ✅ A5 Row numbers — new `@libregrid/row-numbers`; row-number click selects the
   whole visible row; cell-selection never starts a drag from the column; row resizer
   included.
5. ✅ A10 Show values as completion — `colDef.showValuesAsDef`, built-in modes,
   `showValuesAs` menu item, `setColumnShowValuesAs` API in `@libregrid/row-grouping`.
6. ✅ Context-menu clipboard/export wiring — clipboard and Excel-export items resolve
   through the menu registry when their modules are registered.

New lockstep version: 1.2.0 (pending changeset consumption).

**Shipped — Phase 15 (`docs/phases/phase-15-cell-notes.md`), 2026-08-19:**
8. ✅ A4 Cell notes — new `@libregrid/notes`; hover/click/`Shift+F2` note
   popups, read-only notes, `suppressNoteActions`, full-width row notes,
   runtime `notesDataSource` swap; the `note` context-menu token joins
   `DEFAULT_CONTEXT_MENU_ITEMS` (resolves to nothing without the module).

**P1 — self-contained new packages (post-1.0 wave):**
7. A2 Calculated columns.
8. ✅ A4 Cell notes (unblocks `note` menu stub) — shipped in Phase 15.
9. A3 Batch editing (pure add-on to Community editing).
10. A8 Group value editing (option in `row-grouping`; stale blocker resolved).
11. A1 Formulas (larger: engine + editor + custom functions).

**P2 — strategic / larger (decide later):**
12. A6 AI toolkit.
13. A11 Group row dragging (after parity row is added).
14. Class B long tail: sticky rows, groupDisplayType modes, group row renderer,
    Excel images/tables/notes, columns-panel drag interactions.

**Declined:** Class C items. **No work:** Class D items (docs-only if anything —
see §7).

---

## 10. Guardrails and next steps

- **G2:** no `ag-grid-enterprise` inspection/install at any stage of Class A work —
  implementations follow the public docs (and the inventory citations).
- **Version drift:** all classifications are for docs v36.1.0 fetched 2026-08-18.
  Re-run the inventory fetch (method in inventory §1) when the baseline moves.
- **Convention:** per `LIBREGRID-PLAN.md`, this plan is silent on which items to
  build and in what order beyond the proposal in §9 — **stop and ask**. Each
  chosen item gets its own `docs/phases/phase-NN-*.md` with the standard
  Status / Depends on / Blocks / Packages / Parity / Todo header before work starts.
