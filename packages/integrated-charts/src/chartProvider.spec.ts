/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(() => ({ update: vi.fn(), destroy: vi.fn(), getImageDataURL: vi.fn(() => 'image'), download: vi.fn() })), setup: vi.fn() }));
vi.mock('ag-charts-community', () => ({ AgCharts: { create: mocks.create }, AgChartsCommunityModule: { setup: mocks.setup } }));

import { AgChartsCommunityProvider } from './chartProvider';

describe('AgChartsCommunityProvider', () => {
  it('configures AG Charts once and forwards creation, interaction, update, image, download, and destroy', () => {
    const clicked = vi.fn(); const provider = new AgChartsCommunityProvider(); new AgChartsCommunityProvider();
    const chart = provider.create({ container: document.createElement('div'), data: [{ country: 'UK', sales: 1 }], series: [{ type: 'line', xKey: 'country', yKey: 'sales' }], theme: 'ag-default', themeOverrides: { common: {} }, onDatumClick: clicked });
    expect(mocks.setup).toHaveBeenCalledTimes(1); const options = mocks.create.mock.calls[0]?.[0] as { series: { listeners: { nodeClick(event: { datum: { country: string } }): void } }[] };
    options.series[0]!.listeners.nodeClick({ datum: { country: 'UK' } }); expect(clicked).toHaveBeenCalledWith({ country: 'UK' });
    chart.update({ container: document.createElement('div'), data: [], series: [] }); expect(mocks.create.mock.results[0]?.value.update).toHaveBeenCalled();
    expect(chart.getImageDataURL?.('image/jpeg')).toBe('image'); chart.download?.('chart', 'image/png', { width: 100, height: 80 }); expect(mocks.create.mock.results[0]?.value.download).toHaveBeenCalled(); chart.destroy(); expect(mocks.create.mock.results[0]?.value.destroy).toHaveBeenCalledOnce();
  });
  it('creates plain options without an interaction callback', () => {
    const chart = new AgChartsCommunityProvider().create({ container: document.createElement('div'), data: [], series: [] });
    const options = mocks.create.mock.calls.at(-1)?.[0] as { series: unknown[]; theme?: unknown; themeOverrides?: unknown };
    expect(options.series).toEqual([]); expect(options.theme).toBeUndefined(); expect(options.themeOverrides).toBeUndefined(); chart.destroy();
  });
});
