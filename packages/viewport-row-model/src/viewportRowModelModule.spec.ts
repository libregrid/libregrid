/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type GridApi,
  type IViewportDatasourceParams,
} from 'ag-grid-community';
import { ViewportRowModelModule } from './viewportRowModelModule';

interface Quote { id: string; price: number; }

let api: GridApi<Quote> | undefined;
afterEach(() => { api?.destroy(); api = undefined; });

describe('ViewportRowModelModule', () => {
  it('initialises once, reports buffered viewport ranges, and renders datasource pushes', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ViewportRowModelModule]);
    let params: IViewportDatasourceParams<Quote> | undefined;
    const ranges: Array<[number, number]> = [];
    const element = document.createElement('div');
    element.style.height = '250px';
    document.body.appendChild(element);

    api = createGrid(element, {
      rowModelType: 'viewport',
      columnDefs: [{ field: 'price' }],
      getRowId: ({ data }) => data.id,
      viewportRowModelPageSize: 10,
      viewportRowModelBufferSize: 2,
      viewportDatasource: {
        init(initParams) { params = initParams; initParams.setRowCount(100); },
        setViewportRange(firstRow, lastRow) { ranges.push([firstRow, lastRow]); },
      },
    });

    await vi.waitFor(() => expect(params).toBeDefined());
    await vi.waitFor(() => expect(ranges.length).toBeGreaterThan(0));
    expect(ranges[0]?.[0]).toBe(0);
    params?.setRowData({ 0: { id: 'q-0', price: 101 }, 1: { id: 'q-1', price: 102 } });
    await vi.waitFor(() => expect(api?.getDisplayedRowAtIndex(1)?.data).toEqual({ id: 'q-1', price: 102 }));
    expect(params?.getRow(0).data).toEqual({ id: 'q-0', price: 101 });
    expect(api.getDisplayedRowCount()).toBe(100);
  });

  it('destroys replaced datasource instances before initialising the replacement', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ViewportRowModelModule]);
    const firstDestroy = vi.fn();
    let params: IViewportDatasourceParams<Quote> | undefined;
    const element = document.createElement('div');
    document.body.appendChild(element);
    api = createGrid(element, {
      rowModelType: 'viewport',
      columnDefs: [{ field: 'price' }],
      viewportDatasource: {
        init(initParams) { params = initParams; initParams.setRowCount(4); },
        setViewportRange: () => undefined,
        destroy: firstDestroy,
      },
    });
    await vi.waitFor(() => expect(params).toBeDefined());
    api.setGridOption('viewportDatasource', { init: (next) => next.setRowCount(1), setViewportRange: () => undefined });
    await vi.waitFor(() => expect(firstDestroy).toHaveBeenCalledOnce());
  });
});
