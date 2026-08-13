/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import type { AgColumn } from 'ag-grid-community';
import { ShowRowGroupColsService } from './showRowGroupColsService';

function makeCol(colId: string): AgColumn {
  return {
    rowGroupActive: false,
    showRowGroupCol: null,
    getColId: () => colId,
  } as unknown as AgColumn;
}

function harness(autoCols: AgColumn[] | undefined, groupCols: AgColumn[] | undefined) {
  return makeBeanHarness(ShowRowGroupColsService, {
    gridOptions: {},
    beans: {
      ...(autoCols ? { autoColSvc: { columns: autoCols } } : {}),
      ...(groupCols ? { rowGroupColsSvc: { columns: groupCols } } : {}),
    },
  });
}

describe('ShowRowGroupColsService', () => {
  describe('refresh', () => {
    it('stamps the single auto group column onto every row-group source column', () => {
      const auto = makeCol('ag-Grid-AutoColumn');
      const source = makeCol('country');
      const { bean, destroy } = harness([auto], [source]);
      bean.refresh();
      expect(bean.columns).toEqual([auto]);
      expect(source.showRowGroupCol).toBe(auto);
      destroy();
    });

    it('stamps null when there is no auto group column', () => {
      const source = makeCol('country');
      source.showRowGroupCol = makeCol('stale');
      const { bean, destroy } = harness(undefined, [source]);
      bean.refresh();
      expect(bean.columns).toEqual([]);
      expect(source.showRowGroupCol).toBeNull();
      destroy();
    });

    it('refreshes in response to columnRowGroupChanged', () => {
      const auto = makeCol('ag-Grid-AutoColumn');
      const source = makeCol('country');
      const { beans, destroy } = harness([auto], [source]);
      expect(source.showRowGroupCol).toBeNull();
      beans.eventSvc.dispatchEvent({ type: 'columnRowGroupChanged' });
      expect(source.showRowGroupCol).toBe(auto);
      destroy();
    });
  });

  describe('getSourceColumnsForGroupColumn', () => {
    it('returns null for a column that is not a group display column', () => {
      const auto = makeCol('ag-Grid-AutoColumn');
      const source = makeCol('country');
      const { bean, destroy } = harness([auto], [source]);
      bean.refresh();
      expect(bean.getSourceColumnsForGroupColumn(makeCol('other'))).toBeNull();
      destroy();
    });

    it('returns the row-group source columns for the group display column', () => {
      const auto = makeCol('ag-Grid-AutoColumn');
      const source = makeCol('country');
      const { bean, destroy } = harness([auto], [source]);
      bean.refresh();
      expect(bean.getSourceColumnsForGroupColumn(auto)).toEqual([source]);
      destroy();
    });

    it('returns null when there are no row-group source columns', () => {
      const auto = makeCol('ag-Grid-AutoColumn');
      const { bean, destroy } = harness([auto], []);
      bean.refresh();
      expect(bean.getSourceColumnsForGroupColumn(auto)).toBeNull();
      destroy();
    });
  });

  describe('isRowGroupDisplayed', () => {
    it('is false for a column that is not row-group active', () => {
      const { bean, destroy } = harness(undefined, undefined);
      expect(bean.isRowGroupDisplayed(makeCol('country'), 'ag-Grid-AutoColumn')).toBe(false);
      destroy();
    });

    it('is true only when the column is displayed by the given display column', () => {
      const auto = makeCol('ag-Grid-AutoColumn');
      const other = makeCol('other');
      const { bean, destroy } = harness(undefined, undefined);
      const source = makeCol('country');
      source.rowGroupActive = true;
      source.showRowGroupCol = auto;
      expect(bean.isRowGroupDisplayed(source, 'ag-Grid-AutoColumn')).toBe(true);
      expect(bean.isRowGroupDisplayed(source, 'other')).toBe(false);
      source.showRowGroupCol = other;
      expect(bean.isRowGroupDisplayed(source, 'ag-Grid-AutoColumn')).toBe(false);
      destroy();
    });
  });

  describe('coupled-sort defaults', () => {
    it('isGroupSortMixed is always false', () => {
      const { bean, destroy } = harness(undefined, undefined);
      expect(bean.isGroupSortMixed(makeCol('a'), 'asc')).toBe(false);
      expect(bean.isGroupSortMixed(makeCol('a'), null)).toBe(false);
      destroy();
    });

    it('interleaveSortedColumns returns the input unchanged', () => {
      const { bean, destroy } = harness(undefined, undefined);
      const sorted = [makeCol('a'), makeCol('b')];
      expect(bean.interleaveSortedColumns(sorted)).toBe(sorted);
      destroy();
    });

    it('fillCoupledSortIndexMap fills nothing and returns 0', () => {
      const { bean, destroy } = harness(undefined, undefined);
      const map = new Map<AgColumn, number>();
      expect(bean.fillCoupledSortIndexMap([makeCol('a')], map)).toBe(0);
      expect(map.size).toBe(0);
      destroy();
    });
  });
});
