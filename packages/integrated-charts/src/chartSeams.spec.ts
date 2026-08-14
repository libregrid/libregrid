import { describe, expect, it } from 'vitest';
import { AgChartsExports, ChartMenuListFactory, ChartTranslation, EnterpriseChartProxyFactory } from './chartSeams';

describe('chart seams', () => {
  it('exposes provider/proxy/translation seams and honours toolbar filtering', () => {
    const data = { category: 'country', series: ['sales'], data: [{ country: 'UK', sales: 1 }] };
    expect(new AgChartsExports().provider()).toHaveProperty('create'); expect(new EnterpriseChartProxyFactory().create('line', data).series).toHaveLength(1); expect(new ChartTranslation().translate('pie', data).series[0]).toEqual(expect.objectContaining({ type: 'pie' }));
    const menu = new ChartMenuListFactory(); (menu as unknown as { gos: { get(key: string): unknown } }).gos = { get: () => ({ defaultItems }: { defaultItems?: string[] }) => [...(defaultItems ?? []), 'bad'] };
    expect(menu.getItems('one')).toEqual(['chartMenu', 'chartUnlink', 'chartDownload']); (menu as unknown as { gos: { get(key: string): unknown } }).gos = { get: () => undefined }; expect(menu.getItems('two')).toEqual(['chartMenu', 'chartUnlink', 'chartDownload']);
  });
});
