# Gap List

Every ✅/🟡/❌ verdict lives in the per-domain checklists under [`docs/parity/`](.).
This page is the honest, prominent summary — read it before adopting LibreGrid, and
always re-check the domain file for the exact option-level notes.

Audited 2026-08-14; counts refreshed 2026-08-20 against the domain files. Legend: ✅ done+tested · 🟡 partial (note names the missing part) · ❌ not shipped (rationale in the domain file).

## The headline gaps

1. **Excel export ships, minus three optional sub-features.** Phase 5 delivered the
   OOXML writer and the full export API; sub-PR 5.9 was descoped, so cell images
   (`addImageToCell`), Excel tables (`exportAsExcelTable`) and cell notes are ❌ with
   rationale (see [`excel-export.md`](excel-export.md)).
2. **PDF export is not planned.** No equivalent of AG Grid Enterprise's PDF export;
   documented as out of scope (see the 13A long-tail list below).
3. **Charts are built on MIT ag-charts-community.** Chart types that exist only in the
   commercial AG Charts are ❌ with the rationale "not available in ag-charts-community;
   would require reimplementing a commercial charting product" (see [`integrated-charts.md`](integrated-charts.md)).
4. **Sticky group/total rows are not implemented** (the sticky-row service is never
   registered). Group and total rows render correctly but scroll normally
   (see [`row-grouping.md`](row-grouping.md)).
5. **Drag-and-drop long-tail items** in the columns tool panel are post-1.0: dragging
   into the column-header area, custom drag images, and in-panel function-member
   reordering (see [`columns-tool-panel.md`](columns-tool-panel.md)).

## Post-1.0 candidates (phase-13 13A)

Documented as optional long-tail work, only shipped if justified after a clean audit:

- RowNumbers module
- Notes module
- Column header editing
- Toolbar (hosts Find and pivot-panel items)
- testIdSvc (test-ID service)
- PDF export — only if warranted; otherwise out of scope
- Sticky group/total rows
- Columns-panel header-area drag target, custom drag-image component, function-member reordering
- rowGroupPanelSuppressSort alongside a real row-group sorting surface

## Per-domain summary

| Domain | ✅ | 🟡 | ❌ | File |
| --- | --- | --- | --- | --- |
| Row grouping | 50 | 7 | 21 | [`row-grouping.md`](row-grouping.md) |
| Aggregation | 28 | 9 | 2 | [`aggregation.md`](aggregation.md) |
| Pivoting | 22 | 2 | 1 | [`pivoting.md`](pivoting.md) |
| Server-side row model | 49 | 0 | 0 | [`server-side-row-model.md`](server-side-row-model.md) |
| Viewport row model | 15 | 0 | 0 | [`viewport-row-model.md`](viewport-row-model.md) |
| Tree data | 15 | 2 | 1 | [`tree-data.md`](tree-data.md) |
| Master / detail | 16 | 0 | 0 | [`master-detail.md`](master-detail.md) |
| Cell selection | 19 | 5 | 0 | [`cell-selection.md`](cell-selection.md) |
| Clipboard | 31 | 4 | 0 | [`clipboard.md`](clipboard.md) |
| Status bar | 25 | 0 | 0 | [`status-bar.md`](status-bar.md) |
| Set filter | 42 | 1 | 0 | [`set-filter.md`](set-filter.md) |
| Multi filter | 15 | 6 | 0 | [`multi-filter.md`](multi-filter.md) |
| Filters tool panel | 28 | 0 | 0 | [`filters-tool-panel.md`](filters-tool-panel.md) |
| Advanced filter | 35 | 0 | 0 | [`advanced-filter.md`](advanced-filter.md) |
| Find | 26 | 0 | 1 | [`find.md`](find.md) |
| Rich select | 9 | 0 | 0 | [`rich-select.md`](rich-select.md) |
| Context menu | 25 | 20 | 0 | [`context-menu.md`](context-menu.md) |
| Column menu | 27 | 18 | 0 | [`column-menu.md`](column-menu.md) |
| Side bar | 31 | 0 | 0 | [`side-bar.md`](side-bar.md) |
| Columns tool panel | 46 | 2 | 4 | [`columns-tool-panel.md`](columns-tool-panel.md) |
| Integrated charts | 54 | 1 | 3 | [`integrated-charts.md`](integrated-charts.md) |
| Sparklines | 4 | 0 | 0 | [`integrated-charts.md`](integrated-charts.md) — Sparklines section |
| Excel export | 60 | 8 | 5 | [`excel-export.md`](excel-export.md) — shipped; images, tables and notes descoped (5.9) |
| Batch edit | 14 | 0 | 0 | [`batch-edit.md`](batch-edit.md) |
| Calculated columns | 26 | 6 | 0 | [`calculated-columns.md`](calculated-columns.md) |

The menu domains carry the most 🟡 rows: their checklists track per-item state, and each 🟡
names the exact missing item. Read the domain file before treating a 🟡 count as a
feature-sized gap.

