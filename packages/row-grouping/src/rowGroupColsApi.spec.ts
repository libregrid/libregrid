import { describe, expect, it, vi } from 'vitest';
import type { BeanCollection, IRowGroupColsService } from 'ag-grid-community';
import {
  addRowGroupColumns,
  getRowGroupColumns,
  moveRowGroupColumn,
  removeRowGroupColumns,
  setRowGroupColumns,
} from './rowGroupColsApi';

function makeBeans(overrides: {
  svc?: Partial<IRowGroupColsService> | null;
  rowModel?: { getType(): string; refreshModel?: (params: { step: string }) => void } | null;
} = {}) {
  const svc = overrides.svc === null ? undefined : {
    setColumns: vi.fn(),
    addColumns: vi.fn(),
    removeColumns: vi.fn(),
    moveColumn: vi.fn(),
    columns: [],
    ...overrides.svc,
  };
  const rowModel = overrides.rowModel === null
    ? undefined
    : overrides.rowModel ?? { getType: () => 'clientSide', refreshModel: vi.fn() };
  return {
    beans: { rowGroupColsSvc: svc, rowModel } as unknown as BeanCollection,
    svc,
    rowModel,
  };
}

describe('rowGroupColsApi', () => {
  it('setRowGroupColumns delegates and refreshes the client-side row model', () => {
    const { beans, svc, rowModel } = makeBeans();
    setRowGroupColumns(beans, ['country']);
    expect(svc!.setColumns).toHaveBeenCalledWith(['country'], 'api');
    expect(rowModel!.refreshModel).toHaveBeenCalledWith({ step: 'group' });
  });

  it('addRowGroupColumns delegates and refreshes', () => {
    const { beans, svc, rowModel } = makeBeans();
    addRowGroupColumns(beans, ['country']);
    expect(svc!.addColumns).toHaveBeenCalledWith(['country'], 'api');
    expect(rowModel!.refreshModel).toHaveBeenCalledWith({ step: 'group' });
  });

  it('removeRowGroupColumns delegates and refreshes', () => {
    const { beans, svc, rowModel } = makeBeans();
    removeRowGroupColumns(beans, ['country']);
    expect(svc!.removeColumns).toHaveBeenCalledWith(['country'], 'api');
    expect(rowModel!.refreshModel).toHaveBeenCalledWith({ step: 'group' });
  });

  it('moveRowGroupColumn delegates and refreshes', () => {
    const { beans, svc, rowModel } = makeBeans();
    moveRowGroupColumn(beans, 0, 2);
    expect(svc!.moveColumn).toHaveBeenCalledWith(0, 2, 'api');
    expect(rowModel!.refreshModel).toHaveBeenCalledWith({ step: 'group' });
  });

  it('getRowGroupColumns returns the service columns and does not refresh', () => {
    const columns = [{ getColId: () => 'country' }];
    const { beans, rowModel } = makeBeans({ svc: { columns: columns as never } });
    expect(getRowGroupColumns(beans)).toBe(columns);
    expect(rowModel!.refreshModel).not.toHaveBeenCalled();
  });

  it('getRowGroupColumns returns an empty array when the service is missing', () => {
    const { beans } = makeBeans({ svc: null });
    expect(getRowGroupColumns(beans)).toEqual([]);
  });

  it('tolerates a missing rowGroupColsSvc for the mutating functions', () => {
    const { beans, rowModel } = makeBeans({ svc: null });
    setRowGroupColumns(beans, ['a']);
    addRowGroupColumns(beans, ['a']);
    removeRowGroupColumns(beans, ['a']);
    moveRowGroupColumn(beans, 0, 1);
    expect(rowModel!.refreshModel).toHaveBeenCalledTimes(4);
  });

  it('does not refresh a non-client-side row model', () => {
    const { beans, svc, rowModel } = makeBeans({
      rowModel: { getType: () => 'serverSide', refreshModel: vi.fn() },
    });
    setRowGroupColumns(beans, ['a']);
    expect(svc!.setColumns).toHaveBeenCalled();
    expect(rowModel!.refreshModel).not.toHaveBeenCalled();
  });
});
