/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { GROUP_AUTO_COLUMN_ID, type AgColumn, type GridOptions } from 'ag-grid-community';
import { AutoGenColsService } from './autoGenColsService';

function setup(gridOptions: Partial<GridOptions> = {}) {
  const colModel = { refreshCols: vi.fn() };
  const visibleCols = { refresh: vi.fn() };
  const rowGroupColsSvc = { columns: [] as unknown[] };
  const createBean = vi.fn((bean: { preWireBeans?: (beans: unknown) => void }) => {
    bean.preWireBeans?.({});
    return bean;
  });
  const harness = makeBeanHarness(AutoGenColsService, {
    gridOptions,
    beans: { colModel, visibleCols, rowGroupColsSvc, context: { createBean } },
  });
  return { ...harness, colModel, visibleCols, rowGroupColsSvc, createBean };
}

function makeFakeCol() {
  return {
    setColDef: vi.fn(),
    isAlive: vi.fn(() => true),
    destroy: vi.fn(),
  } as unknown as AgColumn;
}

describe('AutoGenColsService', () => {
  describe('refreshCols', () => {
    it('returns null and destroys any column when no columns are row-grouped', () => {
      const { bean, destroy } = setup();
      expect(bean.refreshCols('api')).toBeNull();
      expect(bean.columns).toEqual([]);
      destroy();
    });

    it('creates the auto group column once and returns the cached instance afterwards', () => {
      const { bean, rowGroupColsSvc, createBean, destroy } = setup();
      rowGroupColsSvc.columns.push({});

      const cols = bean.refreshCols('api');
      expect(cols).toHaveLength(1);
      expect(createBean).toHaveBeenCalledTimes(1);

      const colDef = cols![0]!.getColDef();
      expect(colDef.colId).toBe(GROUP_AUTO_COLUMN_ID);
      expect(colDef.headerName).toBe('Group');
      expect(colDef.showRowGroup).toBe(true);

      expect(bean.refreshCols('api')).toBe(cols);
      expect(createBean).toHaveBeenCalledTimes(1);
      destroy();
    });

    it('honours autoGroupColumnDef overrides but forces colId and showRowGroup', () => {
      const { bean, rowGroupColsSvc, destroy } = setup({
        autoGroupColumnDef: { headerName: 'My Groups', colId: 'user-col', showRowGroup: 'country' } as never,
      });
      rowGroupColsSvc.columns.push({});

      const colDef = bean.refreshCols('api')![0]!.getColDef();
      expect(colDef.headerName).toBe('My Groups');
      expect(colDef.colId).toBe(GROUP_AUTO_COLUMN_ID);
      expect(colDef.showRowGroup).toBe(true);
      destroy();
    });

    it('valueGetter returns the group key for group rows and null otherwise', () => {
      const { bean, rowGroupColsSvc, destroy } = setup();
      rowGroupColsSvc.columns.push({});
      const colDef = bean.refreshCols('api')![0]!.getColDef();
      const valueGetter = colDef.valueGetter as (params: unknown) => unknown;

      expect(valueGetter({ node: { group: true, key: 'US' } })).toBe('US');
      expect(valueGetter({ node: { group: true, key: null } })).toBeNull();
      expect(valueGetter({ node: { group: false } })).toBeNull();
      expect(valueGetter({ node: undefined })).toBeNull();
      destroy();
    });
  });

  describe('updateColumns', () => {
    it('re-applies the colDef when autoGroupColumnDef changes', () => {
      const { bean, gos, destroy } = setup();
      const col = makeFakeCol();
      bean.columns = [col];

      gos.set('autoGroupColumnDef', { headerName: 'New Name' });

      expect(col.setColDef).toHaveBeenCalledWith(
        expect.objectContaining({ headerName: 'New Name', colId: GROUP_AUTO_COLUMN_ID, showRowGroup: true }),
        null,
        'api',
      );
      destroy();
    });

    it('re-applies the colDef when groupDisplayType changes', () => {
      const { bean, gos, destroy } = setup();
      const col = makeFakeCol();
      bean.columns = [col];

      gos.set('groupDisplayType', 'singleColumn');

      expect(col.setColDef).toHaveBeenCalledTimes(1);
      destroy();
    });

    it('is a no-op when no column exists', () => {
      const { bean, gos, destroy } = setup();
      expect(() => gos.set('autoGroupColumnDef', { headerName: 'X' })).not.toThrow();
      expect(bean.columns).toEqual([]);
      destroy();
    });
  });

  describe('columnRowGroupChanged listener', () => {
    it('refreshes columns and visible columns, defaulting the source to api', () => {
      const { beans, colModel, visibleCols, destroy } = setup();
      (
        beans.eventSvc as unknown as { dispatchEvent: (e: { type: string }) => void }
      ).dispatchEvent({ type: 'columnRowGroupChanged' });

      expect(colModel.refreshCols).toHaveBeenCalledWith(false, 'api');
      expect(visibleCols.refresh).toHaveBeenCalledWith('api', false);
      destroy();
    });

    it('passes through an explicit event source', () => {
      const { beans, colModel, destroy } = setup();
      (
        beans.eventSvc as unknown as { dispatchEvent: (e: { type: string; source?: string }) => void }
      ).dispatchEvent({ type: 'columnRowGroupChanged', source: 'ui' });

      expect(colModel.refreshCols).toHaveBeenCalledWith(false, 'ui');
      destroy();
    });
  });

  describe('destroy', () => {
    it('destroys a live column and clears the list', () => {
      const { bean, destroy } = setup();
      const col = makeFakeCol();
      bean.columns = [col];

      destroy();

      expect(col.destroy).toHaveBeenCalledTimes(1);
      expect(bean.columns).toEqual([]);
    });

    it('does not destroy an already-dead column', () => {
      const { bean, destroy } = setup();
      const col = makeFakeCol();
      (col.isAlive as ReturnType<typeof vi.fn>).mockReturnValue(false);
      bean.columns = [col];

      destroy();

      expect(col.destroy).not.toHaveBeenCalled();
      expect(bean.columns).toEqual([]);
    });
  });
});
