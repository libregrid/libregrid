import { describe, expect, it } from 'vitest';
import { evaluateAdvancedFilterModel, parseAdvancedFilterExpression, serialiseAdvancedFilterModel } from './expression';

const columns = [{ id: 'country', kind: 'text' as const }, { id: 'sales', kind: 'number' as const }, { id: 'active', kind: 'boolean' as const }, { id: 'home city', kind: 'text' as const }];
describe('advanced filter expression parser', () => {
  it('parses precedence, parenthesisation, quoted column names, and every common comparison form', () => {
    const result = parseAdvancedFilterExpression('[country] CONTAINS "United" OR ([sales] >= 100 AND [active] IS TRUE) AND [home city] STARTS WITH "New"', columns);
    expect(result.error).toBeUndefined();
    expect(result.model).toEqual({ filterType: 'join', type: 'OR', conditions: [
      { filterType: 'text', colId: 'country', type: 'contains', filter: 'United' },
      { filterType: 'join', type: 'AND', conditions: [
        { filterType: 'number', colId: 'sales', type: 'greaterThanOrEqual', filter: 100 },
        { filterType: 'boolean', colId: 'active', type: 'true' },
        { filterType: 'text', colId: 'home city', type: 'startsWith', filter: 'New' },
      ] },
    ] });
  });
  it('round-trips canonical text and evaluates an expression', () => {
    const parsed = parseAdvancedFilterExpression('([country] NOT CONTAINS "x" AND [sales] < 200) OR [country] IS BLANK', columns);
    expect(parsed.error).toBeUndefined();
    const text = serialiseAdvancedFilterModel(parsed.model!);
    expect(parseAdvancedFilterExpression(text, columns).model).toEqual(parsed.model);
    expect(evaluateAdvancedFilterModel(parsed.model!, (column) => ({ country: 'United Kingdom', sales: 120 })[column as 'country' | 'sales'])).toBe(true);
    expect(evaluateAdvancedFilterModel(parsed.model!, (column) => ({ country: 'x', sales: 120 })[column as 'country' | 'sales'])).toBe(false);
  });
  it('returns useful positions for malformed source', () => {
    expect(parseAdvancedFilterExpression('[country] CONTAINS', columns).error).toEqual({ message: 'Expected a filter value', position: 18 });
    expect(parseAdvancedFilterExpression('[country', columns).error).toEqual({ message: 'Unterminated column name', position: 0 });
  });
  it('accepts bare-word values and rejects invalid operator, value, and delimiter forms', () => {
    expect(parseAdvancedFilterExpression('[country] CONTAINS United', columns).model).toEqual({ filterType: 'text', colId: 'country', type: 'contains', filter: 'United' });
    expect(parseAdvancedFilterExpression('[country] ENDS WITH "York"', columns).model).toEqual({ filterType: 'text', colId: 'country', type: 'endsWith', filter: 'York' });
    expect(parseAdvancedFilterExpression('[sales] CONTAINS 1', columns).error?.message).toBe('Expected a valid filter operator');
    expect(parseAdvancedFilterExpression('[country] IS MAYBE', columns).error?.message).toBe('Expected BLANK, NOT BLANK, TRUE, or FALSE');
    expect(parseAdvancedFilterExpression('([country] = "x"', columns).error?.message).toBe('Expected rparen');
    expect(parseAdvancedFilterExpression('[country] = "x" @', columns).error?.message).toBe("Unexpected character '@'");
  });
  it('evaluates scalar, text, blank, and boolean operator variants', () => {
    const value = (model: Parameters<typeof evaluateAdvancedFilterModel>[0], row: Record<string, unknown>) => evaluateAdvancedFilterModel(model, (column) => row[column]);
    expect(value({ filterType: 'number', colId: 'n', type: 'equals', filter: 3 }, { n: 3 })).toBe(true);
    expect(value({ filterType: 'number', colId: 'n', type: 'notEqual', filter: 3 }, { n: 2 })).toBe(true);
    expect(value({ filterType: 'number', colId: 'n', type: 'greaterThan', filter: 3 }, { n: 4 })).toBe(true);
    expect(value({ filterType: 'number', colId: 'n', type: 'greaterThanOrEqual', filter: 3 }, { n: 3 })).toBe(true);
    expect(value({ filterType: 'number', colId: 'n', type: 'lessThan', filter: 3 }, { n: 2 })).toBe(true);
    expect(value({ filterType: 'number', colId: 'n', type: 'lessThanOrEqual', filter: 3 }, { n: 3 })).toBe(true);
    expect(value({ filterType: 'text', colId: 't', type: 'equals', filter: 'abc' }, { t: 'abc' })).toBe(true);
    expect(value({ filterType: 'text', colId: 't', type: 'notEqual', filter: 'abc' }, { t: 'def' })).toBe(true);
    expect(value({ filterType: 'text', colId: 't', type: 'notContains', filter: 'x' }, { t: 'abc' })).toBe(true);
    expect(value({ filterType: 'text', colId: 't', type: 'endsWith', filter: 'c' }, { t: 'abc' })).toBe(true);
    expect(value({ filterType: 'text', colId: 't', type: 'blank' }, { t: null })).toBe(true);
    expect(value({ filterType: 'text', colId: 't', type: 'notBlank' }, { t: 'x' })).toBe(true);
    expect(value({ filterType: 'boolean', colId: 'b', type: 'true' }, { b: true })).toBe(true);
    expect(value({ filterType: 'boolean', colId: 'b', type: 'false' }, { b: false })).toBe(true);
    expect(value({ filterType: 'dateString', colId: 'd', type: 'lessThan', filter: '2025-01-01' }, { d: '2024-01-01' })).toBe(true);
    expect(value({ filterType: 'bigint', colId: 'n', type: 'greaterThan', filter: 3 }, { n: '4' })).toBe(true);
    expect(value({ filterType: 'number', colId: 'n', type: 'equals', filter: 3 }, { n: 'not-a-number' })).toBe(false);
    expect(serialiseAdvancedFilterModel(null)).toBe('');
    expect(serialiseAdvancedFilterModel({ filterType: 'boolean', colId: 'active', type: 'true' })).toBe('[active] IS TRUE');
  });
});
