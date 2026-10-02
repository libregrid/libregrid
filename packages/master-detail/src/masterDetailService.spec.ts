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

  // Community 36.2 sets `aria-expanded` on every expandable row, including
  // master rows, while the container stays `role="grid"` unless grouping or tree
  // data is active. ARIA only allows `aria-expanded` on a row inside a
  // `treegrid`, so axe reports `aria-conditional-attr`. See ag-grid#12892.
  it('removes aria-expanded from master rows but leaves grouping rows alone', () => {
    const makeRowCtrl = (node: RowNode) => {
      const element = document.createElement('div');
      element.setAttribute('role', 'row');
      element.setAttribute('aria-expanded', 'false');
      return { rowNode: node, getGui: () => ({ element }) , element };
    };

    const masterRow = master('master', { id: 'master' });
    masterRow.master = true;
    const groupRow = master('group', { id: 'group' });
    groupRow.group = true;
    groupRow.master = true;

    const masterCtrl = makeRowCtrl(masterRow);
    const groupCtrl = makeRowCtrl(groupRow);
    const { bean } = makeBeanHarness(MasterDetailService, {
      gridOptions: { masterDetail: true },
      beans: { rowModel: {}, rowRenderer: { getAllRowCtrls: () => [masterCtrl, groupCtrl] } },
    });

    // postConstruct already ran once; a model pass exercises the same path again.
    bean.refreshModel({} as never);

    expect(masterCtrl.element.hasAttribute('aria-expanded')).toBe(false);
    expect(groupCtrl.element.getAttribute('aria-expanded')).toBe('false');
  });
});
