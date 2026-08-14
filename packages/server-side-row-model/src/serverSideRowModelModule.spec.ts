/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  ServerSideTransactionResultStatus,
  type GridApi,
  type IServerSideDatasource,
  type IServerSideGetRowsRequest,
} from 'ag-grid-community';
import { ServerSideRowModelModule } from './serverSideRowModelModule';

interface Trade {
  id: string;
  name: string;
  desk?: string;
  quantity?: number;
}

let api: GridApi<Trade> | undefined;

afterEach(() => {
  api?.destroy();
  api = undefined;
});

describe('ServerSideRowModelModule', () => {
  it('boots a flat server-side grid and renders datasource rows', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    const requests: IServerSideGetRowsRequest[] = [];
    const datasource: IServerSideDatasource<Trade> = {
      getRows(params) {
        requests.push(params.request);
        params.success({
          rowData: [
            { id: 'trade-1', name: 'Alpha' },
            { id: 'trade-2', name: 'Beta' },
          ],
          rowCount: 2,
        });
      },
    };
    const element = document.createElement('div');
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'serverSide',
      columnDefs: [{ field: 'name' }],
      getRowId: (params) => params.data.id,
      serverSideDatasource: datasource,
    });

    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(2));
    expect(api.getDisplayedRowAtIndex(0)?.data).toEqual({ id: 'trade-1', name: 'Alpha' });
    expect(requests).toEqual([
      expect.objectContaining({
        startRow: undefined,
        endRow: undefined,
        rowGroupCols: [],
        valueCols: [],
        pivotCols: [],
        pivotMode: false,
        groupKeys: [],
        filterModel: null,
        sortModel: [],
      }),
    ]);
  });

  it('refreshes through the registered ServerSideRowModelApi companion', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    let loads = 0;
    const element = document.createElement('div');
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'serverSide',
      columnDefs: [{ field: 'name' }],
      serverSideDatasource: {
        getRows(params) {
          loads += 1;
          params.success({ rowData: [{ id: String(loads), name: `Load ${loads}` }], rowCount: 1 });
        },
      },
    });

    await vi.waitFor(() => expect(loads).toBe(1));
    api.refreshServerSide();
    await vi.waitFor(() => expect(loads).toBe(2));
    expect(api.getDisplayedRowAtIndex(0)?.data).toEqual({ id: '2', name: 'Load 2' });
  });

  it('discards a stale datasource response after refresh', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    const callbacks: Array<(name: string) => void> = [];
    const element = document.createElement('div');
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'serverSide',
      columnDefs: [{ field: 'name' }],
      serverSideDatasource: {
        getRows(params) {
          callbacks.push((name) => params.success({ rowData: [{ id: name, name }], rowCount: 1 }));
        },
      },
    });

    await vi.waitFor(() => expect(callbacks).toHaveLength(1));
    api.refreshServerSide();
    await vi.waitFor(() => expect(callbacks).toHaveLength(2));

    callbacks[0]?.('stale');
    callbacks[1]?.('fresh');
    await vi.waitFor(() => expect(api?.getDisplayedRowAtIndex(0)?.data).toEqual({ id: 'fresh', name: 'fresh' }));
  });

  it('reloads with the current server-side sort model', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    const requests: IServerSideGetRowsRequest[] = [];
    const element = document.createElement('div');
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'serverSide',
      columnDefs: [{ field: 'name', sortable: true }],
      serverSideDatasource: {
        getRows(params) {
          requests.push(params.request);
          params.success({ rowData: [{ id: String(requests.length), name: 'Alpha' }], rowCount: 1 });
        },
      },
    });

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    api.applyColumnState({ state: [{ colId: 'name', sort: 'desc' }] });
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]?.sortModel).toEqual([expect.objectContaining({ colId: 'name', sort: 'desc' })]);
  });

  it('accepts rows supplied through applyServerSideRowData', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    const element = document.createElement('div');
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'serverSide',
      columnDefs: [{ field: 'name' }],
      serverSideDatasource: { getRows: () => undefined },
    });

    api.applyServerSideRowData({
      successParams: { rowData: [{ id: 'provided', name: 'Provided row' }], rowCount: 1 },
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    expect(api.getDisplayedRowAtIndex(0)?.data).toEqual({ id: 'provided', name: 'Provided row' });
  });

  it('leaves a failed load retryable through retryServerSideLoads', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    let attempts = 0;
    const element = document.createElement('div');
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'serverSide',
      columnDefs: [{ field: 'name' }],
      serverSideDatasource: {
        getRows(params) {
          attempts += 1;
          if (attempts === 1) params.fail();
          else params.success({ rowData: [{ id: 'recovered', name: 'Recovered' }], rowCount: 1 });
        },
      },
    });

    await vi.waitFor(() => expect(attempts).toBe(1));
    expect(api.getDisplayedRowCount()).toBe(0);
    api.retryServerSideLoads();
    await vi.waitFor(() => expect(attempts).toBe(2));
    expect(api.getDisplayedRowAtIndex(0)?.data).toEqual({ id: 'recovered', name: 'Recovered' });
  });

  it('uses range requests for partial blocks', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    const requests: IServerSideGetRowsRequest[] = [];
    const element = document.createElement('div');
    element.style.height = '200px';
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'serverSide',
      cacheBlockSize: 2,
      maxBlocksInCache: 2,
      columnDefs: [{ field: 'name' }],
      serverSideDatasource: {
        getRows(params) {
          requests.push(params.request);
          const start = params.request.startRow ?? 0;
          params.success({
            rowData: Array.from({ length: 2 }, (_, offset) => ({
              id: String(start + offset),
              name: `Row ${start + offset}`,
            })),
            rowCount: 100,
          });
        },
      },
    });

    await vi.waitFor(() =>
      expect(requests).toContainEqual(expect.objectContaining({ startRow: 0, endRow: 2 })),
    );
    api.getDisplayedRowAtIndex(40);
    await vi.waitFor(() =>
      expect(requests).toContainEqual(expect.objectContaining({ startRow: 40, endRow: 42 })),
    );
    expect(api.getCacheBlockState()).toEqual(
      expect.objectContaining({ '20': { pageStatus: 'loaded' } }),
    );
    api.setRowCount(120, false);
    expect(api.getDisplayedRowCount()).toBe(120);
    expect(api.isLastRowIndexKnown()).toBe(false);
  });

  it('applies synchronous and batched transactions without reloading the full store', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    let loads = 0;
    const element = document.createElement('div');
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'serverSide',
      columnDefs: [{ field: 'name' }],
      getRowId: (params) => params.data.id,
      serverSideDatasource: {
        getRows(params) {
          loads += 1;
          params.success({ rowData: [{ id: 'one', name: 'One' }], rowCount: 1 });
        },
      },
    });

    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    const result = api.applyServerSideTransaction({
      add: [{ id: 'two', name: 'Two' }],
      update: [{ id: 'one', name: 'Updated one' }],
    });
    expect(result?.status).toBe(ServerSideTransactionResultStatus.Applied);
    expect(api.getDisplayedRowAtIndex(0)?.data).toEqual({ id: 'one', name: 'Updated one' });
    expect(api.getDisplayedRowAtIndex(1)?.data).toEqual({ id: 'two', name: 'Two' });

    const callback = vi.fn();
    api.applyServerSideTransactionAsync({ remove: [{ id: 'one', name: 'ignored' }] }, callback);
    api.flushServerSideAsyncTransactions();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ status: ServerSideTransactionResultStatus.Applied }));
    expect(api.getDisplayedRowAtIndex(0)?.data).toEqual({ id: 'two', name: 'Two' });
    expect(loads).toBe(1);
  });

  it('reapplies server-side selection state after a store reload', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    const requests: IServerSideGetRowsRequest[] = [];
    const element = document.createElement('div');
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'serverSide',
      cacheBlockSize: 2,
      maxBlocksInCache: 2,
      rowSelection: { mode: 'multiRow' },
      columnDefs: [{ field: 'name' }],
      getRowId: (params) => params.data.id,
      serverSideDatasource: {
        getRows(params) {
          requests.push(params.request);
          const start = params.request.startRow ?? 0;
          params.success({
            rowData: Array.from({ length: 2 }, (_, offset) => ({
              id: String(start + offset),
              name: `Row ${start + offset}`,
            })),
            rowCount: 100,
          });
        },
      },
    });

    await vi.waitFor(() => expect(api?.getDisplayedRowAtIndex(0)?.data).toEqual({ id: '0', name: 'Row 0' }));
    api.setServerSideSelectionState({ selectAll: false, toggledNodes: ['0'] });
    expect(api.getDisplayedRowAtIndex(0)?.isSelected()).toBe(true);
    api.refreshServerSide();
    await vi.waitFor(() => expect(requests.filter((request) => request.startRow === 0).length).toBeGreaterThan(1));
    expect(api.getDisplayedRowAtIndex(0)?.isSelected()).toBe(true);
    expect(api.getServerSideSelectionState()).toEqual({ selectAll: false, toggledNodes: ['0'] });
  });

  it('creates lazy child stores and sends the complete grouping request', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    const requests: IServerSideGetRowsRequest[] = [];
    const element = document.createElement('div');
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'serverSide',
      columnDefs: [
        { field: 'desk', rowGroup: true, hide: true },
        { field: 'name', sortable: true },
        { field: 'quantity', aggFunc: 'sum' },
      ],
      getRowId: (params) => params.data.id,
      serverSideDatasource: {
        getRows(params) {
          requests.push(params.request);
          if (params.request.groupKeys.length === 0) {
            params.success({
              rowData: [{ desk: 'North', quantity: 13 }, { desk: 'South', quantity: 21 }],
              rowCount: 2,
            });
          } else {
            params.success({
              rowData: [{ id: 'north-1', desk: 'North', name: 'Alpha', quantity: 13 }],
              rowCount: 1,
            });
          }
        },
      },
    });

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toEqual(expect.objectContaining({
      groupKeys: [],
      rowGroupCols: [expect.objectContaining({ field: 'desk', id: 'desk' })],
      valueCols: [expect.objectContaining({ field: 'quantity', aggFunc: 'sum' })],
      pivotCols: [],
    }));
    api.getDisplayedRowAtIndex(0)?.setExpanded(true);
    await vi.waitFor(() => expect(requests).toContainEqual(expect.objectContaining({ groupKeys: ['North'] })));
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    expect(api.getDisplayedRowAtIndex(1)?.data).toEqual(expect.objectContaining({ id: 'north-1', desk: 'North' }));
  });

  it('does not locally aggregate server-provided group values and installs server pivot columns', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    const requests: IServerSideGetRowsRequest[] = [];
    const element = document.createElement('div');
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'serverSide',
      pivotMode: true,
      columnDefs: [
        { field: 'desk', rowGroup: true, hide: true },
        { field: 'name', pivot: true, hide: true },
        { field: 'quantity', aggFunc: 'sum' },
      ],
      serverSideDatasource: {
        getRows(params) {
          requests.push(params.request);
          params.success({
            rowData: [{ desk: 'North', quantity: 999, Alpha_sum: 42 }],
            rowCount: 1,
            pivotResultFields: ['Alpha_sum'],
          });
        },
      },
    });

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toEqual(expect.objectContaining({
      pivotMode: true,
      pivotCols: [expect.objectContaining({ field: 'name' })],
    }));
    await vi.waitFor(() => expect(api?.getColumn('Alpha_sum')).toBeDefined());
    // The group row carries the authoritative 999 supplied by the datasource;
    // SSRM never recomputes this from materialised child rows.
    expect(api.getDisplayedRowAtIndex(0)?.aggData).toEqual(expect.objectContaining({ quantity: 999, Alpha_sum: 42 }));
  });

  it('addresses a deep child store by its complete route without duplicate requests', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    const requests: IServerSideGetRowsRequest[] = [];
    const element = document.createElement('div');
    document.body.appendChild(element);
    api = createGrid(element, {
      rowModelType: 'serverSide',
      columnDefs: [
        { field: 'desk', rowGroup: true, hide: true },
        { field: 'strategy', rowGroup: true, hide: true },
        { field: 'name' },
      ],
      serverSideDatasource: { getRows(params) {
        requests.push(params.request);
        const key = params.request.groupKeys.join('/');
        if (key === '') params.success({ rowData: [{ desk: 'North' }], rowCount: 1 });
        else if (key === 'North') params.success({ rowData: [{ strategy: 'Macro' }], rowCount: 1 });
        else params.success({ rowData: [{ id: 'deep', name: 'Only leaf' }], rowCount: 1 });
      } },
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    api.getDisplayedRowAtIndex(0)?.setExpanded(true);
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(2));
    api.getDisplayedRowAtIndex(1)?.setExpanded(true);
    await vi.waitFor(() => expect(api?.getDisplayedRowAtIndex(2)?.data).toEqual({ id: 'deep', name: 'Only leaf' }));
    expect(requests.map((request) => request.groupKeys)).toEqual([[], ['North'], ['North', 'Macro']]);
  });

  it('expands all currently loaded groups without recursively storming unloaded branches', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
    const requests: IServerSideGetRowsRequest[] = [];
    const element = document.createElement('div');
    document.body.appendChild(element);
    api = createGrid(element, {
      rowModelType: 'serverSide',
      ssrmExpandAllAffectsAllRows: true,
      columnDefs: [{ field: 'desk', rowGroup: true, hide: true }, { field: 'name' }],
      serverSideDatasource: { getRows(params) {
        requests.push(params.request);
        if (params.request.groupKeys.length === 0) params.success({ rowData: [{ desk: 'North' }, { desk: 'South' }], rowCount: 2 });
        else params.success({ rowData: [{ id: params.request.groupKeys[0], name: 'Leaf' }], rowCount: 1 });
      } },
    });
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    api.expandAll();
    await vi.waitFor(() => expect(requests).toHaveLength(3));
    expect(new Set(requests.slice(1).map((request) => request.groupKeys[0]))).toEqual(new Set(['North', 'South']));
    // A one-level tree has exactly one request per loaded group: default
    // expansion never recursively fetches unknown descendants.
    expect(requests).toHaveLength(3);
  });
});
