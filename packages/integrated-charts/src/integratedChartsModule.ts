import type { BeanCollection, ChartModel, ChartRef, CreateCrossFilterChartParams, CreatePivotChartParams, CreateRangeChartParams, GetChartImageDataUrlParams, OpenChartToolPanelParams, UpdateChartParams, _GridChartsGridApi, _ModuleWithApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { registerMenuItems } from '@libregrid/menu';
import { chartCss } from './chartCss';
import { ChartCrossFilterService } from './chartCrossFilterService';
import { ChartService } from './chartService';
import { AgChartsExports, ChartMenuItemMapper, ChartMenuListFactory, ChartMenuService, ChartTranslation, EnterpriseChartProxyFactory } from './chartSeams';
import { VERSION } from './version';

function service(beans: BeanCollection): ChartService | undefined { return (beans as unknown as { chartSvc?: ChartService }).chartSvc; }
function createRangeChart(beans: BeanCollection, params: CreateRangeChartParams): ChartRef | undefined { return service(beans)?.createRangeChart(params); }
function createPivotChart(beans: BeanCollection, params: CreatePivotChartParams): ChartRef | undefined { return service(beans)?.createPivotChart(params); }
function createCrossFilterChart(beans: BeanCollection, params: CreateCrossFilterChartParams): ChartRef | undefined { return service(beans)?.createCrossFilterChart(params); }
function updateChart(beans: BeanCollection, params: UpdateChartParams): void { service(beans)?.updateChart(params); }
function getChartModels(beans: BeanCollection): ChartModel[] | undefined { return service(beans)?.getChartModels(); }
function getChartRef(beans: BeanCollection, chartId: string): ChartRef | undefined { return service(beans)?.getChartRef(chartId); }
function restoreChart(beans: BeanCollection, model: ChartModel, chartContainer?: HTMLElement): ChartRef | undefined { return service(beans)?.restoreChart(model, chartContainer); }
function getChartImageDataURL(beans: BeanCollection, params: GetChartImageDataUrlParams): string | undefined { return service(beans)?.getChartImageDataURL(params); }
function downloadChart(beans: BeanCollection, params: { chartId: string; fileName?: string; fileFormat?: string; dimensions?: { width: number; height: number } }): void { service(beans)?.downloadChart(params); }
function openChartToolPanel(beans: BeanCollection, params: OpenChartToolPanelParams): void { service(beans)?.openChartToolPanel(params); }
function closeChartToolPanel(beans: BeanCollection, params: { chartId: string }): void { service(beans)?.closeChartToolPanel(params.chartId); }

registerMenuItems([
  { name: 'chartRange', order: 30, factory: ({ api }) => {
    const chartApi = api as typeof api & { createRangeChart?(params: CreateRangeChartParams): ChartRef | undefined; getCellRanges?(): { columns: { getColId(): string }[]; startRow?: { rowIndex: number }; endRow?: { rowIndex: number } }[] | null };
    const selected = chartApi.getCellRanges?.()?.[0]; if (!chartApi.createRangeChart || !selected) return null;
    return { name: 'Chart Range', subMenu: ['groupedColumn', 'line', 'pie'].map((chartType) => ({ name: chartType, action: () => { const range = chartApi.getCellRanges?.()?.[0]; if (!range) return; chartApi.createRangeChart?.({ chartType: chartType as CreateRangeChartParams['chartType'], cellRange: { columns: range.columns.map((column) => column.getColId()), rowStartIndex: range.startRow?.rowIndex ?? null, rowEndIndex: range.endRow?.rowIndex ?? null } }); } })) };
  } },
  { name: 'pivotChart', order: 31, factory: ({ api }) => {
    const chartApi = api as typeof api & { createPivotChart?(params: CreatePivotChartParams): ChartRef | undefined };
    return chartApi.createPivotChart ? { name: 'Pivot Chart', action: () => chartApi.createPivotChart?.({ chartType: 'groupedColumn' }) } : null;
  } },
]);

/** Registers range, pivot, cross-filter and stateful AG Charts Community integration. @feature Integrated Charts */
export const IntegratedChartsModule: _ModuleWithApi<_GridChartsGridApi> = {
  moduleName: 'IntegratedCharts', version: VERSION, enterprise: true,
  dependsOn: [EnterpriseCoreModule, CellSelectionModule], beans: [AgChartsExports, EnterpriseChartProxyFactory, ChartTranslation, ChartMenuService, ChartMenuItemMapper, ChartMenuListFactory, ChartCrossFilterService, ChartService], css: [chartCss],
  apiFunctions: { createRangeChart, createPivotChart, createCrossFilterChart, updateChart, getChartModels, getChartRef, restoreChart, getChartImageDataURL, downloadChart, openChartToolPanel, closeChartToolPanel },
};
