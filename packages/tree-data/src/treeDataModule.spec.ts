/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { TreeDataModule } from './treeDataModule';

interface Item { id: string; path?: string[]; parentId?: string; name: string; amount: number; }
let api: GridApi<Item> | undefined;
afterEach(() => { api?.destroy(); api = undefined; });

describe('TreeDataModule', () => {
  it('renders path rows with missing intermediate fillers and aggregates their descendants', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, TreeDataModule]);
    const element = document.createElement('div'); document.body.append(element);
    api = createGrid(element, {
      rowData: [{ id: 'leaf', path: ['Root', 'Missing', 'Leaf'], name: 'Leaf', amount: 7 }],
      getRowId: ({ data }) => data.id,
      treeData: true, getDataPath: ({ path }) => path!, groupDefaultExpanded: -1,
      columnDefs: [{ field: 'amount', aggFunc: 'sum' }],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    expect(api.getDisplayedRowAtIndex(0)?.data).toBeUndefined();
    expect(api.getDisplayedRowAtIndex(0)?.aggData?.amount).toBe(7);
    expect(api.getDisplayedRowAtIndex(2)?.data?.id).toBe('leaf');
  });

  it('builds a parent-id hierarchy with a stable visible parent/child order', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, TreeDataModule]);
    const element = document.createElement('div'); document.body.append(element);
    api = createGrid(element, {
      rowData: [{ id: 'parent', name: 'Parent', amount: 1 }, { id: 'child', parentId: 'parent', name: 'Child', amount: 2 }],
      getRowId: ({ data }) => data.id,
      treeData: true, treeDataParentIdField: 'parentId', groupDefaultExpanded: -1,
      columnDefs: [{ field: 'name' }],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(2));
    expect(api.getDisplayedRowAtIndex(0)?.data?.id).toBe('parent');
    expect(api.getDisplayedRowAtIndex(1)?.data?.id).toBe('child');
  });
});
