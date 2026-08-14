/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { MasterDetailModule } from './masterDetailModule';

interface Master { id: string; name: string; details: Array<{ id: string; value: number }>; }
let api: GridApi<Master> | undefined;
afterEach(() => { api?.destroy(); api = undefined; });

describe('MasterDetailModule', () => {
  it('mounts a detail grid, registers it with the master API, and removes it after collapse', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, MasterDetailModule]);
    const element = document.createElement('div');
    document.body.append(element);
    api = createGrid(element, {
      rowData: [{ id: 'm1', name: 'Master', details: [{ id: 'd1', value: 7 }] }],
      getRowId: ({ data }) => data.id,
      masterDetail: true,
      masterDefaultExpanded: 1,
      columnDefs: [{ field: 'name', cellRenderer: 'agGroupCellRenderer' }],
      detailCellRendererParams: {
        detailGridOptions: { columnDefs: [{ field: 'value' }] },
        getDetailRowData: ({ data, successCallback }) => successCallback(data.details),
        refreshStrategy: 'rows',
      },
    });
    await vi.waitFor(() => expect(element.querySelector('.ag-details-grid')).toBeTruthy());
    expect(api.getDetailGridInfo('detail_m1')?.api).toBeDefined();
    const ids: string[] = [];
    api.forEachDetailGridInfo((info) => ids.push(info.id));
    expect(ids).toEqual(['detail_m1']);
    api.getRowNode('m1')?.setExpanded(false);
    await vi.waitFor(() => expect(element.querySelector('.ag-details-grid')).toBeNull());
    expect(api.getDetailGridInfo('detail_m1')).toBeUndefined();
  });
});
