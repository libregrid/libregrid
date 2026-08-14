import { BeanStub } from 'ag-grid-community';
import type {
  ChartDownloadParams,
  ChartModel,
  ChartRef,
  ChartType,
  CellRangeParams,
  Column,
  CreateCrossFilterChartParams,
  CreatePivotChartParams,
  CreateRangeChartParams,
  GetChartImageDataUrlParams,
  IChartService,
  OpenChartToolPanelParams,
  UpdateChartParams,
} from 'ag-grid-community';
import { AgChartsCommunityProvider, type ChartInstance, type ChartProvider, type ChartProviderOptions } from './chartProvider';
import { ChartCrossFilterService } from './chartCrossFilterService';
import { chartOptionsFor, type ChartDataSet } from './chartTranslation';
import { ChartToolPanel, type ChartPanelUpdate } from './chartToolPanel';
import type { AgChartsExports, ChartMenuListFactory, EnterpriseChartProxyFactory } from './chartSeams';

type ChartColumn = Column & { getId(): string; getColDef(): { field?: string; headerName?: string; hide?: boolean } };
type ChartNode = { rowIndex?: number | null; data?: Record<string, unknown> };
type ChartBeans = {
  colModel?: { getCols?(): ChartColumn[]; getAllDisplayedCols?(): ChartColumn[]; getAutoGroupColumn?(): ChartColumn | null; getCol?(key: string): ChartColumn | null };
  rowModel?: { forEachNodeAfterFilterAndSort?(callback: (node: ChartNode) => void): void; forEachNode?(callback: (node: ChartNode) => void): void };
  valueSvc?: { getValue(column: ChartColumn, node: ChartNode, type: string, ignoreAggData?: boolean): unknown };
  eventSvc?: { dispatchEvent(event: object): void };
  chartCrossFilterSvc?: ChartCrossFilterService;
  agChartsExports?: AgChartsExports;
  enterpriseChartProxyFactory?: EnterpriseChartProxyFactory;
  chartMenuListFactory?: ChartMenuListFactory;
  rangeSvc?: { addCellRange(params: CellRangeParams): void };
};

interface StoredChart {
  model: ChartModel;
  ref: ChartRef;
  instance: ChartInstance;
  panel: ChartToolPanel | undefined;
}

/** The Community-compatible implementation of AG Grid's chart service seam. */
export class ChartService extends BeanStub implements IChartService {
  public readonly beanName = 'chartSvc';
  private readonly charts = new Map<string, StoredChart>();
  private serial = 0;

  public postConstruct(): void {
    this.addManagedEventListeners({ modelUpdated: () => this.refreshLinked(), rowDataUpdated: () => this.refreshLinked(), displayedColumnsChanged: () => this.refreshLinked(), sortChanged: () => this.refreshLinked(), filterChanged: () => this.refreshLinked() });
  }
  public override destroy(): void { for (const chart of [...this.charts.values()]) chart.ref.destroyChart(); super.destroy(); }
  public isEnterprise(): boolean { return true; }
  public getChartModels(): ChartModel[] { return [...this.charts.values()].map(({ model }) => structuredClone(model)); }
  public getChartRef(chartId: string): ChartRef | undefined { return this.charts.get(chartId)?.ref; }
  public createRangeChart(params: CreateRangeChartParams, _fromApi = true): ChartRef | undefined { return this.create('range', params.chartType, params, params.cellRange); }
  public createCrossFilterChart(params: CreateCrossFilterChartParams, _fromApi = true): ChartRef | undefined { return this.create('range', params.chartType, params, params.cellRange, true); }
  public createChartFromCurrentRange(chartType: ChartType, _fromApi = true): ChartRef | undefined {
    const range = (this.beans as ChartBeans & { rangeSvc?: { getCellRanges(): { startRow?: { rowIndex: number }; endRow?: { rowIndex: number }; columns: ChartColumn[] }[] } }).rangeSvc?.getCellRanges()[0];
    if (!range) return undefined;
    return this.createRangeChart({ chartType, cellRange: { rowStartIndex: range.startRow?.rowIndex ?? null, rowEndIndex: range.endRow?.rowIndex ?? null, columns: range.columns.map((column) => column.getId()) } } as CreateRangeChartParams);
  }
  public createPivotChart(params: CreatePivotChartParams, _fromApi = true): ChartRef | undefined {
    const columns = this.columns().map((column) => column.getId());
    return this.create('pivot', params.chartType, params, { columns });
  }
  public restoreChart(model: ChartModel, chartContainer?: HTMLElement): ChartRef | undefined {
    return this.create(model.modelType, model.chartType, { ...model, chartContainer, chartThemeOverrides: model.chartOptions }, model.cellRange);
  }
  public getChartImageDataURL(params: GetChartImageDataUrlParams): string | undefined { return this.charts.get(params.chartId)?.instance.getImageDataURL?.(params.fileFormat); }
  public downloadChart(params: ChartDownloadParams): void { this.charts.get(params.chartId)?.instance.download?.(params.fileName, params.fileFormat, params.dimensions); }
  public openChartToolPanel(params: OpenChartToolPanelParams): void {
    const chart = this.charts.get(params.chartId); if (!chart || chart.panel) return;
    chart.panel = new ChartToolPanel(params.chartId, chart.model.chartType, (change) => this.applyPanelUpdate(chart.model.chartId, chart.model.modelType, change), () => this.closeChartToolPanel(params.chartId));
    chart.ref.chartElement.parentElement?.append(chart.panel.getGui());
  }
  public closeChartToolPanel(chartId: string): void { const chart = this.charts.get(chartId); chart?.panel?.destroy(); if (chart) chart.panel = undefined; }
  public updateChart(params: UpdateChartParams): void {
    const chart = this.charts.get(params.chartId); if (!chart) return;
    const next: ChartModel = structuredClone(chart.model); next.chartType = params.chartType ?? next.chartType;
    if (params.chartThemeName !== undefined) next.chartThemeName = params.chartThemeName;
    if (params.chartThemeOverrides !== undefined) next.chartOptions = params.chartThemeOverrides;
    if (params.unlinkChart !== undefined) next.unlinkChart = params.unlinkChart;
    if ('cellRange' in params && params.cellRange) next.cellRange = this.normaliseRange(params.cellRange);
    if ('suppressChartRanges' in params && params.suppressChartRanges !== undefined) next.suppressChartRanges = params.suppressChartRanges;
    if ('switchCategorySeries' in params && params.switchCategorySeries !== undefined) next.switchCategorySeries = params.switchCategorySeries;
    if ('seriesChartTypes' in params && params.seriesChartTypes !== undefined) next.seriesChartTypes = params.seriesChartTypes;
    if ('aggFunc' in params && params.aggFunc !== undefined) next.aggFunc = params.aggFunc;
    chart.model = next; this.render(chart);
  }

  private create(modelType: 'range' | 'pivot', chartType: ChartType, params: object, cellRange: Partial<CellRangeParams>, crossFilter = false): ChartRef | undefined {
    const value = params as Record<string, unknown>; const normalisedRange = this.normaliseRange(cellRange);
    if (!this.enabled() || !normalisedRange.columns?.length) return undefined;
    const chartId = `lgr-chart-${++this.serial}`;
    const element = document.createElement('div'); element.className = 'lgr-chart'; element.dataset['chartId'] = chartId; element.setAttribute('aria-label', `${chartType} chart`);
    const container = value['chartContainer'] instanceof HTMLElement ? value['chartContainer'] : document.body; container.append(element);
    const defaultThemes = this.gos.get('chartThemes'); const defaultTheme = Array.isArray(defaultThemes) ? defaultThemes[0] : undefined;
    const model: ChartModel = { version: '1', modelType, chartId, chartType, cellRange: structuredClone(normalisedRange), chartOptions: (value['chartThemeOverrides'] ?? this.gos.get('chartThemeOverrides') ?? {}) as ChartModel['chartOptions'], ...(typeof value['chartThemeName'] === 'string' ? { chartThemeName: value['chartThemeName'] } : typeof defaultTheme === 'string' ? { chartThemeName: defaultTheme } : {}), ...(typeof value['suppressChartRanges'] === 'boolean' ? { suppressChartRanges: value['suppressChartRanges'] } : {}), ...(typeof value['switchCategorySeries'] === 'boolean' ? { switchCategorySeries: value['switchCategorySeries'] } : {}), ...(typeof value['aggFunc'] === 'string' || typeof value['aggFunc'] === 'function' ? { aggFunc: value['aggFunc'] as NonNullable<ChartModel['aggFunc']> } : {}), ...(typeof value['unlinkChart'] === 'boolean' ? { unlinkChart: value['unlinkChart'] } : {}), ...(Array.isArray(value['seriesChartTypes']) ? { seriesChartTypes: value['seriesChartTypes'] as NonNullable<ChartModel['seriesChartTypes']> } : {}), ...(typeof value['seriesGroupType'] === 'string' ? { seriesGroupType: value['seriesGroupType'] as NonNullable<ChartModel['seriesGroupType']> } : {}), ...(typeof value['useGroupColumnAsCategory'] === 'boolean' ? { useGroupColumnAsCategory: value['useGroupColumnAsCategory'] } : {}) };
    if (!model.suppressChartRanges) (this.beans as ChartBeans).rangeSvc?.addCellRange?.(model.cellRange);
    let instance: ChartInstance | undefined;
    const ref: ChartRef = { chartId, chart: undefined, chartElement: element, destroyChart: () => { const stored = this.charts.get(chartId); if (!stored) return; stored.panel?.destroy(); stored.instance.destroy(); stored.ref.chartElement.remove(); this.charts.delete(chartId); this.dispatch('chartDestroyed', chartId); }, focusChart: () => element.focus(), setMaximized: (maximized) => element.classList.toggle('lgr-chart-maximized', maximized) };
    const stored: StoredChart = { model, ref, instance: { update: () => undefined, destroy: () => undefined }, panel: undefined };
    this.charts.set(chartId, stored);
    try { instance = this.provider().create(this.options(stored, crossFilter)); stored.instance = instance; (ref as { chart: unknown }).chart = instance; this.addToolbar(stored); this.dispatch('chartCreated', chartId); return ref; }
    catch (error) { this.charts.delete(chartId); element.remove(); throw error; }
  }
  private render(chart: StoredChart): void { chart.instance.update(this.options(chart)); this.dispatch('chartUpdated', chart.model.chartId); }
  private options(chart: StoredChart, crossFilter = false): ChartProviderOptions {
    const data = this.data(chart.model.cellRange, chart.model.switchCategorySeries === true, chart.model.aggFunc, chart.model.useGroupColumnAsCategory === true);
    const interactive = crossFilter ? (datum: Record<string, unknown>) => this.crossFilter().apply(data.category, datum[data.category]) : undefined;
    const factory = (this.beans as ChartBeans).enterpriseChartProxyFactory;
    const customThemes = this.gos.get('customChartThemes') as Record<string, unknown> | undefined; const theme = chart.model.chartThemeName && customThemes?.[chart.model.chartThemeName] ? customThemes[chart.model.chartThemeName] : chart.model.chartThemeName;
    return { container: chart.ref.chartElement, ...(factory?.create(chart.model.chartType, data, chart.model.seriesChartTypes) ?? chartOptionsFor(chart.model.chartType, data, chart.model.seriesChartTypes, interactive)), ...(interactive ? { onDatumClick: interactive } : {}), ...(theme ? { theme } : {}), ...(chart.model.chartOptions ? { themeOverrides: chart.model.chartOptions } : {}) };
  }
  private refreshLinked(): void { for (const chart of this.charts.values()) if (!chart.model.unlinkChart) this.render(chart); }
  private data(range: ChartModel['cellRange'], switchCategorySeries: boolean, aggFunc?: ChartModel['aggFunc'], useGroupColumnAsCategory = false): ChartDataSet {
    const selected = this.resolveColumns(range); const autoGroup = useGroupColumnAsCategory ? (this.beans as ChartBeans).colModel?.getAutoGroupColumn?.() : undefined; const columns = autoGroup ? [autoGroup, ...selected.filter((column) => column.getId() !== autoGroup.getId())] : selected; const category = columns[0]?.getId() ?? 'category'; const series = columns.slice(1).map((column) => column.getId());
    const data = this.nodes(range).map((node) => Object.fromEntries(columns.map((column) => [column.getId(), this.value(column, node)])));
    const aggregated = aggFunc ? aggregate(data, category, series, aggFunc) : data;
    if (!switchCategorySeries) return { category, series, data: aggregated };
    const switched = series.map((seriesId) => Object.fromEntries([[category, seriesId], ...aggregated.map((row, index) => [`row${index + 1}`, row[seriesId]])]));
    return { category, series: aggregated.map((_, index) => `row${index + 1}`), data: switched };
  }
  private nodes(range: ChartModel['cellRange']): ChartNode[] {
    const result: ChartNode[] = []; const model = (this.beans as ChartBeans).rowModel; const visit = (node: ChartNode) => { const start = range.rowStartIndex ?? 0; const end = range.rowEndIndex; if ((node.rowIndex ?? -1) >= start && (end == null || (node.rowIndex ?? -1) <= end)) result.push(node); };
    if (model?.forEachNodeAfterFilterAndSort) model.forEachNodeAfterFilterAndSort(visit); else model?.forEachNode?.(visit); return result;
  }
  private resolveColumns(range: ChartModel['cellRange']): ChartColumn[] { const ids = range.columns ?? []; return ids.map((id) => typeof id === 'string' ? this.columns().find((column) => column.getId() === id) : id as ChartColumn).filter((column): column is ChartColumn => !!column); }
  private columns(): ChartColumn[] { const model = (this.beans as ChartBeans).colModel; return model?.getAllDisplayedCols?.() ?? model?.getCols?.() ?? []; }
  private value(column: ChartColumn, node: ChartNode): unknown { return (this.beans as ChartBeans).valueSvc?.getValue(column, node, 'chart', true) ?? node.data?.[column.getColDef().field ?? column.getId()]; }
  private provider(): ChartProvider { const fromOption = (this.gos as unknown as { get(key: string): unknown }).get('chartProvider'); return (fromOption && typeof (fromOption as ChartProvider).create === 'function' ? fromOption : (this.beans as ChartBeans).agChartsExports?.provider() ?? new AgChartsCommunityProvider()) as ChartProvider; }
  private crossFilter(): ChartCrossFilterService { return (this.beans as ChartBeans).chartCrossFilterSvc ?? new ChartCrossFilterService(); }
  private enabled(): boolean { return this.gos.get('enableCharts') === true; }
  private dispatch(type: string, chartId: string): void { (this.beans as ChartBeans).eventSvc?.dispatchEvent({ type, chartId }); }
  private applyPanelUpdate(chartId: string, modelType: 'range' | 'pivot', change: ChartPanelUpdate): void { this.updateChart({ type: modelType === 'pivot' ? 'pivotChartUpdate' : 'rangeChartUpdate', chartId, ...change } as UpdateChartParams); }
  private addToolbar(chart: StoredChart): void { const toolbar = document.createElement('div'); toolbar.className = 'lgr-chart-toolbar'; for (const item of (this.beans as ChartBeans).chartMenuListFactory?.getItems(chart.model.chartId) ?? ['chartMenu', 'chartUnlink', 'chartDownload']) { const control = document.createElement('button'); control.type = 'button'; control.textContent = item === 'chartMenu' ? 'Configure chart' : item === 'chartUnlink' ? 'Unlink chart' : 'Download chart'; control.setAttribute('aria-label', control.textContent); control.addEventListener('click', () => { if (item === 'chartMenu') this.openChartToolPanel({ chartId: chart.model.chartId }); else if (item === 'chartUnlink') this.updateChart({ type: chart.model.modelType === 'pivot' ? 'pivotChartUpdate' : 'rangeChartUpdate', chartId: chart.model.chartId, unlinkChart: true } as UpdateChartParams); else this.downloadChart({ chartId: chart.model.chartId }); }); toolbar.append(control); } chart.ref.chartElement.append(toolbar); }
  private normaliseRange(range: Partial<CellRangeParams>): CellRangeParams { return { rowStartIndex: range.rowStartIndex ?? null, rowEndIndex: range.rowEndIndex ?? null, ...(range.columns ? { columns: range.columns } : {}), ...(range.columnStart ? { columnStart: range.columnStart } : {}), ...(range.columnEnd ? { columnEnd: range.columnEnd } : {}) }; }
}

function aggregate(data: Record<string, unknown>[], category: string, series: string[], func: NonNullable<ChartModel['aggFunc']>): Record<string, unknown>[] {
  const reducer = typeof func === 'string' ? func : 'sum'; const groups = new Map<unknown, Record<string, unknown>[]>(); for (const row of data) { const key = row[category]; groups.set(key, [...(groups.get(key) ?? []), row]); }
  return [...groups.entries()].map(([key, rows]) => Object.fromEntries([[category, key], ...series.map((seriesId) => { const values = rows.map((row) => Number(row[seriesId])).filter((value) => !Number.isNaN(value)); const sum = values.reduce((total, value) => total + value, 0); const value = reducer === 'count' ? values.length : reducer === 'avg' ? sum / Math.max(values.length, 1) : reducer === 'min' ? Math.min(...values) : reducer === 'max' ? Math.max(...values) : reducer === 'first' ? values[0] : reducer === 'last' ? values.at(-1) : sum; return [seriesId, value]; })]));
}
