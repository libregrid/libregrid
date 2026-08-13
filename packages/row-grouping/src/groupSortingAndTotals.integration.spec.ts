/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  GROUP_AUTO_COLUMN_ID,
  GRAND_TOTAL_ROW_ID,
  GROUP_TOTAL_ROW_ID_PREFIX,
  type GridApi,
  type GridOptions,
} from 'ag-grid-community';
import { RowGroupingModule } from './rowGroupingModule';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

interface Row {
  country: string;
  city: string;
  sales: number;
}

const ROW_DATA: Row[] = [
  { country: 'US', city: 'NY', sales: 300 },
  { country: 'US', city: 'SF', sales: 100 },
  { country: 'UK', city: 'London', sales: 200 },
];

function bootGrid(options: GridOptions<Row>): { api: GridApi<Row>; el: HTMLElement } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const api = createGrid(el, options as GridOptions);
  return { api, el };
}

function displayedKeys(api: GridApi): (string | undefined)[] {
  const out: (string | undefined)[] = [];
  for (let i = 0; i < api.getDisplayedRowCount(); i++) {
    out.push(api.getDisplayedRowAtIndex(i)!.key ?? undefined);
  }
  return out;
}

describe('GroupSortStage (PR 2.4)', () => {
  it('sorts groups at each level independently by a value column', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city', rowGroup: true },
        { field: 'sales', aggFunc: 'sum', sort: 'asc' },
      ],
      rowData: ROW_DATA,
      groupDefaultExpanded: -1,
    });

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    // Top level: UK (200) sorts before US (400) by aggregated sales. Sort
    // application can land a render pass after the first non-empty one, so
    // assert inside waitFor rather than after a generic row-count wait.
    await vi.waitFor(() => {
      const topLevelGroups = displayedKeys(api).filter((k, i) => api.getDisplayedRowAtIndex(i)!.level === 0);
      expect(topLevelGroups).toEqual(['UK', 'US']);
    });

    // Within US, SF (100) sorts before NY (300) — a *different* level sorted
    // independently by the same column.
    await vi.waitFor(() => {
      const usChildren: string[] = [];
      for (let i = 0; i < api.getDisplayedRowCount(); i++) {
        const node = api.getDisplayedRowAtIndex(i)!;
        if (node.level === 1 && node.parent?.key === 'US') usChildren.push(node.key!);
      }
      expect(usChildren).toEqual(['SF', 'NY']);
    });

    api.destroy();
    el.remove();
  });

  it('falls back to structural (insertion) order when there is no active column sort', async () => {
    const { api, el } = bootGrid({
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'sales' }],
      rowData: ROW_DATA,
    });

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));
    // US appears before UK in the source data, and no sort is active.
    expect(displayedKeys(api)).toEqual(['US', 'UK']);

    api.destroy();
    el.remove();
  });
});

describe('initialGroupOrderComparator (PR 2.4)', () => {
  it('orders top-level groups per the comparator at tree-build time', async () => {
    const { api, el } = bootGrid({
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'sales' }],
      rowData: ROW_DATA,
      // UK has 1 leaf child, US has 2 — order by ascending leaf count puts UK first.
      initialGroupOrderComparator: (params) =>
        (params.nodeA.allLeafChildren?.length ?? 0) - (params.nodeB.allLeafChildren?.length ?? 0),
    });

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));
    expect(displayedKeys(api)).toEqual(['UK', 'US']);

    api.destroy();
    el.remove();
  });
});

describe('isGroupOpenByDefault (PR 2.4)', () => {
  it('takes priority over groupDefaultExpanded to decide initial expansion per group', async () => {
    const { api, el } = bootGrid({
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'city' }],
      rowData: ROW_DATA,
      groupDefaultExpanded: 0, // would otherwise mean "all collapsed"
      isGroupOpenByDefault: (params) => params.key === 'US',
    });

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    // US (expanded by the callback) contributes its 2 children; UK (not
    // matched by the callback) stays collapsed. 2 groups + 2 US children.
    expect(api.getDisplayedRowCount()).toBe(4);

    api.destroy();
    el.remove();
  });
});

describe('groupTotalRow / grandTotalRow (PR 2.4)', () => {
  it('adds a group total row at the bottom of an expanded group, with the group aggregate', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
      groupDefaultExpanded: -1,
      groupTotalRow: 'bottom',
    });

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    // US group row, NY, SF, US total, UK group row, London, UK total.
    const rows = Array.from({ length: api.getDisplayedRowCount() }, (_, i) => api.getDisplayedRowAtIndex(i)!);
    const usTotalIndex = rows.findIndex((n) => n.footer && n.key === 'US');
    expect(usTotalIndex).toBeGreaterThan(-1);
    const usTotal = rows[usTotalIndex]!;
    expect(usTotal.id).toBe(GROUP_TOTAL_ROW_ID_PREFIX + usTotal.sibling!.id);
    expect(api.getCellValue({ rowNode: usTotal, colKey: 'sales' })).toBe(400);
    // The 'Total' text is a rendering-layer substitution in GroupCellRenderer
    // (unit-tested in groupCellRenderer.spec.ts) — api.getCellValue reads the
    // raw ValueService value, which is still the group's own key here.
    expect(api.getCellValue({ rowNode: usTotal, colKey: GROUP_AUTO_COLUMN_ID })).toBe('US');

    // NY, SF must appear before the US total (bottom position).
    const nyIndex = rows.findIndex((n) => n.data?.city === 'NY');
    expect(nyIndex).toBeLessThan(usTotalIndex);

    // Collapsing the group removes its total row too (US group alone, no
    // longer NY/SF/US-total; UK block is unaffected: UK, London, UK-total).
    rows[0]!.setExpanded(false);
    await vi.waitFor(() => {
      expect(api.getDisplayedRowCount()).toBe(4);
      const stillFooter: boolean[] = [];
      for (let i = 0; i < api.getDisplayedRowCount(); i++) stillFooter.push(!!api.getDisplayedRowAtIndex(i)!.footer);
      expect(stillFooter.filter(Boolean).length).toBe(1); // only UK's total remains
    });

    api.destroy();
    el.remove();
  });

  it('adds an inline grand total row at the configured position, resolvable via GRAND_TOTAL_ROW_ID', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
      grandTotalRow: 'top',
    });

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    const first = api.getDisplayedRowAtIndex(0)!;
    expect(first.footer).toBe(true);
    expect(first.id).toBe(GRAND_TOTAL_ROW_ID);
    expect(api.getCellValue({ rowNode: first, colKey: 'sales' })).toBe(600);
    expect(api.getRowNode(GRAND_TOTAL_ROW_ID)).toBe(first);

    api.destroy();
    el.remove();
  });

  it('groupSuppressBlankHeader: the group header row blanks its aggregated value once a total row exists, unless suppressed', async () => {
    const columnDefs = [
      { field: 'country', rowGroup: true },
      { field: 'sales', aggFunc: 'sum' },
    ];

    const blanked = bootGrid({
      columnDefs,
      rowData: ROW_DATA,
      groupDefaultExpanded: -1,
      groupTotalRow: 'bottom',
    });
    await vi.waitFor(() => expect(blanked.api.getDisplayedRowCount()).toBeGreaterThan(0));
    const usGroupBlanked = blanked.api.getDisplayedRowAtIndex(0)!;
    expect(usGroupBlanked.key).toBe('US');
    expect(blanked.api.getCellValue({ rowNode: usGroupBlanked, colKey: 'sales' })).toBeUndefined();
    blanked.api.destroy();
    blanked.el.remove();

    const shown = bootGrid({
      columnDefs,
      rowData: ROW_DATA,
      groupDefaultExpanded: -1,
      groupTotalRow: 'bottom',
      groupSuppressBlankHeader: true,
    });
    await vi.waitFor(() => expect(shown.api.getDisplayedRowCount()).toBeGreaterThan(0));
    const usGroupShown = shown.api.getDisplayedRowAtIndex(0)!;
    expect(shown.api.getCellValue({ rowNode: usGroupShown, colKey: 'sales' })).toBe(400);
    shown.api.destroy();
    shown.el.remove();
  });
});

describe('expandAll / collapseAll / resetRowGroupExpansion (PR 2.4)', () => {
  it('Community-provided API functions drive ExpansionService end-to-end', async () => {
    const { api, el } = bootGrid({
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'city' }],
      rowData: ROW_DATA,
    });

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(2));

    api.expandAll();
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(5));

    api.collapseAll();
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(2));

    api.getDisplayedRowAtIndex(0)!.setExpanded(true);
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(4));

    api.resetRowGroupExpansion();
    // Default expansion (no groupDefaultExpanded / isGroupOpenByDefault) is
    // all-collapsed, same as the initial state.
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(2));

    api.destroy();
    el.remove();
  });
});

describe('expansion state persistence (PR 2.4)', () => {
  it('survives sort, filter and a rowData data update', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city', filter: 'agTextColumnFilter' },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
    });

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(2));

    const topLevelGroup = () => {
      for (let i = 0; i < api.getDisplayedRowCount(); i++) {
        const node = api.getDisplayedRowAtIndex(i)!;
        if (node.level === 0 && node.key === 'US') return node;
      }
      return undefined;
    };

    topLevelGroup()!.setExpanded(true);
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(4));

    api.applyColumnState({ state: [{ colId: 'sales', sort: 'desc' }] });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(4));
    expect(topLevelGroup()!.expanded).toBe(true);

    api.setFilterModel({ city: { filterType: 'text', type: 'notEqual', filter: 'SF' } });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));
    expect(topLevelGroup()!.expanded).toBe(true);

    api.setFilterModel(null);
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(4));
    expect(topLevelGroup()!.expanded).toBe(true);

    api.setGridOption('rowData', [...ROW_DATA, { country: 'US', city: 'LA', sales: 50 }]);
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(5));
    expect(topLevelGroup()!.expanded).toBe(true);

    api.destroy();
    el.remove();
  });
});

describe('RowNode.id stability for group nodes (PR 2.4)', () => {
  it('is deterministic and resolvable via api.getRowNode', async () => {
    const { api, el } = bootGrid({
      columnDefs: [{ field: 'country', rowGroup: true }, { field: 'city' }],
      rowData: ROW_DATA,
    });

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(2));

    const usGroup = api.getDisplayedRowAtIndex(0)!;
    expect(usGroup.id).toBeTruthy();
    expect(api.getRowNode(usGroup.id!)).toBe(usGroup);

    api.destroy();
    el.remove();
  });
});
