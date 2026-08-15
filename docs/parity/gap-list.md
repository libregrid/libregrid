# Gap List

Every ✅/🟡/❌ verdict lives in the per-domain checklists under [`docs/parity/`](.).
This page is the honest, prominent summary — read it before adopting LibreGrid, and
always re-check the domain file for the exact option-level notes.

Audited 2026-08-14. Legend: ✅ done+tested · 🟡 partial (note names the missing part) · ❌ not shipped (rationale in the domain file).

## The headline gaps

1. **Excel export is not shipped.** The whole Phase 5 checklist is deferred with a
   rationale (see [`excel-export.md`](excel-export.md) and
   [`../phases/phase-05-excel-export.md`](../phases/phase-05-excel-export.md)): the OOXML writer is a
   large, self-contained effort that does not block 1.0.
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
| Row grouping | 51 | 8 | 22 | [`row-grouping.md`](row-grouping.md) |
| Aggregation | 30 | 10 | 3 | [`aggregation.md`](aggregation.md) |
| Pivoting | 23 | 3 | 2 | [`pivoting.md`](pivoting.md) |
| Server-side row model | 50 | 1 | 1 | [`server-side-row-model.md`](server-side-row-model.md) |
| Viewport row model | 16 | 1 | 1 | [`viewport-row-model.md`](viewport-row-model.md) |
| Tree data | 18 | 1 | 2 | [`tree-data.md`](tree-data.md) |
| Master / detail | 17 | 1 | 1 | [`master-detail.md`](master-detail.md) |
| Cell selection | 20 | 6 | 1 | [`cell-selection.md`](cell-selection.md) |
| Clipboard | 32 | 5 | 1 | [`clipboard.md`](clipboard.md) |
| Status bar | 20 | 3 | 1 | [`status-bar.md`](status-bar.md) |
| Set filter | 43 | 2 | 1 | [`set-filter.md`](set-filter.md) |
| Multi filter | 16 | 7 | 1 | [`multi-filter.md`](multi-filter.md) |
| Filters tool panel | 23 | 1 | 1 | [`filters-tool-panel.md`](filters-tool-panel.md) |
| Advanced filter | 36 | 1 | 1 | [`advanced-filter.md`](advanced-filter.md) |
| Find | 27 | 1 | 2 | [`find.md`](find.md) |
| Rich select | 10 | 1 | 1 | [`rich-select.md`](rich-select.md) |
| Context menu | 24 | 20 | 1 | [`context-menu.md`](context-menu.md) |
| Column menu | 23 | 19 | 1 | [`column-menu.md`](column-menu.md) |
| Side bar | 32 | 1 | 1 | [`side-bar.md`](side-bar.md) |
| Columns tool panel | 45 | 5 | 5 | [`columns-tool-panel.md`](columns-tool-panel.md) |
| Integrated charts | 55 | 2 | 5 | [`integrated-charts.md`](integrated-charts.md) |
| Sparklines | 3 | 0 | 0 | [`sparklines.md`](sparklines.md) |
| Excel export | 2 | 1 | 71 | [`excel-export.md`](excel-export.md) — deferred with Phase 5 |

The menu domains carry the most 🟡 rows: their checklists track per-item state, and each 🟡
names the exact missing item. Read the domain file before treating a 🟡 count as a
feature-sized gap.

