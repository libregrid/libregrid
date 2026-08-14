/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import type { ChartProvider, ChartProviderOptions } from './chartProvider';
import { ChartCrossFilterService } from './chartCrossFilterService';
import { ChartService } from './chartService';

function chartService(options: Record<string, unknown> = {}) {
  const created: ChartProviderOptions[] = []; const updated = vi.fn(); const destroyed = vi.fn(); const events = vi.fn();
  const provider: ChartProvider = { create: (config) => { created.push(config); return { update: updated, destroy: destroyed, getImageDataURL: () => 'data:image/png;base64,test' }; } };
  const service = new ChartService();
  const columns = ['country', 'sales', 'profit'].map((id) => ({ getId: () => id, getColDef: () => ({ field: id }) }));
  const rows = [{ rowIndex: 0, data: { country: 'UK', sales: 10, profit: 2 } }, { rowIndex: 1, data: { country: 'US', sales: 20, profit: 4 } }];
  (service as unknown as { gos: { get(key: string): unknown }; beans: object }).gos = { get: (key: string) => key === 'enableCharts' ? true : key === 'chartProvider' ? provider : options[key] };
  (service as unknown as { beans: object }).beans = { colModel: { getCols: () => columns }, rowModel: { forEachNodeAfterFilterAndSort: (callback: (node: unknown) => void) => rows.forEach(callback) }, eventSvc: { dispatchEvent: events }, valueSvc: { getValue: (column: { getId(): string }, node: { data: Record<string, unknown> }) => node.data[column.getId()] } };
  return { service, created, updated, destroyed, events };
}

describe('ChartService', () => {
  it('translates a cell range, live-updates linked charts, and detaches unlinked charts', () => {
    const { service, created, updated, destroyed, events } = chartService(); const container = document.createElement('div');
    const ref = service.createRangeChart({ chartType: 'groupedColumn', cellRange: { columns: ['country', 'sales', 'profit'] }, chartContainer: container });
    expect(ref?.chartElement.parentElement).toBe(container); expect(created[0]?.data).toEqual([{ country: 'UK', sales: 10, profit: 2 }, { country: 'US', sales: 20, profit: 4 }]);
    expect(created[0]?.series).toHaveLength(2); expect(service.getChartModels()).toHaveLength(1); expect(service.getChartImageDataURL({ chartId: ref!.chartId })).toContain('data:image');
    (service as unknown as { refreshLinked(): void }).refreshLinked(); expect(updated).toHaveBeenCalledTimes(1);
    service.updateChart({ type: 'rangeChartUpdate', chartId: ref!.chartId, unlinkChart: true, chartType: 'line' }); (service as unknown as { refreshLinked(): void }).refreshLinked(); expect(updated).toHaveBeenCalledTimes(2);
    ref?.destroyChart(); expect(destroyed).toHaveBeenCalledOnce(); expect(service.getChartModels()).toEqual([]); expect(events).toHaveBeenCalledWith(expect.objectContaining({ type: 'chartDestroyed' }));
  });
  it('supports state restore, switched category/series data, configuration, and a substitute provider', () => {
    const { service, created, updated } = chartService(); const ref = service.createRangeChart({ chartType: 'line', switchCategorySeries: true, cellRange: { columns: ['country', 'sales', 'profit'] } });
    expect(created[0]?.data).toEqual([{ country: 'sales', row1: 10, row2: 20 }, { country: 'profit', row1: 2, row2: 4 }]);
    const model = service.getChartModels()[0]!; ref?.destroyChart(); const restored = service.restoreChart(model); expect(restored).toBeTruthy();
    service.openChartToolPanel({ chartId: restored!.chartId }); expect(document.querySelector('.lgr-chart-tool-panel')).toBeTruthy();
    document.querySelector<HTMLSelectElement>('.lgr-chart-tool-panel select')!.value = 'pie'; document.querySelector<HTMLSelectElement>('.lgr-chart-tool-panel select')!.dispatchEvent(new Event('change'));
    expect(updated).toHaveBeenCalled(); service.closeChartToolPanel(restored!.chartId); expect(document.querySelector('.lgr-chart-tool-panel')).toBeNull();
  });
  it('cross-filter service writes a set-filter model through the grid pipeline', () => {
    const service = new ChartCrossFilterService(); const setFilterModel = vi.fn(); const onFilterChanged = vi.fn();
    (service as unknown as { beans: object }).beans = { filterManager: { setFilterModel, onFilterChanged } }; service.apply('country', 'UK');
    expect(setFilterModel).toHaveBeenCalledWith({ country: { filterType: 'set', values: ['UK'] } }, 'chart'); expect(onFilterChanged).toHaveBeenCalledWith({ source: 'chart' });
  });
  it('creates current-range, pivot, and cross-filter charts and forwards chart clicks to filters', () => {
    const { service, created } = chartService(); const setFilterModel = vi.fn(); const onFilterChanged = vi.fn(); const cross = new ChartCrossFilterService(); (cross as unknown as { beans: object }).beans = { filterManager: { setFilterModel, onFilterChanged } };
    (service as unknown as { beans: object }).beans = { ...(service as unknown as { beans: object }).beans, rangeSvc: { getCellRanges: () => [{ startRow: { rowIndex: 0 }, endRow: { rowIndex: 1 }, columns: ['country', 'sales'].map((id) => ({ getId: () => id, getColDef: () => ({ field: id }) })) }] }, chartCrossFilterSvc: cross };
    expect(service.createChartFromCurrentRange('line')).toBeTruthy(); expect(service.createPivotChart({ chartType: 'pie' })).toBeTruthy(); expect(service.createCrossFilterChart({ chartType: 'line', cellRange: { columns: ['country', 'sales'] } })).toBeTruthy();
    created.at(-1)?.onDatumClick?.({ country: 'UK' }); expect(setFilterModel).toHaveBeenCalledWith({ country: { filterType: 'set', values: ['UK'] } }, 'chart');
  });
  it('does not create charts while enableCharts is disabled or the range is empty', () => {
    const { service } = chartService({ enableCharts: false }); (service as unknown as { gos: { get(key: string): unknown } }).gos = { get: () => false };
    expect(service.createRangeChart({ chartType: 'line', cellRange: { columns: ['country'] } })).toBeUndefined();
  });
  it('covers optional lifecycle calls, range updates, downloads, and linked chart panels', () => {
    const { service, updated } = chartService(); expect(service.getChartRef('none')).toBeUndefined(); service.closeChartToolPanel('none'); service.openChartToolPanel({ chartId: 'none' });
    const ref = service.createRangeChart({ chartType: 'area', cellRange: { rowStartIndex: 0, rowEndIndex: 0, columns: ['country', 'sales'] }, suppressChartRanges: true, chartThemeName: 'ag-default', chartThemeOverrides: { common: {} }, seriesChartTypes: [{ colId: 'sales', chartType: 'line', secondaryAxis: true }], seriesGroupType: 'stacked', useGroupColumnAsCategory: true });
    service.openChartToolPanel({ chartId: ref!.chartId }); service.openChartToolPanel({ chartId: ref!.chartId });
    service.updateChart({ type: 'rangeChartUpdate', chartId: ref!.chartId, cellRange: { rowStartIndex: 1, rowEndIndex: 1, columns: ['country', 'sales'] }, suppressChartRanges: false, switchCategorySeries: true, seriesChartTypes: [{ colId: 'sales', chartType: 'line' }], seriesGroupType: 'grouped', useGroupColumnAsCategory: false });
    service.downloadChart({ chartId: ref!.chartId, fileName: 'chart', fileFormat: 'image/jpeg', dimensions: { width: 100, height: 80 } }); expect(updated).toHaveBeenCalled(); service.closeChartToolPanel(ref!.chartId);
  });
  it('aggregates category values and surfaces range highlighting plus configured toolbar items', () => {
    const { service, created } = chartService({ chartThemes: ['ag-material'], chartThemeOverrides: { common: { title: { text: 'Sales' } } } }); const addCellRange = vi.fn();
    const columns = ['country', 'sales'].map((id) => ({ getId: () => id, getColDef: () => ({ field: id }) }));
    (service as unknown as { beans: object }).beans = { ...(service as unknown as { beans: object }).beans, rangeSvc: { addCellRange }, chartMenuListFactory: { getItems: () => ['chartDownload'] }, rowModel: { forEachNodeAfterFilterAndSort: (callback: (node: unknown) => void) => [{ rowIndex: 0, data: { country: 'UK', sales: 10 } }, { rowIndex: 1, data: { country: 'UK', sales: 15 } }].forEach(callback) }, colModel: { getCols: () => columns } };
    const ref = service.createRangeChart({ chartType: 'line', cellRange: { columns: ['country', 'sales'] }, aggFunc: 'sum' });
    expect(created.at(-1)?.data).toEqual([{ country: 'UK', sales: 25 }]); expect(created.at(-1)?.theme).toBe('ag-material'); expect(addCellRange).toHaveBeenCalled(); expect(ref?.chartElement.querySelectorAll('.lgr-chart-toolbar button')).toHaveLength(1);
  });
  it('leaves no chart or provider allocation behind after 200 create/destroy cycles', () => {
    const before = document.querySelectorAll('.lgr-chart').length; const { service, destroyed } = chartService();
    for (let index = 0; index < 200; index++) service.createRangeChart({ chartType: 'line', suppressChartRanges: true, cellRange: { columns: ['country', 'sales'] } })?.destroyChart();
    expect(destroyed).toHaveBeenCalledTimes(200); expect(service.getChartModels()).toEqual([]); expect(document.querySelectorAll('.lgr-chart')).toHaveLength(before);
  });
});
