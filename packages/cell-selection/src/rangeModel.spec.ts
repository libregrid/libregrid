import { describe, expect, it } from 'vitest';
import { RangeModel, fillSeries } from './rangeModel';
describe('RangeModel', () => {
  it('normalises reversed drags and retains multiple ranges', () => {
    const model = new RangeModel();
    model.setRange({ startRow: 4, endRow: 1, startColumn: 3, endColumn: 0 });
    model.setRange({ startRow: 7, endRow: 7, startColumn: 1, endColumn: 2 }, true);
    expect(model.getRanges()).toEqual([
      { startRow: 1, endRow: 4, startColumn: 0, endColumn: 3 },
      { startRow: 7, endRow: 7, startColumn: 1, endColumn: 2 },
    ]);
    expect(model.contains(2, 2)).toBe(true);
  });
  it('fills number and date series and repeats non-series values', () => {
    expect(fillSeries([1, 3], 5)).toEqual([1, 3, 5, 7, 9]);
    expect(fillSeries(['A', 'B'], 5)).toEqual(['A', 'B', 'A', 'B', 'A']);
    const dates = fillSeries([new Date('2026-01-01'), new Date('2026-01-02')], 3) as Date[];
    expect(dates[2]?.toISOString()).toContain('2026-01-03');
  });
  it('continues a weekday date series without inserting weekends', () => {
    const monday = new Date('2026-08-10T00:00:00.000Z');
    const tuesday = new Date('2026-08-11T00:00:00.000Z');
    const wednesday = new Date('2026-08-12T00:00:00.000Z');
    expect(
      fillSeries([monday, tuesday, wednesday], 7).map((value) =>
        (value as Date).toISOString().slice(0, 10),
      ),
    ).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-17',
      '2026-08-18',
    ]);
  });
  it('clears, extends, and handles empty fill input', () => {
    const model = new RangeModel();
    model.setRange({ startRow: 1, endRow: 1, startColumn: 1, endColumn: 1 });
    model.extendLatest(3, 4);
    expect(model.getRanges()).toEqual([{ startRow: 1, endRow: 3, startColumn: 1, endColumn: 4 }]);
    model.clear();
    model.extendLatest(5, 5);
    expect(model.getRanges()).toEqual([]);
    expect(model.fill([], 3)).toEqual([]);
    expect(model.fill([1], 0)).toEqual([]);
  });
});
