import type {
  DoesFilterPassParams,
  FilterHandlerParams,
  IMultiFilterModel,
  RowNode,
} from 'ag-grid-community';
import { describe, expect, it } from 'vitest';
import { MultiFilterHandler } from './multiFilterHandler';

type ChildModel = NonNullable<IMultiFilterModel['filterModels']>[number];

function passes(model: ChildModel | null | undefined, value: unknown): boolean {
  const handler = new MultiFilterHandler();
  handler.init({
    model: model === undefined ? null : { filterModels: model === null ? [] : [model] },
    getValue: () => value,
  } as unknown as FilterHandlerParams<unknown, unknown, IMultiFilterModel>);
  return handler.doesFilterPass({ node: {} as RowNode } as DoesFilterPassParams);
}

describe('MultiFilterHandler', () => {
  it('passes without filters and renders only meaningful child models', () => {
    expect(passes(undefined, 'anything')).toBe(true);
    expect(passes(null, 'anything')).toBe(true);

    const handler = new MultiFilterHandler();
    expect(
      handler.getModelAsString({
        filterModels: [null, { filter: 'needle' }, { type: 'equals' }, { filterType: 'set' }],
      }),
    ).toBe('needle AND equals AND set');
    expect(handler.getModelAsString(null)).toBe('');
  });

  it('handles set filters, including nullish grid values', () => {
    expect(passes({ filterType: 'set', values: ['42'] }, 42)).toBe(true);
    expect(passes({ filterType: 'set', values: [null] }, null)).toBe(true);
    expect(passes({ filterType: 'set', values: ['__libregrid_undefined__'] }, undefined)).toBe(
      true,
    );
    expect(passes({ filterType: 'set' }, 'missing')).toBe(false);
  });

  it('evaluates every text comparison with the configured case sensitivity', () => {
    expect(passes({ filterType: 'text', filter: 'RID' }, 'LibreGrid')).toBe(true);
    expect(passes({ filterType: 'text', type: 'equals', filter: 'LibreGrid' }, 'LibreGrid')).toBe(
      true,
    );
    expect(
      passes(
        { filterType: 'text', type: 'equals', filter: 'LibreGrid', caseSensitive: true },
        'libregrid',
      ),
    ).toBe(false);
    expect(passes({ filterType: 'text', type: 'notEqual', filter: 'other' }, 'LibreGrid')).toBe(
      true,
    );
    expect(passes({ filterType: 'text', type: 'startsWith', filter: 'lib' }, 'LibreGrid')).toBe(
      true,
    );
    expect(passes({ filterType: 'text', type: 'endsWith', filter: 'grid' }, 'LibreGrid')).toBe(
      true,
    );
    expect(passes({ filterType: 'text', type: 'notContains', filter: 'other' }, 'LibreGrid')).toBe(
      true,
    );
  });

  it('evaluates numeric and date comparisons, rejecting invalid values', () => {
    expect(passes({ filterType: 'number', type: 'equals', filter: 4 }, 4)).toBe(true);
    expect(passes({ filterType: 'number', type: 'notEqual', filter: 5 }, 4)).toBe(true);
    expect(passes({ filterType: 'number', type: 'lessThan', filter: 5 }, 4)).toBe(true);
    expect(passes({ filterType: 'number', type: 'lessThanOrEqual', filter: 4 }, 4)).toBe(true);
    expect(passes({ filterType: 'number', type: 'greaterThan', filter: 3 }, 4)).toBe(true);
    expect(passes({ filterType: 'number', type: 'greaterThanOrEqual', filter: 4 }, 4)).toBe(true);
    expect(passes({ filterType: 'date', type: 'equals', filter: 20260815 }, 20260815)).toBe(true);
    expect(passes({ filterType: 'number', type: 'equals', filter: 'bad' }, 4)).toBe(false);
  });
});
