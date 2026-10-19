import { describe, it, expect } from 'vitest';
import type { AgColumn } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { AggColumnNameService } from './aggColumnNameService';

function col(
  opts: { active?: boolean; aggFunc?: unknown; pivotValueColumn?: unknown } = {},
): AgColumn {
  return {
    isValueActive: () => opts.active ?? true,
    getAggFunc: () => opts.aggFunc ?? null,
    getColDef: () => ({ pivotValueColumn: opts.pivotValueColumn }),
  } as unknown as AgColumn;
}

function harness(gridOptions: Record<string, unknown> = {}) {
  return makeBeanHarness(AggColumnNameService, { gridOptions });
}

describe('AggColumnNameService', () => {
  it('prefixes the aggregation function name', () => {
    const { bean, destroy } = harness();
    expect(bean.getHeaderName(col({ aggFunc: 'sum' }), 'Sales')).toBe('sum(Sales)');
    destroy();
  });

  it('shows func for a function-valued aggFunc', () => {
    const { bean, destroy } = harness();
    expect(bean.getHeaderName(col({ aggFunc: () => 1 }), 'Sales')).toBe('func(Sales)');
    destroy();
  });

  it('leaves the header alone when suppressed, inactive, without aggFunc, or a pivot result column', () => {
    const { bean, destroy } = harness();
    expect(bean.getHeaderName(col({ active: false, aggFunc: 'sum' }), 'Sales')).toBe('Sales');
    expect(bean.getHeaderName(col({ aggFunc: null }), 'Sales')).toBe('Sales');
    expect(bean.getHeaderName(col({ aggFunc: 'sum', pivotValueColumn: {} }), 'Sales')).toBe(
      'Sales',
    );
    expect(bean.getHeaderName(col({ aggFunc: 'sum' }), null)).toBeNull();
    destroy();

    const suppressed = harness({ suppressAggFuncInHeader: true });
    expect(suppressed.bean.getHeaderName(col({ aggFunc: 'sum' }), 'Sales')).toBe('Sales');
    suppressed.destroy();
  });
});
