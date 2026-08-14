/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import type { RowNode } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { MasterDetailService } from './masterDetailService';

const master = (id: string, data: Record<string, unknown>) => ({ id, data, level: 0, sourceRowIndex: 0, master: false, expanded: false, detailNode: undefined, detailGridInfo: null } as unknown as RowNode);

describe('MasterDetailService', () => {
  it('creates and removes detail nodes only for eligible master rows', () => {
    const row = master('one', { id: 'one' });
    const { bean } = makeBeanHarness(MasterDetailService, { gridOptions: { masterDetail: true, masterDefaultExpanded: 1, isRowMaster: ({ data }: { data: { enabled?: boolean } }) => data.enabled !== false }, beans: { rowModel: { forEachNode: (callback: (node: RowNode) => void) => callback(row) } } });
    bean.setMaster(row, true, false);
    expect(row.master).toBe(true);
    expect(row.expanded).toBe(true);
    expect(bean.getDetail(row)?.detail).toBe(true);
    row.expanded = false;
    bean.refreshModel({} as never);
    expect(row.detailNode).toBeUndefined();

    const notMaster = master('two', { enabled: false });
    bean.setMaster(notMaster, true, false);
    expect(notMaster.master).toBe(false);
  });

  it('bounds cached grids and stays bounded across one thousand release cycles', () => {
    const destroyed = vi.fn();
    const { bean } = makeBeanHarness(MasterDetailService, { gridOptions: { keepDetailRows: true, keepDetailRowsCount: 2 } });
    for (let index = 0; index < 1_000; index += 1) {
      const id = `detail_${index}`;
      bean.releaseDetail(id, { info: { id }, gui: document.createElement('div'), destroy: destroyed });
    }
    expect(destroyed).toHaveBeenCalledTimes(998);
    bean.destroy();
    expect(destroyed).toHaveBeenCalledTimes(1_000);
  });

  it('uses callbacks to set master default expansion', () => {
    const row = master('one', { id: 'one' });
    const { bean } = makeBeanHarness(MasterDetailService, { gridOptions: { masterDetail: true, isMasterOpenByDefault: () => true }, beans: { rowModel: {} } });
    bean.setMaster(row, true, false);
    expect(row.expanded).toBe(true);
  });
});
