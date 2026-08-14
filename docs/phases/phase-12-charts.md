# Phase 12 — Integrated Charts & Sparklines

**Status:** ✅ Complete — Integrated Charts and Sparklines implementation, validation, documentation, and Definition-of-Done checks verified 2026-08-14.
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

- [x] `ChartProvider` interface — the substitutable seam
- [x] Reference adapter over `ag-charts-community` (bean `agChartsExports`)
- [x] Bean implementing `IChartService`
- [x] Bean `enterpriseChartProxyFactory` — per-chart-type option proxies
- [x] `createRangeChart(params)` with `CreateRangeChartParams`: `cellRange`*, `chartType`*, `suppressChartRanges`, `switchCategorySeries`, `aggFunc`, `seriesChartTypes`, `seriesGroupType`, `useGroupColumnAsCategory`, `chartThemeName`, `chartContainer`, `chartThemeOverrides`, `unlinkChart` (* required)
- [x] `updateChart`, `ChartRef` with `destroyChart()`
- [x] Chart types available in Community: `groupedColumn`, `groupedBar`, `pie`, `line`, `area`, `stackedArea`, `stackedColumn`, `columnLineCombo`, `areaColumnCombo`, `customCombo`
- [x] Live update: chart follows grid data/sort/filter changes while linked
- [x] `unlinkChart` detaches a chart from grid updates
- [x] Beans `chartMenuSvc`, `chartMenuItemMapper`, `chartMenuListFactory`, `chartTranslation`
- [x] Chart tool panel: type switcher, data config, format config (Material-themed)
- [x] Bean `chartCrossFilterSvc` — chart interaction applies grid filters
- [x] Pivot charts (requires Phase 8)
- [x] Chart state save/restore
- [x] Options: `enableCharts`, `getChartToolbarItems`
- [x] Contribute `chartRange`, `pivotChart` to the Phase 1 menu registry
- [x] Range highlighting in the grid showing what a chart is bound to

### 12B — `@libregrid/sparklines`

- [x] `agSparklineCellRenderer` with `iSparklineCellRendererParams`
- [x] Line, area, column and bar sparklines over `ag-charts-community`
- [x] Tooltip and axis configuration

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

- [x] Select a range → chart renders and **live-updates** with the data
- [x] Cross-filtering drives grid filters from chart interaction
- [x] Chart config panel is Material-themed and keyboard-operable
- [x] Charts survive save/restore
- [x] `unlinkChart` correctly detaches from grid updates
- [x] Pivot charts work against pivot-visible data
- [x] `ChartProvider` seam demonstrated — a stub alternative provider substitutes cleanly in a test
- [x] **Chart types unavailable in `ag-charts-community` explicitly documented** in the parity checklist as ❌ with rationale
- [x] No leaks across 200 chart create/destroy cycles
- [x] Sparklines render in cells with correct data and tooltips
- [x] Parity checklist fully marked ✅/🟡/❌ with rationale
- [x] Full Definition of Done (`standards.md` §9) satisfied

## Verification record — 2026-08-14

- `npx vitest run packages/integrated-charts packages/sparklines --coverage --coverage.include='packages/integrated-charts/src/**/*.ts' --coverage.include='packages/sparklines/src/**/*.ts' --pool=forks --maxWorkers=1` — **18 passed**, with **91.49% statements / 78.16% branches / 88.59% functions / 98.78% lines**. Includes real-grid API integration, provider substitution, linked/unlinked lifecycle, state restoration, cross-filtering, all Community mappings, sparkline lifecycle, and 200 create/destroy cycles.
- `npx ng build docs --configuration development` passes. The Phase 12 Chromium scenario creates a real AG Charts Community chart, opens keyboard-operable configuration, saves/restores state, renders four sparklines, and records 0 axe violations in light and dark themes.
- New packages carry README and NOTICE attribution, a docs route and E2E scenario are present, and the range/pivot menu contributions and parity records are updated.
- `npx nx run-many -t lint test build --parallel=1 --outputStyle=static`, `npx nx run conformance:matrix --outputStyle=static`, `npx nx run bench:compare --outputStyle=static`, `npm run check:contamination`, `npm run check:versions`, and `npm run check:budgets` all pass.
- **Formal revalidation (2026-08-14):** `npx nx run-many -t lint test build --parallel=1 --outputStyle=static` completed successfully for all **30 projects**; `npx nx run conformance:matrix --outputStyle=static` passed; and the Phase 12 Chromium Playwright scenario passed (**1 test**, including linked chart creation, configuration, state restore, sparklines, and light/dark axe checks).
