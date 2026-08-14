/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createGrid: vi.fn() }));
vi.mock('ag-grid-community', () => ({ createGrid: mocks.createGrid }));
import { DetailCellRenderer } from './detailCellRenderer';

const setup = (strategy: 'rows' | 'everything' | 'nothing') => {
  const detailApi = { setGridOption: vi.fn(), destroy: vi.fn() };
  mocks.createGrid.mockReturnValue(detailApi);
  const callbacks = vi.fn(({ successCallback }: { successCallback(rows: unknown[]): void }) => successCallback([{ id: 'call-1' }]));
  const service = { takeCachedDetail: vi.fn(), addDetail: vi.fn(), releaseDetail: vi.fn() };
  const parent = { id: 'master', data: { id: 'master' }, detailGridInfo: null };
  const node = { id: 'detail_master', parent, detailGridInfo: null, setRowHeight: vi.fn(), beans: { masterDetailSvc: service } };
  const masterApi = { getGridOption: (key: string) => key === 'detailCellRendererParams' ? { detailGridOptions: { columnDefs: [] }, getDetailRowData: callbacks, refreshStrategy: strategy } : key === 'detailRowHeight' ? 100 : false };
  const renderer = new DetailCellRenderer();
  renderer.init({ node, api: masterApi } as never);
  return { renderer, callbacks, detailApi, service };
};

describe('DetailCellRenderer refresh strategies', () => {
  it('rows refreshes the existing nested grid', () => {
    const { renderer, callbacks, detailApi } = setup('rows');
    expect(callbacks).toHaveBeenCalledTimes(1);
    expect(renderer.refresh()).toBe(true);
    expect(callbacks).toHaveBeenCalledTimes(2);
    expect(detailApi.setGridOption).toHaveBeenCalledWith('rowData', [{ id: 'call-1' }]);
  });

  it('everything requests renderer replacement and nothing does not fetch rows', () => {
    const everything = setup('everything');
    expect(everything.renderer.refresh()).toBe(false);
    expect(everything.callbacks).toHaveBeenCalledTimes(1);
    const nothing = setup('nothing');
    expect(nothing.renderer.refresh()).toBe(true);
    expect(nothing.callbacks).toHaveBeenCalledTimes(1);
  });

  it('releases its nested grid through the lifecycle service', () => {
    const { renderer, service } = setup('rows');
    renderer.destroy();
    expect(service.releaseDetail).toHaveBeenCalledWith('detail_master', expect.objectContaining({ info: expect.objectContaining({ id: 'detail_master' }) }));
  });
});
