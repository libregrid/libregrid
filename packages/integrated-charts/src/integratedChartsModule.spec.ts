/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { MenuItemRegistry } from '@libregrid/menu';
import { IntegratedChartsModule } from './integratedChartsModule';

describe('IntegratedChartsModule API and menu contributions', () => {
  it('delegates every public chart API to chartSvc and contributes range/pivot menu items', () => {
    const chartSvc = { createRangeChart: vi.fn(() => ({ chartId: 'range' })), createPivotChart: vi.fn(() => ({ chartId: 'pivot' })), createCrossFilterChart: vi.fn(() => ({ chartId: 'cross' })), updateChart: vi.fn(), getChartModels: vi.fn(() => []), getChartRef: vi.fn(), restoreChart: vi.fn(), getChartImageDataURL: vi.fn(() => 'data:'), downloadChart: vi.fn(), openChartToolPanel: vi.fn(), closeChartToolPanel: vi.fn() };
    const api = IntegratedChartsModule.apiFunctions as unknown as Record<string, (beans: object, ...args: never[]) => unknown>; const beans = { chartSvc };
    expect(api.createRangeChart(beans, { chartType: 'line', cellRange: { columns: ['x'] } })).toEqual({ chartId: 'range' }); expect(api.createPivotChart(beans, { chartType: 'line' })).toEqual({ chartId: 'pivot' }); expect(api.createCrossFilterChart(beans, { chartType: 'line', cellRange: { columns: ['x'] } })).toEqual({ chartId: 'cross' });
    api.updateChart(beans, { type: 'rangeChartUpdate', chartId: 'range' }); expect(api.getChartModels(beans)).toEqual([]); api.getChartRef(beans, 'range'); api.restoreChart(beans, {}); expect(api.getChartImageDataURL(beans, { chartId: 'range' })).toBe('data:'); api.downloadChart(beans, { chartId: 'range' }); api.openChartToolPanel(beans, { chartId: 'range' }); api.closeChartToolPanel(beans, { chartId: 'range' });
    expect(chartSvc.updateChart).toHaveBeenCalled(); expect(chartSvc.closeChartToolPanel).toHaveBeenCalledWith('range');
    const registry = new MenuItemRegistry(); const menuApi = { createRangeChart: vi.fn(), createPivotChart: vi.fn(), getCellRanges: () => [{ columns: [{ getColId: () => 'country' }], startRow: { rowIndex: 0 }, endRow: { rowIndex: 1 } }] };
    const range = registry.getItem('chartRange', { api: menuApi, column: null, node: null, value: null } as never); expect(range?.subMenu).toHaveLength(3);
    const first = range?.subMenu as { action(): void }[]; first[0]!.action(); expect(menuApi.createRangeChart).toHaveBeenCalled(); expect(registry.getItem('pivotChart', { api: menuApi, column: null, node: null, value: null } as never)?.name).toBe('Pivot Chart');
    expect(registry.getItem('chartRange', { api: { getCellRanges: () => [] }, column: null, node: null, value: null } as never)).toBeNull(); expect(registry.getItem('pivotChart', { api: {}, column: null, node: null, value: null } as never)).toBeNull();
    for (const fn of Object.values(api)) expect(fn({}, ...(fn.length > 1 ? ['missing'] : []) as never)).toBeUndefined();
  });
});
