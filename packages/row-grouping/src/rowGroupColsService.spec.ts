import { describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import type { AgColumn, ColumnState } from 'ag-grid-community';
import { RowGroupColsService } from './rowGroupColsService';

function makeCol(colId: string, colDef: Record<string, unknown> = {}): AgColumn {
  return {
    primary: true,
    rowGroupActive: false,
    rowGroupActiveIndex: -1,
    getColId: () => colId,
    getColDef: () => colDef,
  } as unknown as AgColumn;
}

function harness(cols: AgColumn[]) {
  return makeBeanHarness(RowGroupColsService, {
    gridOptions: {},
    beans: { colModel: { getCols: () => cols } },
  });
}

describe('RowGroupColsService', () => {
  describe('extractCol / commitExtract', () => {
    it('stages primary cols with rowGroup: true and activates them on commit', () => {
      const a = makeCol('a', { rowGroup: true });
      const b = makeCol('b');
      const { bean, beans, destroy } = harness([a, b]);
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnRowGroupChanged', onChange);

      bean.extractCol(a, true);
      bean.extractCol(a, true); // dedupe
      bean.extractCol(b, true);
      bean.commitExtract('gridInitializing');

      expect(bean.columns).toEqual([a]);
      expect(a.rowGroupActive).toBe(true);
      expect(a.rowGroupActiveIndex).toBe(0);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toMatchObject({ type: 'columnRowGroupChanged', columns: [a] });
      destroy();
    });

    it('ignores non-primary columns', () => {
      const a = makeCol('a', { rowGroup: true });
      a.primary = false;
      const { bean, destroy } = harness([a]);
      bean.extractCol(a, true);
      bean.commitExtract('gridInitializing');
      expect(bean.columns).toEqual([]);
      destroy();
    });

    it('honours initialRowGroup only for new columns', () => {
      const fresh = makeCol('fresh', { initialRowGroup: true });
      const existing = makeCol('existing', { initialRowGroup: true });
      const { bean, destroy } = harness([fresh, existing]);
      bean.extractCol(fresh, true);
      bean.extractCol(existing, false);
      bean.commitExtract('gridInitializing');
      expect(bean.columns).toEqual([fresh]);
      destroy();
    });

    it('commitExtract with nothing staged is a no-op', () => {
      const { bean, beans, destroy } = harness([]);
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnRowGroupChanged', onChange);
      bean.commitExtract('api');
      expect(onChange).not.toHaveBeenCalled();
      destroy();
    });

    it('deactivates columns dropped from the new staged set without dispatching removals', () => {
      const a = makeCol('a', { rowGroup: true });
      const b = makeCol('b', { rowGroup: true });
      const { bean, beans, destroy } = harness([a, b]);
      bean.extractCol(a, true);
      bean.commitExtract('gridInitializing');
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnRowGroupChanged', onChange);

      bean.extractCol(b, false);
      bean.commitExtract('gridInitializing');

      expect(bean.columns).toEqual([b]);
      expect(a.rowGroupActive).toBe(false);
      expect(a.rowGroupActiveIndex).toBe(-1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].columns).toEqual([b]);
      destroy();
    });
  });

  describe('syncColState', () => {
    it('ignores null state and state without a rowGroup entry', () => {
      const a = makeCol('a');
      const { bean, destroy } = harness([a]);
      bean.syncColState(a, null, undefined, 'api');
      bean.syncColState(a, {} as ColumnState, undefined, 'api');
      expect(bean.columns).toEqual([]);
      expect(bean.pendingChanged).toBeNull();
      destroy();
    });

    it('activates an inactive column at the requested rowGroupIndex', () => {
      const a = makeCol('a');
      const b = makeCol('b');
      const { bean, destroy } = harness([a, b]);
      bean.addColumns(['a'], 'api');
      bean.syncColState(b, { colId: 'b', rowGroup: true, rowGroupIndex: 0 } as ColumnState, undefined, 'api');
      expect(bean.columns).toEqual([b, a]);
      expect(b.rowGroupActive).toBe(true);
      expect(b.rowGroupActiveIndex).toBe(0);
      expect(a.rowGroupActiveIndex).toBe(1);
      expect(bean.pendingChanged?.has(b)).toBe(true);
      destroy();
    });

    it('does nothing when rowGroup: true and the column is already active', () => {
      const a = makeCol('a');
      const { bean, destroy } = harness([a]);
      bean.addColumns(['a'], 'api');
      bean.dispatchColChange('api'); // clear pending
      bean.syncColState(a, { colId: 'a', rowGroup: true } as ColumnState, undefined, 'api');
      expect(bean.pendingChanged).toBeNull();
      destroy();
    });

    it('deactivates an active column on rowGroup: false', () => {
      const a = makeCol('a');
      const { bean, destroy } = harness([a]);
      bean.addColumns(['a'], 'api');
      bean.syncColState(a, { colId: 'a', rowGroup: false } as ColumnState, undefined, 'api');
      expect(bean.columns).toEqual([]);
      expect(a.rowGroupActive).toBe(false);
      expect(a.rowGroupActiveIndex).toBe(-1);
      expect(bean.pendingChanged?.has(a)).toBe(true);
      destroy();
    });

    it('does nothing when rowGroup: false and the column is inactive', () => {
      const a = makeCol('a');
      const { bean, destroy } = harness([a]);
      bean.syncColState(a, { colId: 'a', rowGroup: false } as ColumnState, undefined, 'api');
      expect(bean.pendingChanged).toBeNull();
      destroy();
    });
  });

  describe('setColumns', () => {
    it('activates wanted keys, deactivates the rest and orders by key order', () => {
      const a = makeCol('a');
      const b = makeCol('b');
      const c = makeCol('c');
      const { bean, beans, destroy } = harness([a, b, c]);
      bean.addColumns(['a'], 'api');
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnRowGroupChanged', onChange);

      bean.setColumns(['c', b, 'missing'], 'api');

      expect(bean.columns).toEqual([c, b]);
      expect(a.rowGroupActive).toBe(false);
      expect(c.rowGroupActiveIndex).toBe(0);
      expect(b.rowGroupActiveIndex).toBe(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      destroy();
    });

    it('accepts AgColumn instances as keys and tolerates undefined colKeys', () => {
      const a = makeCol('a');
      const { bean, destroy } = harness([a]);
      bean.setColumns(undefined, 'api');
      expect(bean.columns).toEqual([]);
      bean.setColumns([a], 'api');
      expect(bean.columns).toEqual([a]);
      destroy();
    });
  });

  describe('addColumns', () => {
    it('skips null, unknown and already-active keys', () => {
      const a = makeCol('a');
      const b = makeCol('b');
      const { bean, destroy } = harness([a, b]);
      bean.addColumns(['a'], 'api');
      bean.addColumns([null, undefined, 'missing', 'a', b], 'api');
      expect(bean.columns).toEqual([a, b]);
      destroy();
    });

    it('handles an undefined keys array', () => {
      const { bean, beans, destroy } = harness([]);
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnRowGroupChanged', onChange);
      bean.addColumns(undefined, 'api');
      expect(onChange).not.toHaveBeenCalled();
      destroy();
    });
  });

  describe('removeColumns', () => {
    it('skips null, unknown and inactive keys; deactivates the rest', () => {
      const a = makeCol('a');
      const b = makeCol('b');
      const { bean, beans, destroy } = harness([a, b]);
      bean.addColumns(['a', 'b'], 'api');
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnRowGroupChanged', onChange);

      bean.removeColumns([null, 'missing', 'a'], 'api');

      expect(bean.columns).toEqual([b]);
      expect(a.rowGroupActive).toBe(false);
      expect(onChange).toHaveBeenCalledTimes(1);
      destroy();
    });

    it('handles an undefined keys array', () => {
      const { bean, beans, destroy } = harness([]);
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnRowGroupChanged', onChange);
      bean.removeColumns(undefined, 'api');
      expect(onChange).not.toHaveBeenCalled();
      destroy();
    });
  });

  describe('moveColumn', () => {
    it('is a no-op for an out-of-range fromIndex', () => {
      const a = makeCol('a');
      const { bean, beans, destroy } = harness([a]);
      bean.addColumns(['a'], 'api');
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnRowGroupChanged', onChange);
      bean.moveColumn(-1, 0, 'api');
      bean.moveColumn(5, 0, 'api');
      expect(bean.columns).toEqual([a]);
      expect(onChange).not.toHaveBeenCalled();
      destroy();
    });

    it('moves a column, clamps the target index, reindexes and dispatches', () => {
      const a = makeCol('a');
      const b = makeCol('b');
      const c = makeCol('c');
      const { bean, beans, destroy } = harness([a, b, c]);
      bean.addColumns(['a', 'b', 'c'], 'api');
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnRowGroupChanged', onChange);

      bean.moveColumn(0, 99, 'api');

      expect(bean.columns).toEqual([b, c, a]);
      expect([b.rowGroupActiveIndex, c.rowGroupActiveIndex, a.rowGroupActiveIndex]).toEqual([0, 1, 2]);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].columns).toEqual([a]);
      destroy();
    });
  });

  describe('sortByPendingState', () => {
    it('sorts by colDef.rowGroupIndex, putting columns without an index last', () => {
      const a = makeCol('a', { rowGroupIndex: 2 });
      const b = makeCol('b');
      const c = makeCol('c', { rowGroupIndex: 0 });
      const { bean, destroy } = harness([a, b, c]);
      bean.addColumns(['a', 'b', 'c'], 'api');
      bean.sortByPendingState();
      expect(bean.columns).toEqual([c, a, b]);
      expect([c.rowGroupActiveIndex, a.rowGroupActiveIndex, b.rowGroupActiveIndex]).toEqual([0, 1, 2]);
      destroy();
    });
  });

  describe('restoreColumnOrder', () => {
    it('merges incoming state into the accumulator', () => {
      const { bean, destroy } = harness([]);
      const accumulator: { [colId: string]: ColumnState } = { keep: { colId: 'keep' } };
      bean.restoreColumnOrder({ a: { colId: 'a' } }, accumulator);
      expect(accumulator).toEqual({ keep: { colId: 'keep' }, a: { colId: 'a' } });
      destroy();
    });
  });

  describe('dispatchColChange', () => {
    it('dispatches nothing when no columns are pending and clears pendingChanged', () => {
      const a = makeCol('a');
      const { bean, beans, destroy } = harness([a]);
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnRowGroupChanged', onChange);
      bean.dispatchColChange('api');
      expect(onChange).not.toHaveBeenCalled();

      bean.addColumns(['a'], 'api');
      expect(bean.pendingChanged).toBeNull();
      expect(onChange).toHaveBeenCalledTimes(1);
      destroy();
    });
  });
});
