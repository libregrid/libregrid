import { describe, expect, it } from 'vitest';
import { createGeneratedPivotDefs, generatedPivotColumnId } from './pivotResultColsService';
import type { AgColumn } from 'ag-grid-community';
import { PivotColDefService } from './pivotColDefService';

describe('generated pivot column IDs', () => {
  it('is deterministic and collision-safe for multi-key pivot values', () => {
    expect(generatedPivotColumnId(['2025', 'Q1'], 'sales')).toBe(generatedPivotColumnId(['2025', 'Q1'], 'sales'));
    expect(generatedPivotColumnId(['a|bc'], 'sales')).not.toBe(generatedPivotColumnId(['a', 'bc'], 'sales'));
    expect(generatedPivotColumnId(['2025', 'Q1'], 'sales')).not.toBe(generatedPivotColumnId(['2025', 'Q1'], 'units'));
  });
});

describe('PivotColDefService', () => {
  it('creates and copies supplied pivot definitions', () => {
    const service = new PivotColDefService();
    expect(service.createColDefsFromFields(['2025_Q1'])[0]).toMatchObject({ colId: '2025_Q1', pivotKeys: ['2025', 'Q1'] });
    const source = { colId: 'x', headerName: 'X' };
    expect(service.orderPivotResultColDefs([source])).toEqual([source]);
    expect(service.recreateColDef(source)).toEqual(source);
  });
});

describe('generated pivot definitions', () => {
  const value = (id: string, headerName?: string) => ({ getColId: () => id, getColDef: () => ({ headerName }) }) as unknown as AgColumn;
  it('handles empty axes and multiple values while keeping nested keys', () => {
    expect(createGeneratedPivotDefs([], [value('sales')])).toEqual([]);
    expect(createGeneratedPivotDefs([['A']], [])).toEqual([]);
    const defs = createGeneratedPivotDefs([['A', 'Q1']], [value('sales', 'Sales'), value('units', 'Units')]);
    expect(defs[0]).toMatchObject({ headerName: 'A' });
    const children = (defs[0] as { children: Array<{ children: Array<{ headerName: string }> }> }).children;
    expect(children[0]?.children.map((column) => column.headerName)).toEqual(['Sales', 'Units']);
  });
});
