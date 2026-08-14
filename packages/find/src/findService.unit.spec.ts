/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { FindService } from './findService';

function serviceFor(search = 'a') {
  const service = new FindService(); const events = vi.fn(); const refreshCells = vi.fn();
  (service as unknown as { gos: { get(key: string): unknown }; beans: object }).gos = { get: (key: string) => key === 'findSearchValue' ? search : {} };
  (service as unknown as { beans: object }).beans = { eventSvc: { dispatchEvent: events }, rowRenderer: { refreshCells }, colModel: { getCols: () => [] }, rowModel: { forEachNode: () => undefined } };
  return { service, events, refreshCells };
}
describe('FindService direct behaviour', () => {
  it('segments active parts and handles zero matches / explicit active clearing', () => {
    const { service } = serviceFor('a'); const node = {} as never; const column = {} as never;
    expect(service.getParts({ node, column, value: 'banana' })).toEqual([{ value: 'b' }, { value: 'a', match: true, activeMatch: false }, { value: 'n' }, { value: 'a', match: true, activeMatch: false }, { value: 'n' }, { value: 'a', match: true, activeMatch: false }]);
    service.goTo(1); expect(service.activeMatch).toBeUndefined(); service.clearActive();
  });
  it('indexes callbacks for full-width/group/detail content and wraps navigation', () => {
    const { service } = serviceFor('x'); const node = { data: { value: 'x' }, fullWidth: true, group: true, rowIndex: 0 } as never;
    (service as unknown as { gos: { get(key: string): unknown }; beans: object }).gos = { get: (key: string) => key === 'findSearchValue' ? 'x' : key === 'findOptions' ? { searchDetail: true } : key === 'detailCellRendererParams' || key === 'fullWidthCellRendererParams' ? { getFindMatches: () => 1 } : key === 'groupRowRendererParams' ? { getFindText: () => 'x' } : undefined };
    (service as unknown as { beans: object }).beans = { colModel: { getCols: () => [] }, rowModel: { forEachNode: (callback: (item: unknown) => void) => callback(node) }, eventSvc: { dispatchEvent: () => undefined } };
    service.refresh(); expect(service.totalMatches).toBe(3); service.next(); service.previous(); expect(service.activeMatch?.numOverall).toBe(3);
  });
});
