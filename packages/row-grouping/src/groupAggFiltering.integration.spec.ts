/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { createGrid, ModuleRegistry, AllCommunityModule, type GridApi, type GridOptions } from 'ag-grid-community';
import { RowGroupingModule } from './rowGroupingModule';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

interface Row {
  country: string;
  city: string;
  sales: number;
}

// Individually, no row passes "sales > 250" — only the aggregated US total (300) does.
const ROW_DATA: Row[] = [
  { country: 'US', city: 'NY', sales: 100 },
  { country: 'US', city: 'SF', sales: 200 },
  { country: 'UK', city: 'London', sales: 150 },
];

function bootGrid(options: GridOptions<Row>): { api: GridApi<Row>; el: HTMLElement } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const api = createGrid(el, options as GridOptions);
  return { api, el };
}

describe('groupAggFiltering (PR 2.5)', () => {
  it('without groupAggFiltering, only individually-passing leaf rows survive (none here) so groups vanish too', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum', filter: 'agNumberColumnFilter' },
      ],
      rowData: ROW_DATA,
      groupDefaultExpanded: -1,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    api.setFilterModel({ sales: { filterType: 'number', type: 'greaterThan', filter: 250 } });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(0));

    api.destroy();
    el.remove();
  });

  it('with groupAggFiltering, a group whose own aggregate passes includes its whole subtree unfiltered', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum', filter: 'agNumberColumnFilter' },
      ],
      rowData: ROW_DATA,
      groupDefaultExpanded: -1,
      groupAggFiltering: true,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    api.setFilterModel({ sales: { filterType: 'number', type: 'greaterThan', filter: 250 } });
    // US's aggregate (300) passes -> US, NY, SF all survive. UK's aggregate
    // (150) fails, and neither of its leaves individually passes -> UK gone.
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(3));

    const keys = new Set<string>();
    const cities = new Set<string>();
    for (let i = 0; i < api.getDisplayedRowCount(); i++) {
      const node = api.getDisplayedRowAtIndex(i)!;
      if (node.group) keys.add(node.key!);
      else cities.add(node.data!.city);
    }
    expect(keys).toEqual(new Set(['US']));
    expect(cities).toEqual(new Set(['NY', 'SF']));

    api.destroy();
    el.remove();
  });

  it('groupAggFiltering as a callback applies selectively per group', async () => {
    // Neither UK leaf individually passes ">100", but their sum (180) does —
    // the only way UK survives fully is via the aggregate-filter path. US
    // has one leaf on each side of the threshold, so it proves the *other*
    // group still gets ordinary per-leaf filtering when the callback excludes it.
    const rows: Row[] = [
      { country: 'US', city: 'NY', sales: 100 },
      { country: 'US', city: 'SF', sales: 200 },
      { country: 'UK', city: 'London', sales: 90 },
      { country: 'UK', city: 'Manchester', sales: 90 },
    ];
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum', filter: 'agNumberColumnFilter' },
      ],
      rowData: rows,
      groupDefaultExpanded: -1,
      groupAggFiltering: (params) => params.node.key === 'UK',
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    api.setFilterModel({ sales: { filterType: 'number', type: 'greaterThan', filter: 100 } });
    await vi.waitFor(() => {
      const cities = new Set<string>();
      for (let i = 0; i < api.getDisplayedRowCount(); i++) {
        const node = api.getDisplayedRowAtIndex(i)!;
        if (!node.group) cities.add(node.data!.city);
      }
      // UK: both survive via the aggregate path despite neither passing alone.
      expect(cities.has('London')).toBe(true);
      expect(cities.has('Manchester')).toBe(true);
      // US: ordinary per-leaf filtering — only SF (200) passes, not NY (100).
      expect(cities.has('SF')).toBe(true);
      expect(cities.has('NY')).toBe(false);
    });

    api.destroy();
    el.remove();
  });
});
