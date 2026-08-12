/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  type GridOptions,
} from 'ag-grid-community';
import { RowGroupingModule } from './rowGroupingModule';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

describe('RowGroupingModule integration', () => {
  it('produces group rows when rowGroup is set on a ColDef', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const api = createGrid(el, {
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales' },
      ],
      rowData: [
        { country: 'US', city: 'NY', sales: 100 },
        { country: 'US', city: 'SF', sales: 200 },
        { country: 'UK', city: 'London', sales: 150 },
      ],
    } as GridOptions);

    await vi.waitFor(() => {
      const displayed = api.getDisplayedRowCount();
      expect(displayed).toBeGreaterThan(0);
    });

    const first = api.getDisplayedRowAtIndex(0)!;
    expect(first.group).toBe(true);
    expect(first.key).toBe('US');

    const second = api.getDisplayedRowAtIndex(1)!;
    expect(second.group).toBe(true);
    expect(second.key).toBe('UK');

    el.remove();
    api.destroy();
  });

  it('treats null and undefined group keys as distinct groups', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const api = createGrid(el, {
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'value' }],
      rowData: [
        { country: null, value: 1 },
        { country: undefined, value: 2 },
        { country: null, value: 3 },
      ],
    } as GridOptions);

    await vi.waitFor(() => {
      const displayed = api.getDisplayedRowCount();
      expect(displayed).toBeGreaterThan(0);
    });

    const groupKeys = new Set<string>();
    for (let i = 0; i < api.getDisplayedRowCount(); i++) {
      const node = api.getDisplayedRowAtIndex(i)!;
      if (node.group) groupKeys.add(node.key!);
    }
    expect(groupKeys.has('')).toBe(true);
    expect(groupKeys.size).toBe(1);

    el.remove();
    api.destroy();
  });

  it('multi-level grouping produces nested group rows', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const api = createGrid(el, {
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city', rowGroup: true },
        { field: 'sales' },
      ],
      rowData: [
        { country: 'US', city: 'NY', sales: 100 },
        { country: 'US', city: 'SF', sales: 200 },
        { country: 'UK', city: 'London', sales: 150 },
      ],
      groupDefaultExpanded: -1,
    } as GridOptions);

    await vi.waitFor(() => {
      const displayed = api.getDisplayedRowCount();
      expect(displayed).toBeGreaterThan(0);
    });

    const groups: string[] = [];
    for (let i = 0; i < api.getDisplayedRowCount(); i++) {
      const node = api.getDisplayedRowAtIndex(i)!;
      if (node.group) groups.push(`${node.key} (level ${node.level})`);
    }

    expect(groups).toContain('US (level 0)');
    expect(groups).toContain('UK (level 0)');
    expect(groups).toContain('NY (level 1)');
    expect(groups).toContain('SF (level 1)');
    expect(groups).toContain('London (level 1)');

    el.remove();
    api.destroy();
  });

  it('collapsed groups show only the group row, not its children', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const api = createGrid(el, {
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
      ],
      rowData: [
        { country: 'US', city: 'NY' },
        { country: 'US', city: 'SF' },
        { country: 'UK', city: 'London' },
      ],
      groupDefaultExpanded: 0,
    } as GridOptions);

    await vi.waitFor(() => {
      const displayed = api.getDisplayedRowCount();
      expect(displayed).toBe(2);
    });

    el.remove();
    api.destroy();
  });
});
