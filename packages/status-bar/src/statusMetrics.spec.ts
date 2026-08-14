import { describe, expect, it } from 'vitest';
import { aggregate } from './statusMetrics';
describe('status metrics', () =>
  it('calculates aggregation values', () =>
    expect(aggregate({ total: 4, filtered: 2, selected: 1, values: [2, 4, Number.NaN] })).toEqual({
      count: 2,
      sum: 6,
      min: 2,
      max: 4,
      avg: 3,
    })));
