/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ setup: vi.fn(), create: vi.fn(() => ({ destroy: vi.fn() })) }));
vi.mock('ag-charts-community', () => ({ AgCharts: { __createSparkline: mocks.create }, AgChartsCommunityModule: { setup: mocks.setup } }));
import { SparklineCellRenderer } from './sparklineCellRenderer';

describe('SparklineCellRenderer default AG Charts adapter', () => {
  it('uses the default line configuration when no custom factory or options are supplied', () => {
    const renderer = new SparklineCellRenderer(); renderer.init({ value: null } as never);
    expect(mocks.setup).toHaveBeenCalledOnce(); expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'line', data: [] })); renderer.destroy(); expect(mocks.create.mock.results[0]?.value.destroy).toHaveBeenCalledOnce();
  });
});
