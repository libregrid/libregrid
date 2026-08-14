import { describe, expect, it } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import type { AgColumn, ColumnState } from 'ag-grid-community';
import { PivotColsService } from './pivotColsService';

function column(id: string, def: Record<string, unknown> = {}): AgColumn {
  return {
    primary: true, pivotActive: false, pivotActiveIndex: -1, pivotSort: undefined,
    getColId: () => id, getColDef: () => ({ colId: id, ...def }),
  } as unknown as AgColumn;
}

function setup(columns = [column('a'), column('b')], gridOptions: Record<string, unknown> = {}) {
  const events: unknown[] = [];
  const { bean, destroy } = makeBeanHarness(PivotColsService, {
    gridOptions,
    beans: {
      colModel: { getAllCols: () => columns },
      eventSvc: { dispatchEvent: (event: unknown) => events.push(event) },
    },
  });
  return { bean, destroy, columns, events };
}

describe('PivotColsService', () => {
  it('extracts, orders, adds, removes, and dispatches pivot columns', () => {
    const a = column('a', { pivot: true, pivotIndex: 1 });
    const b = column('b', { initialPivot: true, pivotIndex: 0 });
    const { bean, destroy, events } = setup([a, b]);
    bean.extractCol(a, false); bean.extractCol(b, true); bean.commitExtract('api');
    expect(bean.columns).toEqual([a, b]);
    bean.sortByPendingState();
    expect(bean.columns).toEqual([b, a]);
    bean.removeColumns(['a'], 'api');
    expect(bean.columns).toEqual([b]);
    bean.addColumns(['a', 'missing'], 'api');
    expect(bean.columns).toEqual([b, a]);
    bean.setColumns(['a'], 'api');
    expect(bean.columns).toEqual([a]);
    expect(events.length).toBeGreaterThan(0);
    destroy();
  });

  it('syncs column state and reports sorting flags', () => {
    const a = column('a');
    a.pivotSort = 'asc';
    const { bean, destroy } = setup([a]);
    bean.syncColState(a, { pivot: true, pivotIndex: 0 } as ColumnState, undefined);
    expect(bean.columns).toEqual([a]);
    expect(bean.hasInteractivePivotSort()).toBe(true);
    bean.syncColState(a, { pivot: false } as ColumnState, undefined);
    expect(bean.columns).toEqual([]);
    destroy();
  });

  it('ignores non-primary columns and supports strict ordering configuration', () => {
    const a = column('a');
    const generated = column('generated');
    (generated as unknown as { primary: boolean }).primary = false;
    const { bean, destroy } = setup([a, generated], { pivotPanelSuppressSort: true });
    bean.extractCol(generated, true);
    bean.commitExtract('api');
    expect(bean.columns).toEqual([]);
    expect(bean.isStrictColumnOrder()).toBe(true);
    expect(bean.hasInteractivePivotSort()).toBe(false);
    expect(bean.reRankByPivotGroupOrder([], ['a'], {})).toEqual(['a']);
    bean.syncColState(a, null, { pivot: true } as ColumnState);
    expect(bean.columns).toEqual([a]);
    bean.syncColState(a, null, undefined);
    bean.addColumns([null, undefined], 'api');
    bean.removeColumns([null, undefined, 'missing'], 'api');
    bean.setColumns(undefined, 'api');
    const restored: Record<string, ColumnState> = {};
    bean.restoreColumnOrder({ a: { colId: 'a' } as ColumnState }, restored);
    expect(restored.a?.colId).toBe('a');
    bean.commitExtract('api');
    destroy();
  });
});
