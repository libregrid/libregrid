# ENTERPRISE-GAP-PLAN — ag-grid.com Enterprise features missing from LibreGrid

**Status:** LIVING DOCUMENT — refreshed for the **1.2.3** baseline (2026-08-23). Each
Class A item records its current state; shipped items are marked ✅ and moved to
§4a. Remaining items are the honest "what is left to implement" list.
**Date:** 2026-08-18 (initial research) · refreshed 2026-08-23 (1.2.3)
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
   2026-08-23 (published **1.2.3**).

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
| **Shipped with gaps** (Class B) | ~16 feature areas | `@libregrid/*` package exists; documented ❌/🟡 parity rows remain |
| **No counterpart** (Class A) | 3 feature areas | Enterprise on the site, no LibreGrid package and no parity coverage |
| **Not gaps — Community on the site** (Class D) | 14 feature areas | Stock `ag-grid-community` provides them; some older docs assumed Enterprise |
| **Out of scope / declined** (Class C) | 3 | PDF export, commercial chart types, licence key (N/A) |

Headline: the large structural features (row grouping, aggregation, pivoting,
SSRM, tree data, master/detail, tool panels, menus, clipboard, Excel export,
charts, sparklines, filters, find, cell selection) are already shipped. The
**Class A wave is nearly complete**: calculated columns, batch editing, cell
notes, row numbers, column header editing, show-values-as and the SSRM API
verification all shipped in Phases 14–18. The remaining missing surface is
**Formulas** (the largest), the **AI toolkit**, **group-value editing**, and
**group-row dragging**, plus a long tail of option-level gaps in shipped
packages.

---

## 3. Class A — Enterprise features with no LibreGrid counterpart

Each entry: site evidence (inventory §refs) → current state → proposed action.

### A1. Formulas — `FormulaModule` ⬜ **remaining**
- **Site:** 4 pages (`formulas`, `formula-editor-component`, `formula-reference`,
  `formula-custom-functions`) — spreadsheet-style cell expressions that update when
  referenced data changes; tokenising formula editor; operator/function reference;
  custom functions. Pricing row: Formulas = E. Inventory §8.
- **State:** no package. Note: plain cell *expressions* are Community; Formulas is
  the Enterprise add-on layer on top. **The expression engine shipped for
  calculated columns (Phase 18) is written to be reused here** — `formula` is the
  seam A1 extends with per-cell storage, and the function registry already exposes
  `getFunction`/`getFunctionNames` (see `docs/phases/phase-18-calculated-columns.md` §Notes).
- **Proposed:** new `@libregrid/formulas` package (formula engine + editor
  component + custom-function registry). Largest remaining Class A item.

### A2. Calculated Columns — `CalculatedColumnsModule` ✅ **shipped**
- **Site:** `calculated-columns` page; pricing row: Calculated Columns = E.
- **State:** ✅ **Shipped in Phase 18** — `@libregrid/calculated-columns`
  (`CalculatedColumns`); parity `docs/parity/calculated-columns.md` (26 ✅ / 6 🟡).
  Expression engine, dialog, menus, Grid State round-trip, events all implemented.
- **Remaining 🟡 (not gaps, noted in parity):** `dataTypes` validation, explicit
  `colId` gating, pivot-result integration, non-CSR row models, group-path display
  references, `SUMIF`/`COUNTIF` cell ranges (arrive with A1).

### A3. Batch Editing — `BatchEditModule` ✅ **shipped**
- **Site:** `batch-editing` page; pricing row: Batch Editing = E. Cell editing
  itself is **Community** (§5), so batch editing was the only editing gap.
- **State:** ✅ **Shipped in Phase 17** — `@libregrid/batch-edit` (`BatchEdit`);
  parity `docs/parity/batch-edit.md` (13 ✅ / 3 🟡 / 1 ❌). Registration layer over
  the Community edit service: `startBatchEdit`/`commitBatchEdit`/`cancelBatchEdit`/
  `isBatchEditing`, staged-cell highlights, cancel-revert of staged values.
- **Remaining ❌/🟡 (noted in parity):** SSRM batch editing ❌ (Enterprise is CSR
  only), single-undo-action grouping 🟡, custom-renderer refresh spec 🟡.

### A4. Cell Notes — `NotesModule` ✅ **shipped**
- **Site:** `notes` page; pricing row: Cell Notes = E.
- **State:** ✅ **Shipped in Phase 15** — `@libregrid/notes`; parity
  `docs/parity/cell-notes.md` (23 ✅ / 0 🟡). Hover/click/`Shift+F2` popups,
  read-only notes, `suppressNoteActions`, full-width row notes, runtime
  `notesDataSource` swap; the `note` context-menu token joins
  `DEFAULT_CONTEXT_MENU_ITEMS`.

### A5. Row Numbers — `RowNumbersModule` ✅ **shipped**
- **Site:** `row-numbers` page; pricing row: Row Numbers = E.
- **State:** ✅ **Shipped in Phase 14** — `@libregrid/row-numbers`; parity
  `docs/parity/row-numbers.md` (14 ✅ / 0 🟡). Row-number click selects the whole
  visible row; cell-selection never starts a drag from the column; row resizer
  included.

### A6. AI Toolkit — `AiToolkitModule` ⬜ **planned — Phase 19**
- **Site:** `ai-toolkit` page — LLM integration for grid state via natural
  language with structured outputs; pricing row: AI Toolkit = E. (The AI Features
  section's other two features — **MCP Server** and **AI Skills** — are
  **Community** on the site; not gaps.)
- **State:** planned in Phase 19 (docs-only research landed 2026-08-23). New
  `@libregrid/ai-toolkit` implements Community's reserved `getStructuredSchema`
  API slot (`gridApi.d.ts:1715`; dist stub) over the Community
  `GridStateModule` round-trip. Local-first inference (Cactus Needle 2 WASM,
  ADR 0006) with an opt-in OpenAI-compatible remote fallback. v1 scope:
  filter/sort/column visibility/reset; schema+state-only context. Design
  [`docs/design/ai-toolkit.md`](docs/design/ai-toolkit.md); phase
  [`docs/phases/phase-19-ai-toolkit.md`](docs/phases/phase-19-ai-toolkit.md);
  parity [`docs/parity/ai-toolkit.md`](docs/parity/ai-toolkit.md).

### A7. Column Header Editing — `ColumnHeaderEditModule` ✅ **shipped**
- **Site:** "Editable Header Name (e)" section on the `column-headers` page.
- **State:** ✅ **Shipped in Phase 14** — `@libregrid/column-header-edit`; parity
  `docs/parity/column-header-edit.md` (18 ✅ / 0 🟡). Group entry point is the
  group-header right-click context menu; per-column menu items hide for group
  targets.

### A8. Editing Group Values — `RowGroupingEditModule` ⬜ **remaining**
- **Site:** `grouping-editing` page ("Row Grouping - Editing Groups").
- **State:** `refreshAfterGroupEdit` still ❌ in `docs/parity/row-grouping.md`
  (rationale now **stale** — cell editing is Community stock, so the blocker no
  longer stands; the option simply has not been implemented).
- **Proposed:** fold into `@libregrid/row-grouping` (option + re-aggregation
  timing), no new package.

### A9. SSRM API module — `ServerSideRowModelApiModule` ✅ **closed**
- **Site:** flagged Enterprise in API metadata (inventory §7); the `ssrm-api`
  page documents the SSRM contract interfaces, which `@libregrid/server-side-row-model`
  implements (55 ✅ / 0 🟡 / 0 ❌).
- **State:** ✅ **Closed in Phase 14** — the v36.1.0 module's nine-method
  `_ServerSideRowModelGridApi` surface is fully exposed (no new code).

### A10. Show Values As — `ShowValuesAsModule` ✅ **shipped**
- **Site:** `aggregation-show-values-as` page — percent of grand total / parent
  group modes.
- **State:** ✅ **Completed in Phase 14** — `colDef.showValuesAsDef`, built-in
  modes, `showValuesAs` menu item, `setColumnShowValuesAs` API in
  `@libregrid/row-grouping`; parity `docs/parity/aggregation.md`.

### A11. Group Row Dragging — (grouping DnD) ⬜ **remaining**
- **Site:** `grouping-row-dragging` page (Enterprise) — reordering group rows by
  drag.
- **State:** **untracked** — no parity row exists and no package references the
  group-drag events (verified by source search 2026-08-18). Generic row DnD is
  Community stock; the group-row flavour is the Enterprise part.
- **Proposed:** add a parity row to `docs/parity/row-grouping.md`, then decide
  (likely post-1.0, pairs with the columns-panel drag long tail).

---

## 4. Class B — shipped packages with documented gaps

From `docs/parity/` (audited 2026-08-23). These are *not* "missing features" but
the residual ❌/🟡 rows inside them — included so the plan covers the full
"missing from our offerings" picture:

| Package | Gaps (❌ / 🟡) |
| --- | --- |
| `row-grouping` | sticky rows ❌ (`stickyRowSvc` never registered); `groupDisplayType` 🟡 (singleColumn only); group row renderer + params ❌; grand total row 🟡 (no `pinnedTop`/`pinnedBottom`); `groupHideColumnsUntilExpanded` ❌; `groupMaintainOrder` ❌; `groupLockGroupColumns` ❌; `groupHierarchyConfig` ❌; `suppressDragLeaveHidesColumns` ❌; `suppressGroupChangesColumnVisibility` ❌; `rowGroupPanelSuppressSort` ❌; `rowGroupOpened`/`expandOrCollapseAll` events ❌; group filter icon ❌; `refreshAfterGroupEdit` ❌ (A8) |
| `aggregation` (in row-grouping) | `suppressAggFuncInHeader` ❌; `aggregateOnlyChangedColumns` 🟡; show values as ✅ (A10, Phase 14) |
| `excel-export` | images ❌ (`addImageToCell`); tables ❌ (`exportAsExcelTable`); notes ❌ (`processNoteCallback`, `suppressGridNotesExport`, `suppressPrependAuthorToNotes`) — the 5.9 descoped set |
| `integrated-charts` | commercial chart types ❌ (polar / statistical / funnel — commercial AG Charts only; on the pricing page they are **Bundle-only**, see Class C) |
| `columns-tool-panel` | `allowDragFromColumnsToolPanel` ❌; `dragAndDropImageComponent(Params)` ❌; `rowGroupPanelSuppressSort` ❌ (drag long tail) |
| `menu` (context) | stubs not yet wired: pinRow/pinTop/pinBottom/unpinRow, expandAll/contractAll, copy/copyWithHeaders/copyWithGroupHeaders/cut/paste, csvExport/excelExport (note ✅ — Phase 15) |
| `menu` (column) | stubs: columnFilter, pinSubMenu, valueAggSubMenu, rowGroup/rowUnGroup/expandAll/contractAll opt-in (not in default set); editColumnName ✅ and calculatedColumn ✅ (Phase 14/18) |
| `cell-selection` | handle direction/reduction options 🟡 (deferred) |
| `multi-filter` | custom reactive display component 🟡 |
| `tree-data` | `treeDataChildrenField`/`treeDataParentIdField` 🟡 (blank leaf names); sticky rows ❌ |
| `pivot` | `pivotPanelSuppressSort` 🟡 (interactive sort) |
| `batch-edit` | SSRM batch editing ❌ (Enterprise is CSR only); single-undo-action grouping 🟡; `batchEditingStopped.changes` record shape 🟡; custom-renderer refresh spec 🟡 |
| `calculated-columns` | `dataTypes` validation 🟡; explicit `colId` gating 🟡; pivot-result integration 🟡; non-CSR row models 🟡; group-path display references 🟡; `SUMIF`/`COUNTIF` cell ranges 🟡 (arrive with A1) |
| `find` | no unresolved rows (toolbar ✅ since 1.1.0) |

---

## 4a. Class A items shipped since the original research (Phases 14–18)

| Item | Phase | Package | Parity |
| --- | --- | --- | --- |
| A2 Calculated Columns | 18 | `@libregrid/calculated-columns` | [`calculated-columns.md`](docs/parity/calculated-columns.md) |
| A3 Batch Editing | 17 | `@libregrid/batch-edit` | [`batch-edit.md`](docs/parity/batch-edit.md) |
| A4 Cell Notes | 15 | `@libregrid/notes` | [`cell-notes.md`](docs/parity/cell-notes.md) |
| A5 Row Numbers | 14 | `@libregrid/row-numbers` | [`row-numbers.md`](docs/parity/row-numbers.md) |
| A7 Column Header Editing | 14 | `@libregrid/column-header-edit` | [`column-header-edit.md`](docs/parity/column-header-edit.md) |
| A9 SSRM API verification | 14 | (closed — no new code) | `server-side-row-model.md` |
| A10 Show Values As completion | 14 | `@libregrid/row-grouping` | [`aggregation.md`](docs/parity/aggregation.md) |
| §7 doc-hygiene pass | 14 | (docs-only) | `gap-list.md` |

**Beyond parity (no Enterprise counterpart):** Phase 16 shipped
`@libregrid/server-side-selection` — durable spec-based SSRM selection
(`docs/phases/phase-16-server-side-selection.md`).

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

The toolbar shipped in **1.1.0** (`@libregrid/toolbar`, `docs/parity/toolbar.md`).
The original research found five stale rows; **all were corrected in Phase 14**
(2026-08-18/19): `find.md` + `pivoting.md` toolbar rows ✅, migration guide
post-1.0 list trimmed, phase-13 13A toolbar row marked shipped, `gap-list.md`
counts refreshed. The `percentOfParentColumnTotal` note was re-verified (it
describes our `showValuesAs` service, not the Enterprise baseline).

**Refresh 2026-08-23 (this document):** the stale rows this refresh corrected are
the Class A statuses above — A2/A3/A4/A5/A7/A9/A10 were still marked "no package"
in the original 2026-08-18 plan despite shipping in Phases 14–18. The remaining
Class A list is now exactly: A1 Formulas, A6 AI Toolkit, A8 group-value editing,
A11 group-row dragging.

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

## 9. Remaining priorities (proposal — needs decision)

Ordered by (value ÷ effort) and by unblocking existing stubs first:

**P0 — small, self-contained (candidates for the next release):**
1. A8 Group value editing — option + re-aggregation timing in `@libregrid/row-grouping`
   (stale blocker resolved; cell editing is Community stock).
2. A11 Group row dragging — add the parity row, then the drag surface (pairs with
   the columns-panel drag long tail).

**P1 — self-contained new packages:**
3. A1 Formulas — the largest remaining Class A item; the Phase 18 expression
   engine is the shared core (`formula` seam + function registry).

**P2 — strategic / larger (decide later):**
4. A6 AI toolkit.
5. Class B long tail: sticky rows, groupDisplayType modes, group row renderer,
   Excel images/tables/notes, columns-panel drag interactions, SSRM batch editing.

**Declined:** Class C items. **No work:** Class D items.

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
