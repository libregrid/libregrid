/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { AdvancedFilterModule } from './advancedFilterModule';
import { AdvancedFilterService } from './advancedFilterService';

interface Row { country: string; sales: number; hidden: string; }
let api: GridApi<Row> | undefined;
afterEach(() => { api?.destroy(); api = undefined; document.body.replaceChildren(); });
describe('AdvancedFilterModule', () => {
  it('filters grid rows and exactly round-trips its public model', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, AdvancedFilterModule]);
    const host = document.createElement('div'); document.body.append(host);
    api = createGrid(host, { enableAdvancedFilter: true, columnDefs: [{ field: 'country' }, { field: 'sales', cellDataType: 'number' }, { field: 'hidden', hide: true }], rowData: [{ country: 'United Kingdom', sales: 120, hidden: 'yes' }, { country: 'Japan', sales: 300, hidden: 'no' }] });
    const model = { filterType: 'join' as const, type: 'AND' as const, conditions: [{ filterType: 'text' as const, colId: 'country', type: 'contains' as const, filter: 'United' }, { filterType: 'number' as const, colId: 'sales', type: 'lessThan' as const, filter: 200 }] };
    api.setAdvancedFilterModel(model);
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    expect(api.getAdvancedFilterModel()).toEqual(model);
    api.setAdvancedFilterModel(null);
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(2));
  });
  it('keeps builder and text editor on the same model and honours an external parent', () => {
    const service = new AdvancedFilterService();
    const parent = document.createElement('div'); document.body.append(parent);
    (service as unknown as { gos: { get(key: string): unknown }; beans: object }).gos = { get: (key: string) => key === 'advancedFilterParent' ? parent : key === 'enableAdvancedFilter' ? true : undefined };
    (service as unknown as { beans: object }).beans = { colModel: { getCols: () => [{ getId: () => 'country', getColDef: () => ({}) }] }, eventSvc: { dispatchEvent: () => undefined } };
    service.getCtrl().toggleFilterBuilder({ source: 'api', force: true });
    expect(parent.querySelector('.lgr-advanced-filter-builder')).toBeTruthy();
    [...parent.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Add condition')!.click();
    [...parent.querySelectorAll<HTMLButtonElement>('.lgr-advanced-filter-actions button')].find((button) => button.textContent === 'Apply')!.click();
    expect(service.getModel()).toEqual({ filterType: 'text', colId: 'country', type: 'contains', filter: '' });
  });
});
