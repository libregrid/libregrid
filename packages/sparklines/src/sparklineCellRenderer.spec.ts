/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { SparklineCellRenderer } from './sparklineCellRenderer';

describe('SparklineCellRenderer', () => {
  it('creates, refreshes, labels, and destroys a supplied line/area/column/bar sparkline', () => {
    const createSparkline = vi.fn(() => ({ destroy: vi.fn() })); const renderer = new SparklineCellRenderer();
    renderer.init({ value: [1, 2, 3], createSparkline, sparklineOptions: { type: 'area', tooltip: { enabled: true } } } as never);
    expect(renderer.getGui().getAttribute('aria-label')).toBe('Sparkline with 3 values'); expect(createSparkline).toHaveBeenCalledWith(expect.objectContaining({ type: 'area', data: [1, 2, 3] }));
    renderer.refresh({ value: [3, 2], createSparkline, sparklineOptions: { type: 'bar', axis: { type: 'number' } } } as never); expect(createSparkline).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'bar', data: [3, 2] }));
    renderer.destroy(); expect(createSparkline.mock.results[1]?.value.destroy).toHaveBeenCalledOnce();
  });
});
