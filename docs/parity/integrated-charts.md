# Parity — Integrated Charts & Sparklines

**Sources:** https://www.ag-grid.com/angular-data-grid/integrated-charts/ · `/integrated-charts-api-range-chart/` · transcribed 2026-08-11
**Phase:** 12 · **Packages:** `@libregrid/integrated-charts`, `@libregrid/sparklines`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

> ⚠️ **Known gap.** We build on **`ag-charts-community` (MIT)**. AG Charts *Enterprise* provides additional chart types we will not have. Mark those ❌ with the rationale: "not available in ag-charts-community; would require reimplementing a commercial charting product." **Document the gap prominently — do not omit it silently.**
>
> **Incomplete source.** Expand at Phase 12 start from: `integrated-charts-api-pivot-chart`, `-cross-filter-chart`, `-chart-events`, `-chart-customisation`.

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `enableCharts` | ⬜ | |
| `getChartToolbarItems` | ⬜ | |
| `suppressAggFuncInHeader` | ⬜ | Shared with aggregation |
| `chartThemes` | ⬜ | Not enumerated — verify |
| `customChartThemes` | ⬜ | Not enumerated — verify |
| `chartThemeOverrides` | ⬜ | Not enumerated — verify |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `createRangeChart(params)` | ⬜ | |
| `updateChart(params)` | ⬜ | |
| `createPivotChart` | ⬜ | Requires Phase 8 |
| `createCrossFilterChart` | ⬜ | |
| `getChartModels` | ⬜ | Save/restore |
| `restoreChart` | ⬜ | Save/restore |
| `getChartImageDataURL` | ⬜ | Not enumerated — verify |
| `downloadChart` | ⬜ | Not enumerated — verify |

## CreateRangeChartParams

| Property | Required | Status | Notes |
|---|---|---|---|
| `cellRange` | ✔ | ⬜ | `ChartParamsCellRange` |
| `chartType` | ✔ | ⬜ | |
| `suppressChartRanges` | | ⬜ | |
| `switchCategorySeries` | | ⬜ | |
| `aggFunc` | | ⬜ | |
| `seriesChartTypes` | | ⬜ | Combo charts |
| `seriesGroupType` | | ⬜ | |
| `useGroupColumnAsCategory` | | ⬜ | |
| `chartThemeName` | | ⬜ | |
| `chartContainer` | | ⬜ | Render outside the grid |
| `chartThemeOverrides` | | ⬜ | |
| `unlinkChart` | | ⬜ | Detach from grid updates |

## Chart types (documented)

| Type | Status | Notes |
|---|---|---|
| `groupedColumn` | ⬜ | |
| `stackedColumn` | ⬜ | |
| `groupedBar` | ⬜ | |
| `line` | ⬜ | |
| `area` | ⬜ | |
| `stackedArea` | ⬜ | |
| `pie` | ⬜ | |
| `columnLineCombo` | ⬜ | |
| `areaColumnCombo` | ⬜ | |
| `customCombo` | ⬜ | |
| *Enterprise-only AG Charts types* | ❌ | Not available in `ag-charts-community` — enumerate explicitly at Phase 12 |

## Interfaces

| Interface | Status | Notes |
|---|---|---|
| `ChartRef` (`destroyChart()`) | ⬜ | |
| `SeriesChartType` | ⬜ | |
| `SeriesGroupType` | ⬜ | |
| `AgChartThemeOverrides` | ⬜ | |
| **`ChartProvider`** (ours) | ⬜ | Substitutable engine seam |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Range → chart renders | ⬜ | |
| Chart live-updates with grid data | ⬜ | |
| Sort/filter updates a linked chart | ⬜ | |
| `unlinkChart` detaches updates | ⬜ | |
| Cross-filter drives grid filters | ⬜ | |
| Chart tool panel (type/data/format) in Material | ⬜ | |
| Chart save/restore | ⬜ | |
| No leaks over 200 create/destroy cycles | ⬜ | |
| Grid destroyed while chart open | ⬜ | |

## Sparklines

| Item | Status | Notes |
|---|---|---|
| `agSparklineCellRenderer` | ⬜ | |
| `iSparklineCellRendererParams` | ⬜ | |
| Line / area / column / bar sparklines | ⬜ | |
| Tooltips and axis configuration | ⬜ | |
