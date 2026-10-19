/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  type GridApi,
  type GridOptions,
} from 'ag-grid-community';
import { RowGroupingModule } from './rowGroupingModule';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

const rowData = [
  { country: 'US', city: 'NY' },
  { country: 'UK', city: 'London' },
];

async function mount(options: Partial<GridOptions> = {}): Promise<GridApi> {
  const api = createGrid(document.createElement('div'), {
    columnDefs: [{ field: 'country' }, { field: 'city' }],
    rowData,
    ...options,
  });
  await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));
  return api;
}

const visible = (api: GridApi, colId: string) => api.getColumn(colId)!.isVisible();

describe('column visibility on group / ungroup', () => {
  it('hides a column when grouped via the API and shows it again when ungrouped', async () => {
    const api = await mount();
    api.addRowGroupColumns(['country']);
    expect(visible(api, 'country')).toBe(false);
    expect(visible(api, 'city')).toBe(true);

    api.removeRowGroupColumns(['country']);
    expect(visible(api, 'country')).toBe(true);
    api.destroy();
  });

  it('applies to setRowGroupColumns in both directions', async () => {
    const api = await mount();
    api.setRowGroupColumns(['country']);
    expect(visible(api, 'country')).toBe(false);
    api.setRowGroupColumns(['city']);
    expect(visible(api, 'country')).toBe(true);
    expect(visible(api, 'city')).toBe(false);
    api.destroy();
  });

  it("leaves colDef-grouped columns alone at creation", async () => {
    const api = await mount({ columnDefs: [{ field: 'country', rowGroup: true }, { field: 'city' }] });
    expect(visible(api, 'country')).toBe(true);
    api.destroy();
  });

  it('suppressGroupChangesColumnVisibility: true prevents both changes', async () => {
    const api = await mount({ suppressGroupChangesColumnVisibility: true });
    api.addRowGroupColumns(['country']);
    expect(visible(api, 'country')).toBe(true);
    api.removeRowGroupColumns(['country']);
    expect(visible(api, 'country')).toBe(true);
    api.destroy();
  });

  it("'suppressHideOnGroup' keeps the column visible on group but shows it on ungroup", async () => {
    const api = await mount({ suppressGroupChangesColumnVisibility: 'suppressHideOnGroup' });
    api.addRowGroupColumns(['country']);
    expect(visible(api, 'country')).toBe(true);
    api.setColumnsVisible(['country'], false);
    api.removeRowGroupColumns(['country']);
    expect(visible(api, 'country')).toBe(true);
    api.destroy();
  });

  it("'suppressShowOnUngroup' hides on group but leaves the column hidden on ungroup", async () => {
    const api = await mount({ suppressGroupChangesColumnVisibility: 'suppressShowOnUngroup' });
    api.addRowGroupColumns(['country']);
    expect(visible(api, 'country')).toBe(false);
    api.removeRowGroupColumns(['country']);
    expect(visible(api, 'country')).toBe(false);
    api.destroy();
  });

  it('honours the deprecated suppressRowGroupHidesColumns / suppressMakeColumnVisibleAfterUnGroup', async () => {
    const api = await mount({ suppressRowGroupHidesColumns: true });
    api.addRowGroupColumns(['country']);
    expect(visible(api, 'country')).toBe(true);
    api.destroy();

    const api2 = await mount({ suppressMakeColumnVisibleAfterUnGroup: true });
    api2.addRowGroupColumns(['country']);
    api2.removeRowGroupColumns(['country']);
    expect(visible(api2, 'country')).toBe(false);
    api2.destroy();
  });
});
