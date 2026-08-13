/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  GROUP_AUTO_COLUMN_ID,
  type GridApi,
  type GridOptions,
} from 'ag-grid-community';
import { RowGroupingModule } from './rowGroupingModule';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

interface Row {
  country: string | null;
  city: string;
  sales: number;
}

function mount(options: GridOptions<Row>): { el: HTMLElement; api: GridApi<Row> } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const api = createGrid(el, options);
  return { el, api };
}

const baseRows: Row[] = [
  { country: 'US', city: 'NY', sales: 100 },
  { country: 'US', city: 'SF', sales: 200 },
  { country: 'UK', city: 'London', sales: 150 },
];

describe('Auto group column (PR 2.3)', () => {
  it('adds a Group column showing the group key, and removes it once no columns are grouped', async () => {
    const { el, api } = mount({
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'sales' }],
      rowData: baseRows,
    } as GridOptions);

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    const autoCol = api.getColumn(GROUP_AUTO_COLUMN_ID);
    expect(autoCol).toBeTruthy();
    expect(autoCol!.getColDef().headerName).toBe('Group');

    const usGroup = api.getDisplayedRowAtIndex(0)!;
    expect(usGroup.key).toBe('US');
    expect(api.getCellValue({ rowNode: usGroup, colKey: GROUP_AUTO_COLUMN_ID })).toBe('US');

    api.setRowGroupColumns([]);
    await vi.waitFor(() => expect(api.getColumn(GROUP_AUTO_COLUMN_ID)).toBeFalsy());

    el.remove();
    api.destroy();
  });

  it('appears once a row group column is added via the API, and reports child counts', async () => {
    const { el, api } = mount({
      columnDefs: [{ field: 'country', colId: 'country' }, { field: 'sales' }],
      rowData: baseRows,
    } as GridOptions);

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));
    expect(api.getColumn(GROUP_AUTO_COLUMN_ID)).toBeFalsy();

    api.addRowGroupColumns(['country']);

    await vi.waitFor(() => expect(api.getColumn(GROUP_AUTO_COLUMN_ID)).toBeTruthy());
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(2));

    const usGroup = api.getDisplayedRowAtIndex(0)!;
    expect(usGroup.allChildrenCount).toBe(2);

    el.remove();
    api.destroy();
  });

  it('expands and collapses via node.setExpanded, driven by the FlattenStage seam the renderer calls into', async () => {
    const { api } = mount({
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'city' }],
      rowData: baseRows,
    } as GridOptions);

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(2));

    const usGroup = api.getDisplayedRowAtIndex(0)!;
    usGroup.setExpanded(true);
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(4));
    expect(api.getDisplayedRowAtIndex(1)!.data?.city).toBe('NY');

    usGroup.setExpanded(false);
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(2));

    api.destroy();
  });

  it('applies autoGroupColumnDef overrides', async () => {
    const { api } = mount({
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'sales' }],
      rowData: baseRows,
      autoGroupColumnDef: { headerName: 'Location', minWidth: 300 },
    } as GridOptions);

    await vi.waitFor(() => expect(api.getColumn(GROUP_AUTO_COLUMN_ID)).toBeTruthy());
    const colDef = api.getColumn(GROUP_AUTO_COLUMN_ID)!.getColDef();
    expect(colDef.headerName).toBe('Location');
    expect(colDef.minWidth).toBe(300);
    // Non-overridable: the auto column identity always wins.
    expect(colDef.colId).toBe(GROUP_AUTO_COLUMN_ID);
    expect(colDef.showRowGroup).toBe(true);

    api.destroy();
  });

  it('groupAllowUnbalanced attaches rows missing a group value directly under the parent level', async () => {
    const rows: Row[] = [
      { country: 'US', city: 'NY', sales: 100 },
      { country: 'US', city: '', sales: 50 },
      { country: null, city: 'X', sales: 1 },
    ];

    const { api } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city', rowGroup: true },
        { field: 'sales' },
      ],
      rowData: rows,
      groupAllowUnbalanced: true,
      groupDefaultExpanded: -1,
    } as GridOptions);

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    const nodesByLevel: Record<number, string[]> = {};
    for (let i = 0; i < api.getDisplayedRowCount(); i++) {
      const node = api.getDisplayedRowAtIndex(i)!;
      (nodesByLevel[node.level] ??= []).push(
        `${node.group ? 'group' : 'leaf'}:${node.group ? node.key : node.data?.city}`,
      );
    }

    // The row with no country attaches directly under root (level 0, same
    // depth as the "US" group) instead of forming a "(Blanks)" country group.
    expect(nodesByLevel[0]).toContain('leaf:X');
    // The US row with a blank city attaches directly under "US" (level 1,
    // same depth as the "NY"/"SF" city sub-groups).
    expect(nodesByLevel[1]).toContain('leaf:');

    api.destroy();
  });

  it('groupHideParentOfSingleChild elides a group row that has exactly one child', async () => {
    const rows: Row[] = [
      { country: 'US', city: 'NY', sales: 100 },
      { country: 'UK', city: 'London', sales: 150 },
      { country: 'UK', city: 'Bristol', sales: 50 },
    ];

    const { api } = mount({
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'sales' }],
      rowData: rows,
      groupHideParentOfSingleChild: true,
      groupDefaultExpanded: -1,
    } as GridOptions);

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    const keys: (string | undefined)[] = [];
    for (let i = 0; i < api.getDisplayedRowCount(); i++) {
      keys.push(api.getDisplayedRowAtIndex(i)!.key ?? undefined);
    }
    // "US" has a single child, so its own group row is elided — the leaf
    // row (no group key) takes its place instead of a "US" group row.
    expect(keys).not.toContain('US');
    expect(keys).toContain('UK');

    api.destroy();
  });

  it('groupHideOpenParents hides an expanded group row, moving its value to the first child', async () => {
    // Single-level grouping so only the country level can be hidden — a
    // dataset where every city sub-group is also single-child would cascade
    // two hidden levels onto one row, which is a documented partial gap
    // (docs/parity/row-grouping.md), not what this test targets.
    const { api } = mount({
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'city' }],
      rowData: baseRows,
      groupHideOpenParents: true,
      groupDefaultExpanded: -1,
    } as GridOptions);

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    const groupKeys = new Set<string>();
    for (let i = 0; i < api.getDisplayedRowCount(); i++) {
      const node = api.getDisplayedRowAtIndex(i)!;
      if (node.group) groupKeys.add(node.key!);
    }
    // The "US" group row itself is hidden (it is expanded, 2 children); its
    // first child ("NY", a leaf) stands in for it and shows "US" as its own
    // displayed group-column value. "UK" (1 child) is likewise hidden.
    expect(groupKeys.size).toBe(0);

    const nyNode = api.getDisplayedRowAtIndex(0)!;
    expect(nyNode.group).toBeFalsy();
    expect(nyNode.data?.city).toBe('NY');
    expect(api.getCellValue({ rowNode: nyNode, colKey: GROUP_AUTO_COLUMN_ID })).toBe('US');

    const sfNode = api.getDisplayedRowAtIndex(1)!;
    expect(sfNode.data?.city).toBe('SF');
    // SF is not the first child, so it does not stand in for the hidden parent.
    expect(api.getCellValue({ rowNode: sfNode, colKey: GROUP_AUTO_COLUMN_ID })).toBeNull();

    api.destroy();
  });

  it('showOpenedGroup shows the parent group value on leaf rows', async () => {
    const { api } = mount({
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'city' }],
      rowData: baseRows,
      showOpenedGroup: true,
      groupDefaultExpanded: -1,
    } as GridOptions);

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    const leafNode = api.getDisplayedRowAtIndex(1)!;
    expect(leafNode.group).toBeFalsy();
    expect(leafNode.data?.city).toBe('NY');
    expect(api.getCellValue({ rowNode: leafNode, colKey: GROUP_AUTO_COLUMN_ID })).toBe('US');

    api.destroy();
  });
});
