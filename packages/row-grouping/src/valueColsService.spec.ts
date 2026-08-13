import { describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import type { AgColumn, ColumnState } from 'ag-grid-community';
import { ValueColsService } from './valueColsService';

function makeCol(colId: string, colDef: Record<string, unknown> = {}): AgColumn {
  return {
    primary: true,
    aggregationActive: false,
    aggregationActiveIndex: -1,
    aggFunc: null,
    getColId: () => colId,
    getColDef: () => colDef,
  } as unknown as AgColumn;
}

function harness(cols: AgColumn[]) {
  return makeBeanHarness(ValueColsService, {
    gridOptions: {},
    beans: { colModel: { getCols: () => cols } },
  });
}

describe('ValueColsService', () => {
  describe('extractCol / commitExtract', () => {
    it('stages cols with a declared aggFunc, setting col.aggFunc', () => {
      const a = makeCol('a', { aggFunc: 'max' });
      const b = makeCol('b');
      const { bean, beans, destroy } = harness([a, b]);
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnValueChanged', onChange);

      bean.extractCol(a, true);
      bean.extractCol(a, true); // dedupe
      bean.extractCol(b, true);
      bean.commitExtract('gridInitializing');

      expect(bean.columns).toEqual([a]);
      expect(a.aggFunc).toBe('max');
      expect(a.aggregationActive).toBe(true);
      expect(a.aggregationActiveIndex).toBe(0);
      expect(onChange).toHaveBeenCalledTimes(1);
      destroy();
    });

    it('ignores non-primary columns', () => {
      const a = makeCol('a', { aggFunc: 'sum' });
      a.primary = false;
      const { bean, destroy } = harness([a]);
      bean.extractCol(a, true);
      bean.commitExtract('gridInitializing');
      expect(bean.columns).toEqual([]);
      destroy();
    });

    it('honours initialAggFunc only for new columns', () => {
      const fresh = makeCol('fresh', { initialAggFunc: 'avg' });
      const existing = makeCol('existing', { initialAggFunc: 'avg' });
      const { bean, destroy } = harness([fresh, existing]);
      bean.extractCol(fresh, true);
      bean.extractCol(existing, false);
      bean.commitExtract('gridInitializing');
      expect(bean.columns).toEqual([fresh]);
      expect(fresh.aggFunc).toBe('avg');
      destroy();
    });

    it('uses defaultAggFunc, then sum, for enableValue columns', () => {
      const withDefault = makeCol('withDefault', { enableValue: true, defaultAggFunc: 'min' });
      const plain = makeCol('plain', { enableValue: true });
      const { bean, destroy } = harness([withDefault, plain]);
      bean.extractCol(withDefault, false);
      bean.extractCol(plain, false);
      bean.commitExtract('gridInitializing');
      expect(withDefault.aggFunc).toBe('min');
      expect(plain.aggFunc).toBe('sum');
      destroy();
    });

    it('commitExtract with nothing staged is a no-op', () => {
      const { bean, beans, destroy } = harness([]);
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnValueChanged', onChange);
      bean.commitExtract('api');
      expect(onChange).not.toHaveBeenCalled();
      destroy();
    });

    it('deactivates columns dropped from the new staged set', () => {
      const a = makeCol('a', { aggFunc: 'sum' });
      const b = makeCol('b', { aggFunc: 'sum' });
      const { bean, beans, destroy } = harness([a, b]);
      bean.extractCol(a, true);
      bean.commitExtract('gridInitializing');
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnValueChanged', onChange);

      bean.extractCol(b, false);
      bean.commitExtract('gridInitializing');

      expect(bean.columns).toEqual([b]);
      expect(a.aggregationActive).toBe(false);
      expect(a.aggregationActiveIndex).toBe(-1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].columns).toEqual([b]);
      destroy();
    });
  });

  describe('syncColState', () => {
    it('ignores null state and state without an aggFunc entry when no default applies', () => {
      const a = makeCol('a');
      const { bean, destroy } = harness([a]);
      bean.syncColState(a, null, undefined, 'api');
      bean.syncColState(a, {} as ColumnState, undefined, 'api');
      expect(bean.columns).toEqual([]);
      expect(bean.pendingChanged).toBeNull();
      destroy();
    });

    it('falls back to defaultState.aggFunc when the state item has none', () => {
      const a = makeCol('a');
      const { bean, destroy } = harness([a]);
      bean.syncColState(a, { colId: 'a' } as ColumnState, { aggFunc: 'avg' }, 'api');
      expect(a.aggFunc).toBe('avg');
      expect(bean.columns).toEqual([a]);
      expect(bean.pendingChanged?.has(a)).toBe(true);
      destroy();
    });

    it('clears aggFunc and deactivates on aggFunc: null', () => {
      const a = makeCol('a', { aggFunc: 'sum' });
      const { bean, destroy } = harness([a]);
      bean.extractCol(a, true);
      bean.commitExtract('gridInitializing');
      bean.syncColState(a, { colId: 'a', aggFunc: null } as ColumnState, undefined, 'api');
      expect(a.aggFunc).toBeNull();
      expect(bean.columns).toEqual([]);
      expect(a.aggregationActive).toBe(false);
      expect(bean.pendingChanged?.has(a)).toBe(true);
      destroy();
    });

    it('aggFunc: null on a column with no aggFunc is a no-op', () => {
      const a = makeCol('a');
      const { bean, destroy } = harness([a]);
      bean.syncColState(a, { colId: 'a', aggFunc: null } as ColumnState, undefined, 'api');
      expect(bean.pendingChanged).toBeNull();
      destroy();
    });

    it('changes the aggFunc and activates the column', () => {
      const a = makeCol('a', { aggFunc: 'sum' });
      const { bean, destroy } = harness([a]);
      bean.syncColState(a, { colId: 'a', aggFunc: 'max' } as ColumnState, undefined, 'api');
      expect(a.aggFunc).toBe('max');
      expect(bean.columns).toEqual([a]);
      expect(bean.pendingChanged?.has(a)).toBe(true);
      destroy();
    });

    it('activates without marking pending when the aggFunc is unchanged', () => {
      const a = makeCol('a', { aggFunc: 'sum' });
      const { bean, destroy } = harness([a]);
      a.aggFunc = 'sum';
      bean.syncColState(a, { colId: 'a', aggFunc: 'sum' } as ColumnState, undefined, 'api');
      expect(bean.columns).toEqual([a]);
      expect(bean.pendingChanged).toBeNull();
      destroy();
    });
  });

  describe('setColumnAggFunc', () => {
    it('ignores unknown keys', () => {
      const { bean, beans, destroy } = harness([]);
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnValueChanged', onChange);
      bean.setColumnAggFunc('missing', 'sum', 'api');
      expect(onChange).not.toHaveBeenCalled();
      destroy();
    });

    it('sets the aggFunc, activates and dispatches', () => {
      const a = makeCol('a');
      const { bean, beans, destroy } = harness([a]);
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnValueChanged', onChange);
      bean.setColumnAggFunc('a', 'avg', 'api');
      expect(a.aggFunc).toBe('avg');
      expect(bean.columns).toEqual([a]);
      expect(onChange).toHaveBeenCalledTimes(1);
      destroy();
    });

    it('null aggFunc clears and deactivates', () => {
      const a = makeCol('a', { aggFunc: 'sum' });
      const { bean, destroy } = harness([a]);
      bean.setColumnAggFunc('a', 'sum', 'api');
      bean.setColumnAggFunc('a', null, 'api');
      expect(a.aggFunc).toBeNull();
      expect(bean.columns).toEqual([]);
      expect(a.aggregationActive).toBe(false);
      destroy();
    });
  });

  describe('setColumns', () => {
    it('activates wanted keys with a default aggFunc and clears the rest', () => {
      const a = makeCol('a', { aggFunc: 'sum' });
      const b = makeCol('b', { enableValue: true, defaultAggFunc: 'max' });
      const c = makeCol('c');
      const { bean, beans, destroy } = harness([a, b, c]);
      bean.setColumns(['a'], 'api');
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnValueChanged', onChange);

      bean.setColumns(['b', 'c', 'missing'], 'api');

      expect(bean.columns.map((col) => col.getColId())).toEqual(['b', 'c']);
      expect(a.aggFunc).toBeNull();
      expect(a.aggregationActive).toBe(false);
      expect(b.aggFunc).toBe('max');
      expect(c.aggFunc).toBe('sum');
      expect(onChange).toHaveBeenCalledTimes(1);
      destroy();
    });

    it('tolerates undefined colKeys', () => {
      const a = makeCol('a');
      const { bean, destroy } = harness([a]);
      bean.setColumns(['a'], 'api');
      bean.setColumns(undefined, 'api');
      expect(bean.columns).toEqual([]);
      destroy();
    });
  });

  describe('addColumns', () => {
    it('skips null, unknown and already-active keys', () => {
      const a = makeCol('a');
      const b = makeCol('b', { aggFunc: 'min' });
      const { bean, destroy } = harness([a, b]);
      bean.addColumns(['a'], 'api');
      bean.addColumns([null, undefined, 'missing', 'a', b], 'api');
      expect(bean.columns).toEqual([a, b]);
      expect(a.aggFunc).toBe('sum');
      expect(b.aggFunc).toBe('min');
      destroy();
    });

    it('handles an undefined keys array', () => {
      const { bean, beans, destroy } = harness([]);
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnValueChanged', onChange);
      bean.addColumns(undefined, 'api');
      expect(onChange).not.toHaveBeenCalled();
      destroy();
    });
  });

  describe('removeColumns', () => {
    it('skips null, unknown and inactive keys; clears aggFunc on the rest', () => {
      const a = makeCol('a', { aggFunc: 'sum' });
      const b = makeCol('b');
      const { bean, beans, destroy } = harness([a, b]);
      bean.addColumns(['a', 'b'], 'api');
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnValueChanged', onChange);

      bean.removeColumns([null, 'missing', 'a'], 'api');

      expect(bean.columns).toEqual([b]);
      expect(a.aggFunc).toBeNull();
      expect(a.aggregationActive).toBe(false);
      expect(onChange).toHaveBeenCalledTimes(1);
      destroy();
    });

    it('handles an undefined keys array', () => {
      const { bean, beans, destroy } = harness([]);
      const onChange = vi.fn();
      beans.eventSvc.addEventListener('columnValueChanged', onChange);
      bean.removeColumns(undefined, 'api');
      expect(onChange).not.toHaveBeenCalled();
      destroy();
    });
  });

  describe('sortByPendingState', () => {
    it('sorts by colDef.valueIndex, putting columns without an index last', () => {
      const a = makeCol('a', { valueIndex: 2 });
      const b = makeCol('b');
      const c = makeCol('c', { valueIndex: 0 });
      const { bean, destroy } = harness([a, b, c]);
      bean.addColumns(['a', 'b', 'c'], 'api');
      bean.sortByPendingState();
      expect(bean.columns).toEqual([c, a, b]);
      expect([c.aggregationActiveIndex, a.aggregationActiveIndex, b.aggregationActiveIndex]).toEqual([0, 1, 2]);
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
      beans.eventSvc.addEventListener('columnValueChanged', onChange);
      bean.dispatchColChange('api');
      expect(onChange).not.toHaveBeenCalled();

      bean.addColumns(['a'], 'api');
      expect(bean.pendingChanged).toBeNull();
      expect(onChange).toHaveBeenCalledTimes(1);
      destroy();
    });
  });
});
