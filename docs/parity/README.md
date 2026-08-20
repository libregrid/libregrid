# Parity Checklists

These are **living documents**. They define what "feature for feature with AG Grid Enterprise" means in practice. A reviewer checks them at every phase gate.

## Legend

| Mark | Meaning |
|---|---|
| ⬜ | Not started |
| ✅ | Implemented and tested (needs a passing integration test **and** a live docs route) |
| 🟡 | Partial — **note what is missing** |
| ❌ | Won't do — **rationale required** |

## Rules

1. **Updating the relevant checklist is part of every phase's acceptance criteria.** A phase is not done until its checklists are marked.
2. **Never mark ✅ without a test.** An option that exists in a type definition but the grid does not honor at runtime is ⬜, not ✅.
3. **Every ❌ needs a written reason.** "Not implemented" is not a rationale. "AG Charts Community does not provide this chart type; would require reimplementing a commercial charting feature" is.
4. **Sources are public documentation only** (guardrails G2). Never resolve an ambiguity by running the commercial build. If the docs are unclear, ask.
5. Each file records the source URL and the transcription date. Docs change. If you find a discrepancy, re-check the source. Note the new date.

## Coverage caveat

We transcribed these lists from the AG Grid documentation pages named in each file on **2026-08-11**. Where a docs page was an overview rather than an API reference, the file says so. It names the sub-pages to expand from. Treat these lists as a strong starting point, not a guaranteed-exhaustive API dump. Verify against the live docs when you work a phase.

## Files

| Domain | Phase | Package |
|---|---|---|
| [`row-grouping.md`](row-grouping.md) | 2 | `@libregrid/row-grouping` |
| [`aggregation.md`](aggregation.md) | 2 | `@libregrid/row-grouping` |
| [`pivoting.md`](pivoting.md) | 8 | `@libregrid/pivot` |
| [`server-side-row-model.md`](server-side-row-model.md) | 7, 9 | `@libregrid/server-side-row-model` |
| [`viewport-row-model.md`](viewport-row-model.md) | 9 | `@libregrid/viewport-row-model` |
| [`cell-selection.md`](cell-selection.md) | 4 | `@libregrid/cell-selection` |
| [`clipboard.md`](clipboard.md) | 4 | `@libregrid/clipboard` |
| [`status-bar.md`](status-bar.md) | 4 | `@libregrid/status-bar` |
| [`toolbar.md`](toolbar.md) | 13 | `@libregrid/toolbar` |
| [`excel-export.md`](excel-export.md) | 5 | `@libregrid/excel-export` |
| [`side-bar.md`](side-bar.md) | 1 | `@libregrid/side-bar` |
| [`columns-tool-panel.md`](columns-tool-panel.md) | 3 | `@libregrid/columns-tool-panel` |
| [`filters-tool-panel.md`](filters-tool-panel.md) | 6 | `@libregrid/filters-tool-panel` |
| [`context-menu.md`](context-menu.md) | 1 | `@libregrid/menu` |
| [`column-menu.md`](column-menu.md) | 1 | `@libregrid/menu` |
| [`set-filter.md`](set-filter.md) | 6 | `@libregrid/set-filter` |
| [`multi-filter.md`](multi-filter.md) | 6 | `@libregrid/multi-filter` |
| [`advanced-filter.md`](advanced-filter.md) | 11 | `@libregrid/advanced-filter` |
| [`find.md`](find.md) | 11 | `@libregrid/find` |
| [`rich-select.md`](rich-select.md) | 11 | `@libregrid/rich-select` |
| [`tree-data.md`](tree-data.md) | 10 | `@libregrid/tree-data` |
| [`master-detail.md`](master-detail.md) | 10 | `@libregrid/master-detail` |
| [`integrated-charts.md`](integrated-charts.md) | 12 | `@libregrid/integrated-charts` |
| [`batch-edit.md`](batch-edit.md) | 17 | `@libregrid/batch-edit` |
| [`calculated-columns.md`](calculated-columns.md) | 18 | `@libregrid/calculated-columns` |
