/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { createGrid, ModuleRegistry, AllCommunityModule, type GridApi, type GridOptions } from 'ag-grid-community';
import { ColumnMenuModule } from '@libregrid/menu';
import { RowGroupingModule } from './rowGroupingModule';

ModuleRegistry.registerModules([AllCommunityModule, ColumnMenuModule, RowGroupingModule]);

interface Row {
  country: string;
  city: string;
  sales: number;
  units: number;
}

const ROW_DATA: Row[] = [
  { country: 'US', city: 'NY', sales: 100, units: 10 },
  { country: 'US', city: 'SF', sales: 200, units: 20 },
  { country: 'UK', city: 'London', sales: 300, units: 5 },
];

function bootGrid(options: GridOptions<Row>): { api: GridApi<Row>; el: HTMLElement } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const api = createGrid(el, options as GridOptions);
  return { api, el };
}

describe('showValuesAs (PR 2.5)', () => {
  it('percentOfGrandTotal on a flat (ungrouped) grid', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country' },
        { field: 'city' },
        { field: 'sales', showValuesAs: 'percentOfGrandTotal' },
      ],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));

    // Grand total = 600. NY=100 -> ~16.67%.
    await vi.waitFor(() => {
      const node = api.getDisplayedRowAtIndex(0)!;
      const value = api.getCellValue({ rowNode: node, colKey: 'sales', useFormatter: true, transformValues: true });
      expect(value).toBe('16.67%');
    });

    api.destroy();
    el.remove();
  });

  it('percentOfRowTotal divides by the sum of value columns on that row', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country' },
        { field: 'sales', enableValue: true, showValuesAs: 'percentOfRowTotal' },
        { field: 'units' },
      ],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));

    // rowTotal() sums valueColsSvc.columns — only 'sales' is one so far
    // (enableValue: true); add 'units' too so the row total is a real sum
    // of two columns rather than just 'sales' itself.
    api.addValueColumns(['units']);

    await vi.waitFor(() => {
      const node = api.getDisplayedRowAtIndex(0)!; // NY: sales=100, units=10 -> 100/(100+10) = 90.91%
      const value = api.getCellValue({ rowNode: node, colKey: 'sales', useFormatter: true, transformValues: true });
      expect(value).toBe('90.91%');
    });

    api.destroy();
    el.remove();
  });

  it('percentOfParentRowTotal divides by the nearest group ancestor total', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum', showValuesAs: 'percentOfParentRowTotal' },
      ],
      rowData: ROW_DATA,
      groupDefaultExpanded: -1,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    // US total = 300 (NY 100 + SF 200). NY -> 100/300 = 33.33%.
    await vi.waitFor(() => {
      const rows = Array.from({ length: api.getDisplayedRowCount() }, (_, i) => api.getDisplayedRowAtIndex(i)!);
      const ny = rows.find((n) => n.data?.city === 'NY')!;
      expect(api.getCellValue({ rowNode: ny, colKey: 'sales', useFormatter: true, transformValues: true })).toBe('33.33%');
    });

    api.destroy();
    el.remove();
  });

  it('percentOfParentColumnTotal is always inapplicable (no pivot support) and shows the raw value', async () => {
    const { api, el } = bootGrid({
      columnDefs: [{ field: 'country' }, { field: 'sales', showValuesAs: 'percentOfParentColumnTotal' }],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));

    await vi.waitFor(() => {
      const node = api.getDisplayedRowAtIndex(0)!;
      // Not applying -> raw value shown, not a percent string.
      expect(api.getCellValue({ rowNode: node, colKey: 'sales' })).toBe(100);
    });

    api.destroy();
    el.remove();
  });

  it('re-resolves showValuesAs when columnDefs change (newColumnsLoaded)', async () => {
    const { api, el } = bootGrid({
      columnDefs: [{ field: 'country' }, { field: 'sales' }],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));

    api.setGridOption('columnDefs', [{ field: 'country' }, { field: 'sales', showValuesAs: 'percentOfGrandTotal' }]);

    await vi.waitFor(() => {
      const node = api.getDisplayedRowAtIndex(0)!;
      expect(api.getCellValue({ rowNode: node, colKey: 'sales', useFormatter: true, transformValues: true })).toBe('16.67%');
    });

    api.destroy();
    el.remove();
  });
});

describe('showValuesAs column menu (Phase 14 A10)', () => {
  function menuItems(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('.lgr-menu-item'));
  }

  it('selects a mode through the Show Values As submenu', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country' },
        { field: 'sales', enableShowValuesAs: true },
      ],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));

    api.showColumnMenu('sales');
    await vi.waitFor(() =>
      expect(menuItems().some((elm) => elm.textContent?.trim() === 'Show Values As')).toBe(true),
    );
    // percentOfParentColumnTotal is hidden without pivot
    expect(menuItems().some((elm) => elm.textContent?.trim() === '% of Parent Column Total')).toBe(false);

    menuItems().find((elm) => elm.textContent?.trim() === 'Show Values As')!.click();
    await vi.waitFor(() =>
      expect(menuItems().some((elm) => elm.textContent?.trim() === '% of Grand Total')).toBe(true),
    );
    menuItems().find((elm) => elm.textContent?.trim() === '% of Grand Total')!.click();

    await vi.waitFor(() => {
      const node = api.getDisplayedRowAtIndex(0)!; // NY: 100/600
      expect(api.getCellValue({ rowNode: node, colKey: 'sales', useFormatter: true, transformValues: true })).toBe(
        '16.67%',
      );
    });
    // The selection round-trips through the column state.
    expect(api.getColumnState().find((s) => s.colId === 'sales')?.showValuesAs).toBe('percentOfGrandTotal');

    api.destroy();
    el.remove();
  });

  it('None clears the selection', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country' },
        { field: 'sales', enableShowValuesAs: true, showValuesAs: 'percentOfGrandTotal' },
      ],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));

    api.showColumnMenu('sales');
    await vi.waitFor(() =>
      expect(menuItems().some((elm) => elm.textContent?.trim() === 'Show Values As')).toBe(true),
    );
    menuItems().find((elm) => elm.textContent?.trim() === 'Show Values As')!.click();
    await vi.waitFor(() => expect(menuItems().some((elm) => elm.textContent?.trim() === 'None')).toBe(true));
    menuItems().find((elm) => elm.textContent?.trim() === 'None')!.click();

    await vi.waitFor(() => {
      const node = api.getDisplayedRowAtIndex(0)!;
      expect(api.getCellValue({ rowNode: node, colKey: 'sales' })).toBe(100);
    });
    expect(api.getColumnState().find((s) => s.colId === 'sales')?.showValuesAs).toBeNull();

    api.destroy();
    el.remove();
  });

  it('hides the item for columns without enableShowValuesAs', async () => {
    const { api, el } = bootGrid({
      columnDefs: [{ field: 'country' }, { field: 'sales' }],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));

    api.showColumnMenu('sales');
    await vi.waitFor(() => expect(menuItems().length).toBeGreaterThan(0));
    expect(menuItems().some((elm) => elm.textContent?.trim() === 'Show Values As')).toBe(false);

    api.destroy();
    el.remove();
  });

  it('defaultColDef.enableShowValuesAs shows the item for numeric-type columns', async () => {
    const { api, el } = bootGrid({
      defaultColDef: { enableShowValuesAs: true },
      columnDefs: [{ field: 'country', cellDataType: 'string' }, { field: 'sales', cellDataType: 'number' }],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));

    api.showColumnMenu('sales');
    await vi.waitFor(() =>
      expect(menuItems().some((elm) => elm.textContent?.trim() === 'Show Values As')).toBe(true),
    );

    api.destroy();
    el.remove();
  });

  it('defaultColDef.enableShowValuesAs hides the item for non-numeric columns', async () => {
    const { api, el } = bootGrid({
      defaultColDef: { enableShowValuesAs: true },
      columnDefs: [{ field: 'country', cellDataType: 'string' }, { field: 'sales', cellDataType: 'number' }],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));

    api.showColumnMenu('country');
    await vi.waitFor(() => expect(menuItems().length).toBeGreaterThan(0));
    expect(menuItems().some((elm) => elm.textContent?.trim() === 'Show Values As')).toBe(false);

    api.destroy();
    el.remove();
  });
});
