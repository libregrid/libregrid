/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { FindModule } from './findModule';

interface Row { country: string; code: string; }
let api: GridApi<Row> | undefined;
afterEach(() => { api?.destroy(); api = undefined; document.body.replaceChildren(); });
describe('FindModule', () => {
  it('counts, highlights, navigates, wraps, and honours getFindText', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, FindModule]);
    const host = document.createElement('div'); document.body.append(host);
    api = createGrid(host, { findSearchValue: 'united', columnDefs: [{ field: 'country' }, { field: 'code', getFindText: ({ value }) => value === 'GB' ? 'United Kingdom' : null }], rowData: [{ country: 'United Kingdom', code: 'GB' }, { country: 'United States', code: 'US' }] });
    await vi.waitFor(() => expect(api?.findGetTotalMatches()).toBe(3));
    api.findNext(); expect(api.findGetActiveMatch()?.numOverall).toBe(1);
    api.findPrevious(); expect(api.findGetActiveMatch()?.numOverall).toBe(3);
    const node = api.getDisplayedRowAtIndex(0)!;
    expect(api.findGetNumMatches({ node, column: api.getColumn('country')! })).toBe(1);
    expect(api.findGetParts({ node, column: api.getColumn('country')!, value: 'United Kingdom' })).toEqual([{ value: 'United', match: true, activeMatch: false }, { value: ' Kingdom' }]);
    expect(host.querySelector('.lgr-find-match')).toBeTruthy();
  });
  it('supports case sensitivity, zero/cleared searches, refresh, and collapsed-detail callbacks', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, FindModule]);
    const host = document.createElement('div'); document.body.append(host);
    api = createGrid(host, { findSearchValue: 'alpha', findOptions: { caseSensitive: true, searchDetail: true }, detailCellRendererParams: { getFindMatches: ({ getMatchesForValue }) => getMatchesForValue('alpha ALPHA') } as never, columnDefs: [{ field: 'country' }], rowData: [{ country: 'Alpha' }] });
    await vi.waitFor(() => expect(api?.findGetTotalMatches()).toBe(1));
    api.setGridOption('findOptions', { caseSensitive: false, searchDetail: true });
    await vi.waitFor(() => expect(api?.findGetTotalMatches()).toBe(3));
    (api.getDisplayedRowAtIndex(0)!.data as Row).country = 'alpha alpha'; api.refreshCells(); api.findRefresh();
    await vi.waitFor(() => expect(api?.findGetTotalMatches()).toBe(4));
    api.setGridOption('findSearchValue', 'none'); await vi.waitFor(() => expect(api?.findGetTotalMatches()).toBe(0));
    api.setGridOption('findSearchValue', ''); await vi.waitFor(() => expect(api?.findGetActiveMatch()).toBeUndefined());
  });
  it('limits matches to the current pagination page when requested', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, FindModule]);
    const host = document.createElement('div'); document.body.append(host);
    api = createGrid(host, { pagination: true, paginationPageSize: 1, paginationPageSizeSelector: false, findSearchValue: 'united', findOptions: { currentPageOnly: true }, columnDefs: [{ field: 'country' }], rowData: [{ country: 'United Kingdom' }, { country: 'Other' }] });
    await vi.waitFor(() => expect(api?.findGetTotalMatches()).toBe(1));
    expect(api.paginationGetTotalPages()).toBe(2); api.paginationGoToPage(1);
    await vi.waitFor(() => expect(api?.findGetTotalMatches()).toBe(0));
  });
});
