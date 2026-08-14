import type { ChartType, SeriesChartType } from 'ag-grid-community';
import type { ChartProviderOptions } from './chartProvider';

export interface ChartDataSet {
  category: string;
  series: string[];
  data: Record<string, unknown>[];
}

/** Converts a grid-shaped data set into the compact AG Charts options dialect. */
export function chartOptionsFor(
  chartType: ChartType,
  dataSet: ChartDataSet,
  seriesChartTypes?: SeriesChartType[],
  onDatumClick?: (datum: Record<string, unknown>) => void,
): Omit<ChartProviderOptions, 'container' | 'theme' | 'themeOverrides'> {
  const perSeries = new Map((seriesChartTypes ?? []).map((entry) => [entry.colId, entry]));
  const series = dataSet.series.map((yKey) => {
    const configured = perSeries.get(yKey);
    return seriesOption(configured?.chartType ?? chartType, dataSet.category, yKey, configured?.secondaryAxis);
  });
  return { data: dataSet.data, series, ...(onDatumClick ? { onDatumClick } : {}) };
}

function seriesOption(chartType: ChartType, xKey: string, yKey: string, secondaryAxis?: boolean): Record<string, unknown> {
  if (chartType === 'pie') return { type: 'pie', angleKey: yKey, legendItemKey: xKey, calloutLabelKey: xKey };
  if (chartType === 'groupedBar' || chartType === 'bar') return { type: 'bar', xKey, yKey, direction: 'horizontal', ...(secondaryAxis ? { secondaryAxis: true } : {}) };
  if (chartType === 'groupedColumn' || chartType === 'column' || chartType === 'stackedColumn') return { type: 'bar', xKey, yKey, ...(chartType === 'stackedColumn' ? { stacked: true } : {}), ...(secondaryAxis ? { secondaryAxis: true } : {}) };
  if (chartType === 'stackedArea') return { type: 'area', xKey, yKey, stacked: true, ...(secondaryAxis ? { secondaryAxis: true } : {}) };
  if (chartType === 'columnLineCombo') return { type: yKey.endsWith('0') ? 'bar' : 'line', xKey, yKey, ...(secondaryAxis ? { secondaryAxis: true } : {}) };
  if (chartType === 'areaColumnCombo') return { type: yKey.endsWith('0') ? 'bar' : 'area', xKey, yKey, ...(secondaryAxis ? { secondaryAxis: true } : {}) };
  return { type: chartType === 'customCombo' ? 'line' : chartType, xKey, yKey, ...(secondaryAxis ? { secondaryAxis: true } : {}) };
}
