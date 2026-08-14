/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi, type GridOptions } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { PivotModule } from './pivotModule';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, PivotModule]);

const grids: GridApi[] = [];
afterEach(() => { while (grids.length) grids.pop()?.destroy(); document.body.replaceChildren(); });

describe('PivotModule integration', () => {
  it('generates nested result columns and aggregates each row group', async () => {
    const host = document.body.appendChild(document.createElement('div'));
    const api = createGrid(host, {
      pivotMode: true,
      groupDefaultExpanded: -1,
      grandTotalRow: 'bottom',
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'year', pivot: true, enablePivot: true },
        { field: 'quarter', pivot: true, enablePivot: true },
        { field: 'sales', aggFunc: 'sum', enableValue: true },
      ],
      rowData: [
        { country: 'US', year: 2025, quarter: 'Q1', sales: 10 },
        { country: 'US', year: 2025, quarter: 'Q2', sales: 20 },
        { country: 'UK', year: 2025, quarter: 'Q1', sales: 30 },
      ],
    } as GridOptions);
    grids.push(api);

    await vi.waitFor(() => expect(api.getPivotResultColumns()?.length).toBe(2));
    expect(api.isPivotMode()).toBe(true);
    expect(api.getPivotColumns().map((column) => column.getColId())).toEqual(['year', 'quarter']);
    const q1 = api.getPivotResultColumn(['2025', 'Q1'], 'sales');
    expect(q1).not.toBeNull();
    expect(q1?.getColDef().pivotKeys).toEqual(['2025', 'Q1']);
    expect(api.getAllDisplayedColumnGroups().length).toBeGreaterThan(0);

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));
    const us = Array.from({ length: api.getDisplayedRowCount() }, (_, index) => api.getDisplayedRowAtIndex(index)!)
      .find((node) => node.group && node.key === 'US')!;
    expect(us.aggData?.[q1!.getColId()]).toBe(10);
    const q2 = api.getPivotResultColumn(['2025', 'Q2'], 'sales')!;
    expect(us.aggData?.[q2.getColId()]).toBe(20);
    const root = api.getRowNode('ROOT_NODE_ID')!;
    expect(root.aggData?.[q1.getColId()]).toBe(40);
    expect(root.aggData?.[q2.getColId()]).toBe(20);
    api.applyColumnState({ state: [{ colId: q1.getColId(), sort: 'desc' }] });
    await vi.waitFor(() => expect(api.getDisplayedRowAtIndex(0)?.key).toBe('UK'));
  });

  it('updates result columns from the pivot APIs and keeps null and undefined distinct', async () => {
    const host = document.body.appendChild(document.createElement('div'));
    const api = createGrid(host, {
      pivotMode: true,
      columnDefs: [
        { field: 'kind', enablePivot: true },
        { field: 'sales', enableValue: true, aggFunc: 'sum' },
      ],
      rowData: [{ kind: null, sales: 2 }, { kind: undefined, sales: 3 }, { kind: 'A', sales: 5 }],
    } as GridOptions);
    grids.push(api);

    api.addPivotColumns(['kind']);
    await vi.waitFor(() => expect(api.getPivotResultColumns()?.length).toBe(3));
    expect(api.getPivotResultColumn(['\u0000null'], 'sales')).not.toBeNull();
    expect(api.getPivotResultColumn(['\u0000undefined'], 'sales')).not.toBeNull();
    api.removePivotColumns(['kind']);
    await vi.waitFor(() => expect(api.getPivotResultColumns()).toBeNull());
  });

  it('bounds high-cardinality generation and produces no results without a value column', async () => {
    const host = document.body.appendChild(document.createElement('div'));
    const api = createGrid(host, {
      pivotMode: true,
      pivotMaxGeneratedColumns: 2,
      columnDefs: [{ field: 'kind', pivot: true }, { field: 'sales', aggFunc: 'sum' }],
      rowData: [{ kind: 'A', sales: 1 }, { kind: 'B', sales: 2 }, { kind: 'C', sales: 3 }],
    } as GridOptions);
    grids.push(api);
    await vi.waitFor(() => expect(api.getPivotResultColumns()?.length).toBe(2));
    api.removeValueColumns(['sales']);
    await vi.waitFor(() => expect(api.getPivotResultColumns()).toBeNull());
  });

  it('preserves primary-column state while pivot mode is toggled and retains explicit result definitions', async () => {
    const host = document.body.appendChild(document.createElement('div'));
    const api = createGrid(host, {
      pivotMode: true,
      columnDefs: [
        { field: 'group', rowGroup: true },
        { field: 'kind', pivot: true, enablePivot: true },
        { field: 'sales', aggFunc: 'sum', enableValue: true },
        { field: 'note', hide: true },
      ],
      rowData: [{ group: 'A', kind: 'x', sales: 4, note: 'keep hidden' }],
    } as GridOptions);
    grids.push(api);
    await vi.waitFor(() => expect(api.getPivotResultColumns()?.length).toBe(1));
    const source = api.getColumn('sales')!;
    api.setPivotResultColumns([{ colId: 'manual-x', headerName: 'Manual X', pivotKeys: ['x'], pivotValueColumn: source }]);
    await vi.waitFor(() => expect(api.getPivotResultColumns()?.[0]?.getColId()).toBe('manual-x'));
    api.setGridOption('pivotMode', false);
    await vi.waitFor(() => expect(api.getPivotResultColumns()).toBeNull());
    expect(api.getColumn('note')?.isVisible()).toBe(false);
    api.setGridOption('pivotMode', true);
    await vi.waitFor(() => expect(api.getPivotResultColumns()?.[0]?.getColId()).toBe('manual-x'));
  });
});
