import { describe, it, expect } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import type { IAggFuncParams, IAggFuncResult } from 'ag-grid-community';
import { AggFuncService } from './aggFuncService';

function params(values: unknown[]): IAggFuncParams {
  return { values } as unknown as IAggFuncParams;
}

function num(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const result = value as IAggFuncResult<number>;
  return result.toNumber?.() ?? result.value ?? null;
}

describe('AggFuncService', () => {
  const harness = () => makeBeanHarness(AggFuncService, { gridOptions: {} });

  describe('built-in registration', () => {
    it('registers all seven built-ins', () => {
      const { bean, destroy } = harness();
      for (const name of ['sum', 'min', 'max', 'count', 'avg', 'first', 'last']) {
        expect(bean.getAggFunc(name), name).toBeTypeOf('function');
      }
      destroy();
    });

    it('provides labels for built-ins and falls back to the name', () => {
      const { bean, destroy } = harness();
      expect(bean.getDefaultFuncLabel('avg')).toBe('Average');
      expect(bean.getDefaultFuncLabel('customThing')).toBe('customThing');
      destroy();
    });
  });

  describe('sum', () => {
    it.each([
      { values: [], expected: null },
      { values: [null, null], expected: null },
      { values: [1, null, 2], expected: 3 },
      { values: ['a', 'b'], expected: null },
      { values: [5], expected: 5 },
      { values: [Number.NaN, 3], expected: 3 },
      { values: [1e6, 2e6, 3e6], expected: 6e6 },
    ])('sum($values) = $expected', ({ values, expected }) => {
      const { bean, destroy } = harness();
      expect(bean.getAggFunc('sum')(params(values))).toBe(expected);
      destroy();
    });
  });

  describe('min / max', () => {
    it('handles nulls and non-numeric values', () => {
      const { bean, destroy } = harness();
      expect(bean.getAggFunc('min')(params([null, 'x', 4, 2]))).toBe(2);
      expect(bean.getAggFunc('max')(params([null, 'x', 4, 2]))).toBe(4);
      expect(bean.getAggFunc('min')(params([]))).toBeNull();
      expect(bean.getAggFunc('max')(params([null]))).toBeNull();
      destroy();
    });
  });

  describe('count', () => {
    it('counts non-null values', () => {
      const { bean, destroy } = harness();
      expect(num(bean.getAggFunc('count')(params([1, null, 'a', 2])))).toBe(3);
      expect(num(bean.getAggFunc('count')(params([])))).toBe(0);
      destroy();
    });

    it('sums child counts when aggregating groups of results', () => {
      const { bean, destroy } = harness();
      const childA = bean.getAggFunc('count')(params([1, 2, 3])) as IAggFuncResult<number>;
      const childB = bean.getAggFunc('count')(params([4])) as IAggFuncResult<number>;
      expect(num(bean.getAggFunc('count')(params([childA, childB])))).toBe(4);
      destroy();
    });
  });

  describe('avg', () => {
    it('averages numeric values, skipping nulls', () => {
      const { bean, destroy } = harness();
      expect(num(bean.getAggFunc('avg')(params([2, null, 4])))).toBe(3);
      expect(bean.getAggFunc('avg')(params([]))).toBeNull();
      expect(bean.getAggFunc('avg')(params([null, 'x']))).toBeNull();
      destroy();
    });

    it('weights child averages by their counts across nested levels', () => {
      const { bean, destroy } = harness();
      // Group A: avg of [10, 20] = 15 over 2 rows; Group B: avg of [100] = 100 over 1 row.
      const childA = bean.getAggFunc('avg')(params([10, 20])) as IAggFuncResult<number>;
      const childB = bean.getAggFunc('avg')(params([100])) as IAggFuncResult<number>;
      // Weighted average must be (15*2 + 100*1) / 3 = 43.33…, NOT (15 + 100) / 2 = 57.5.
      const parent = bean.getAggFunc('avg')(params([childA, childB]));
      expect(num(parent)).toBeCloseTo(130 / 3, 5);
      destroy();
    });
  });

  describe('first / last', () => {
    it('returns first and last non-null values', () => {
      const { bean, destroy } = harness();
      expect(bean.getAggFunc('first')(params([null, 'a', 'b']))).toBe('a');
      expect(bean.getAggFunc('last')(params(['a', 'b', null]))).toBe('b');
      expect(bean.getAggFunc('first')(params([null]))).toBeNull();
      expect(bean.getAggFunc('last')(params([]))).toBeNull();
      destroy();
    });
  });

  describe('custom agg funcs', () => {
    it('accepts funcs via the aggFuncs grid option', () => {
      const double = (p: IAggFuncParams) => (p.values[0] as number) * 2;
      const { bean, destroy } = makeBeanHarness(AggFuncService, {
        gridOptions: { aggFuncs: { double } },
      });
      expect(bean.getAggFunc('double')).toBe(double);
      destroy();
    });

    it('accepts funcs via addAggFuncs and clears everything via clear', () => {
      const { bean, destroy } = harness();
      bean.addAggFuncs({ mine: () => 42 });
      expect(bean.getAggFunc('mine')({} as IAggFuncParams)).toBe(42);
      bean.clear();
      expect(bean.getAggFunc('mine')).toBeUndefined();
      expect(bean.getAggFunc('sum')).toBeUndefined();
      destroy();
    });

    it('allowedAggFuncs restricts getFuncNames; otherwise all registered names', () => {
      const { bean, destroy } = harness();
      const col = {
        getColDef: () => ({ allowedAggFuncs: ['sum', 'avg'] }),
      } as never;
      expect(bean.getFuncNames(col)).toEqual(['sum', 'avg']);
      const unrestricted = { getColDef: () => ({}) } as never;
      expect(bean.getFuncNames(unrestricted)).toContain('sum');
      expect(bean.getFuncNames(unrestricted)).toContain('last');
      destroy();
    });

    it('getDefaultAggFunc prefers colDef.defaultAggFunc, then sum', () => {
      const { bean, destroy } = harness();
      expect(bean.getDefaultAggFunc({ getColDef: () => ({ defaultAggFunc: 'max' }) } as never)).toBe(
        'max',
      );
      expect(bean.getDefaultAggFunc({ getColDef: () => ({}) } as never)).toBe('sum');
      destroy();
    });
  });
});
