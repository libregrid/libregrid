# Parity — Integrated Charts & Sparklines

**Sources:** https://www.ag-grid.com/javascript-data-grid/integrated-charts/ · `/integrated-charts-api-range-chart/` · `/integrated-charts-chart-tool-panels/` · `/sparklines-overview/` · reviewed 2026-08-14
**Phase:** 12 · **Packages:** `@libregrid/integrated-charts`, `@libregrid/sparklines`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

> ⚠️ **Known gap.** We build on **`ag-charts-community` (MIT)**. AG Charts *Enterprise* provides additional chart types we will not have. Mark those ❌ with the rationale: "not available in ag-charts-community; would require reimplementing a commercial charting product." **Document the gap prominently — do not omit it silently.**
>
> The Community adapter deliberately covers the basic Cartesian, pie, and listed combination families. AG Charts Enterprise-only families are explicitly recorded below; LibreGrid does not import or emulate `ag-charts-enterprise`.

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `enableCharts` | ✅ | Gates ChartService creation |
| `getChartToolbarItems` | ✅ | Toolbar callback controls configure/unlink/download actions |
| `suppressAggFuncInHeader` | 🟡 | Shared aggregation header-formatting gap; tracked in `aggregation.md` |
| `chartThemes` | ✅ | First configured theme is used as the default |
| `customChartThemes` | ✅ | Named custom themes pass through to the provider |
| `chartThemeOverrides` | ✅ | Grid and per-chart overrides pass through to AG Charts |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `createRangeChart(params)` | ✅ | Linked data/range and external container supported |
| `updateChart(params)` | ✅ | Type, range, theme, link, and range options |
| `createPivotChart` | ✅ | Charts current pivot-visible row data |
| `createCrossFilterChart` | ✅ | Datum click writes a normal grid set-filter model |
| `getChartModels` | ✅ | Serialisable state |
| `restoreChart` | ✅ | Restores model into supplied container |
| `getChartImageDataURL` | ✅ | Provider passthrough |
| `downloadChart` | ✅ | Provider passthrough |

## CreateRangeChartParams

| Property | Required | Status | Notes |
|---|---|---|---|
| `cellRange` | ✔ | ✅ | `ChartParamsCellRange` |
| `chartType` | ✔ | ✅ | |
| `suppressChartRanges` | | ✅ | Avoids range-service highlighting |
| `switchCategorySeries` | | ✅ | Transposes translated data |
| `aggFunc` | | ✅ | Built-in sum/min/max/count/avg/first/last aggregation |
| `seriesChartTypes` | | ✅ | Community combination mapping |
| `seriesGroupType` | | ✅ | Persists through update/save/restore |
| `useGroupColumnAsCategory` | | ✅ | Uses active auto-group column when supplied |
| `chartThemeName` | | ✅ | |
| `chartContainer` | | ✅ | Render outside the grid |
| `chartThemeOverrides` | | ✅ | |
| `unlinkChart` | | ✅ | Detach from grid updates |

## Chart types (documented)

| Type | Status | Notes |
|---|---|---|
| `groupedColumn` | ✅ | |
| `stackedColumn` | ✅ | |
| `groupedBar` | ✅ | |
| `line` | ✅ | |
| `area` | ✅ | |
| `stackedArea` | ✅ | |
| `pie` | ✅ | |
| `scatter` / `bubble` / `histogram` | ✅ | Generic Community-series proxy accepts all Cartesian Community types |
| `columnLineCombo` | ✅ | |
| `areaColumnCombo` | ✅ | |
| `customCombo` | ✅ | Per-series proxy configuration |
| Polar (`radarLine`, `radarArea`, `nightingale`, `radialColumn`, `radialBar`) | ❌ | Not available in `ag-charts-community` 14.1.0; would require Enterprise chart modules |
| Statistical/hierarchical/specialised (`boxPlot`, `rangeBar`, `rangeArea`, `treemap`, `sunburst`, `heatmap`, `waterfall`) | ❌ | Not available in `ag-charts-community` 14.1.0; would require Enterprise chart modules |
| Funnel (`funnel`, `coneFunnel`, `pyramid`) | ❌ | Not available in `ag-charts-community` 14.1.0; would require Enterprise chart modules |

## Interfaces

| Interface | Status | Notes |
|---|---|---|
| `ChartRef` (`destroyChart()`) | ✅ | Destroy removes engine/chart/panel state |
| `SeriesChartType` | ✅ | |
| `SeriesGroupType` | ✅ | |
| `AgChartThemeOverrides` | ✅ | |
| **`ChartProvider`** (ours) | ✅ | Stub alternative provider proves substitution seam |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Range → chart renders | ✅ | Range translation and external container |
| Chart live-updates with grid data | ✅ | Model/row/sort/filter event listeners |
| Sort/filter updates a linked chart | ✅ | |
| `unlinkChart` detaches updates | ✅ | |
| Cross-filter drives grid filters | ✅ | Chart datum selection writes filter model |
| Chart tool panel (type/data/format) in Material | ✅ | Native semantic controls inherit Material theme; type, category/series switch, and theme controls |
| Chart save/restore | ✅ | `getChartModels` / `restoreChart` |
| No leaks over 200 create/destroy cycles | ✅ | Lifecycle test repeatedly destroys provider/chart container state |
| Grid destroyed while chart open | ✅ | Service destroy calls each ChartRef destroy |

## Sparklines

| Item | Status | Notes |
|---|---|---|
| `agSparklineCellRenderer` | ✅ | Grid-standard user component |
| `iSparklineCellRendererParams` | ✅ | Uses `sparklineOptions` and `createSparkline` seam |
| Line / area / column / bar sparklines | ✅ | Type forwarded directly to Community provider |
| Tooltips and axis configuration | ✅ | Options forwarded directly to Community provider |
