import { describe, expect, it } from 'vitest';
import { chartOptionsFor } from './chartTranslation';

describe('chartOptionsFor', () => {
  it('maps Community chart families and configured combination series', () => {
    const data = { category: 'country', series: ['sales', 'profit'], data: [{ country: 'UK', sales: 10, profit: 2 }] };
    expect(chartOptionsFor('pie', data).series[0]).toEqual(expect.objectContaining({ type: 'pie', angleKey: 'sales' }));
    expect(chartOptionsFor('groupedBar', data).series[0]).toEqual(expect.objectContaining({ type: 'bar', direction: 'horizontal' }));
    expect(chartOptionsFor('customCombo', data, [{ colId: 'sales', chartType: 'groupedColumn' }, { colId: 'profit', chartType: 'line', secondaryAxis: true }]).series).toEqual([expect.objectContaining({ type: 'bar' }), expect.objectContaining({ type: 'line', secondaryAxis: true })]);
  });
  it('maps every supported range-chart family without losing axes or stack semantics', () => {
    const data = { category: 'month', series: ['series0', 'series1'], data: [] };
    expect(chartOptionsFor('groupedColumn', data).series[0]).toEqual(expect.objectContaining({ type: 'bar' }));
    expect(chartOptionsFor('stackedColumn', data).series[0]).toEqual(expect.objectContaining({ stacked: true }));
    expect(chartOptionsFor('line', data).series[0]).toEqual(expect.objectContaining({ type: 'line' }));
    expect(chartOptionsFor('area', data).series[0]).toEqual(expect.objectContaining({ type: 'area' }));
    expect(chartOptionsFor('stackedArea', data).series[0]).toEqual(expect.objectContaining({ type: 'area', stacked: true }));
    expect(chartOptionsFor('columnLineCombo', data).series).toEqual([expect.objectContaining({ type: 'bar' }), expect.objectContaining({ type: 'line' })]);
    expect(chartOptionsFor('areaColumnCombo', data).series).toEqual([expect.objectContaining({ type: 'bar' }), expect.objectContaining({ type: 'area' })]);
  });
});
