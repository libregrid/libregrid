# Phase 12 — Integrated Charts & Sparklines

**Status:** ⬜ Not started
**Depends on:** Phase 1 (menus), Phase 4 (ranges), Phase 8 (pivot charts)
**Blocks:** nothing

**Packages:** `@libregrid/integrated-charts` (`IntegratedCharts`), `@libregrid/sparklines` (`Sparklines`)
**Parity:** [`../parity/integrated-charts.md`](../parity/integrated-charts.md)

---

## Context

AG Grid's Integrated Charts are powered by AG Charts — a second product of comparable size. The decisive finding is that **`ag-charts-community` is MIT** (v14.1.0), so we do not build a charting engine. We build the *integration*: turning grid selections into charts and keeping them synchronised.

Scope this phase as the **grid-side machinery**:
- Range → chart model translation
- Chart lifecycle, and live updates as underlying data changes
- The chart tool panel / menu for configuring an existing chart
- Cross-filtering (chart interaction drives grid filters)
- Save/restore of chart state

Expose a **`ChartProvider` seam** so users can substitute another engine. Ship one reference adapter over `ag-charts-community`.

**Known and accepted gap:** AG Charts *Community* offers fewer chart types than AG Charts Enterprise. Implement what Community supports, and **document the unavailable types explicitly** in the parity checklist rather than silently omitting them. Do not attempt to reimplement Enterprise chart types.

Sparklines are in-cell mini charts — a much smaller piece riding on the same engine.

---

## Todo

### 12A — `@libregrid/integrated-charts`

- [ ] `ChartProvider` interface — the substitutable seam
- [ ] Reference adapter over `ag-charts-community` (bean `agChartsExports`)
- [ ] Bean implementing `IChartService`
- [ ] Bean `enterpriseChartProxyFactory` — per-chart-type option proxies
- [ ] `createRangeChart(params)` with `CreateRangeChartParams`: `cellRange`*, `chartType`*, `suppressChartRanges`, `switchCategorySeries`, `aggFunc`, `seriesChartTypes`, `seriesGroupType`, `useGroupColumnAsCategory`, `chartThemeName`, `chartContainer`, `chartThemeOverrides`, `unlinkChart` (* required)
- [ ] `updateChart`, `ChartRef` with `destroyChart()`
- [ ] Chart types available in Community: `groupedColumn`, `groupedBar`, `pie`, `line`, `area`, `stackedArea`, `stackedColumn`, `columnLineCombo`, `areaColumnCombo`, `customCombo`
- [ ] Live update: chart follows grid data/sort/filter changes while linked
- [ ] `unlinkChart` detaches a chart from grid updates
- [ ] Beans `chartMenuSvc`, `chartMenuItemMapper`, `chartMenuListFactory`, `chartTranslation`
- [ ] Chart tool panel: type switcher, data config, format config (Material)
- [ ] Bean `chartCrossFilterSvc` — chart interaction applies grid filters
- [ ] Pivot charts (requires Phase 8)
- [ ] Chart state save/restore
- [ ] Options: `enableCharts`, `getChartToolbarItems`
- [ ] Contribute `chartRange`, `pivotChart` to the Phase 1 menu registry
- [ ] Range highlighting in the grid showing what a chart is bound to

### 12B — `@libregrid/sparklines`

- [ ] `agSparklineCellRenderer` with `iSparklineCellRendererParams`
- [ ] Line, area, column and bar sparklines over `ag-charts-community`
- [ ] Tooltip and axis configuration

---

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Range → chart-data translation for contiguous and multi-range selections. Category/series inference and `switchCategorySeries`. `useGroupColumnAsCategory` with grouped data. Chart state serialise/deserialise round-trip |
| **Integration** | `createRangeChart` returns a `ChartRef` and renders. Editing a cell in the range updates the chart. Sorting/filtering the grid updates a linked chart. `unlinkChart` stops updates. Cross-filter interaction applies the expected grid filter. `destroyChart()` cleans up with no leaks. Pivot chart against pivoted data |
| **E2E** | Select a range → *Chart Range* from the context menu → chart appears. Change chart type from the tool panel. Click a chart segment → grid filters. Save and restore chart state across a reload |
| **Memory** | 200 create/destroy chart cycles; assert no unbounded growth |
| **a11y** | Chart config panel fully keyboard-operable; charts carry accessible descriptions; axe 0 violations light + dark |

**Specific edge cases to cover:**
- Range containing non-numeric columns
- Range of a single cell
- Chart bound to a range whose columns are subsequently hidden or removed
- Grid destroyed while a chart is open
- `chartContainer` rendering the chart outside the grid

---

## Acceptance criteria

- [ ] Select a range → chart renders and **live-updates** with the data
- [ ] Cross-filtering drives grid filters from chart interaction
- [ ] Chart config panel is Material and keyboard-operable
- [ ] Charts survive save/restore
- [ ] `unlinkChart` correctly detaches from grid updates
- [ ] Pivot charts work against pivoted data
- [ ] `ChartProvider` seam demonstrated — a stub alternative provider substitutes cleanly in a test
- [ ] **Chart types unavailable in `ag-charts-community` explicitly documented** in the parity checklist as ❌ with rationale
- [ ] No leaks across 200 chart create/destroy cycles
- [ ] Sparklines render in cells with correct data and tooltips
- [ ] Parity checklist fully marked ✅/🟡/❌ with rationale
- [ ] Full Definition of Done (`standards.md` §9) satisfied
