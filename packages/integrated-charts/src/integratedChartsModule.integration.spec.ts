/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';
import type { ChartProvider } from './chartProvider';
import { IntegratedChartsModule } from './integratedChartsModule';

afterEach(() => document.body.replaceChildren());

describe('IntegratedChartsModule', () => {
  it('creates, updates, restores, and destroys a chart through a real grid API', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, CellSelectionModule, IntegratedChartsModule]);
    const update = vi.fn(); const destroy = vi.fn();
    const provider: ChartProvider = { create: () => ({ update, destroy, getImageDataURL: () => 'data:image/png;base64,chart' }) };
    const host = document.createElement('div'); const container = document.createElement('div'); document.body.append(host, container);
    let api: GridApi<{ country: string; sales: number }> | undefined;
    try {
      api = createGrid(host, { enableCharts: true, cellSelection: true, columnDefs: [{ field: 'country' }, { field: 'sales' }], rowData: [{ country: 'UK', sales: 10 }, { country: 'US', sales: 20 }], chartProvider: provider } as never);
      api.addCellRange({ rowStartIndex: 0, rowEndIndex: 1, columns: ['country', 'sales'] });
      const chartApi = api as typeof api & { createRangeChart(params: object): { chartId: string; destroyChart(): void } | undefined; getChartModels(): { chartId: string }[] | undefined; updateChart(params: object): void; restoreChart(model: object, container?: HTMLElement): { chartId: string } | undefined; getChartImageDataURL(params: object): string | undefined };
      const ref = chartApi.createRangeChart({ chartType: 'line', cellRange: { columns: ['country', 'sales'] }, chartContainer: container });
      expect(ref?.chartId).toBeTruthy(); expect(container.querySelector('.lgr-chart')).toBeTruthy(); expect(chartApi.getChartModels()).toHaveLength(1);
      chartApi.updateChart({ type: 'rangeChartUpdate', chartId: ref!.chartId, chartType: 'pie' }); expect(update).toHaveBeenCalled();
      const model = chartApi.getChartModels()![0]!; ref?.destroyChart(); expect(destroy).toHaveBeenCalledOnce(); const restored = chartApi.restoreChart(model, container); expect(restored).toBeTruthy(); expect(chartApi.getChartImageDataURL({ chartId: restored!.chartId })).toContain('data:image');
    } finally { api?.destroy(); }
  });
});
