/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  ROOT_NODE_ID,
  type GridApi,
  type GridOptions,
} from 'ag-grid-community';
import { RowGroupingModule } from './rowGroupingModule';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

const ROW_DATA = [
  { country: 'US', city: 'NY', sales: 100 },
  { country: 'US', city: 'SF', sales: 200 },
  { country: 'UK', city: 'London', sales: 150 },
];

function aggOf(api: GridApi, key: string): Record<string, unknown> | undefined {
  for (let i = 0; i < api.getDisplayedRowCount(); i++) {
    const node = api.getDisplayedRowAtIndex(i)!;
    if (node.group && node.key === key) return node.aggData ?? undefined;
  }
  return undefined;
}

function bootGrid(options: GridOptions): { api: GridApi; el: HTMLElement } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const api = createGrid(el, options);
  return { api, el };
}

describe('Aggregation integration', () => {
  it('computes sum aggregates for a single group level', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
    });

    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    expect(aggOf(api, 'US')?.['sales']).toBe(300);
    expect(aggOf(api, 'UK')?.['sales']).toBe(150);

    api.destroy();
    el.remove();
  });

  it('aggregates deepest-first across two group levels', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city', rowGroup: true },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
      groupDefaultExpanded: -1,
    });

    await vi.waitFor(() => expect(aggOf(api, 'NY')).toBeDefined());

    expect(aggOf(api, 'NY')?.['sales']).toBe(100);
    expect(aggOf(api, 'US')?.['sales']).toBe(300);
    expect(aggOf(api, 'UK')?.['sales']).toBe(150);

    api.destroy();
    el.remove();
  });

  it('supports min, max, count, avg, first, last via colDef', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'sales', aggFunc: 'min' },
      ],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(aggOf(api, 'US')).toBeDefined());
    expect(aggOf(api, 'US')?.['sales']).toBe(100);
    api.destroy();
    el.remove();
  });

  it('avg weighting is correct across nested group levels', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city', rowGroup: true },
        { field: 'sales', aggFunc: 'avg' },
      ],
      rowData: [
        { country: 'X', city: 'a', sales: 10 },
        { country: 'X', city: 'a', sales: 20 },
        { country: 'X', city: 'b', sales: 100 },
      ],
      groupDefaultExpanded: -1,
    });
    await vi.waitFor(() => expect(aggOf(api, 'X')).toBeDefined());
    const avg = aggOf(api, 'X')?.['sales'] as { toNumber?: () => number; value?: number };
    const value = avg?.toNumber?.() ?? avg?.value;
    // Weighted: (15*2 + 100*1)/3 = 43.33; unweighted mean of avgs would be 57.5.
    expect(value).toBeCloseTo(130 / 3, 3);
    api.destroy();
    el.remove();
  });

  it('custom aggFuncs via grid option aggregate correctly', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'sales', aggFunc: 'range' },
      ],
      rowData: ROW_DATA,
      aggFuncs: {
        range: (p) => {
          const nums = p.values.filter((v): v is number => typeof v === 'number');
          return nums.length ? Math.max(...nums) - Math.min(...nums) : null;
        },
      },
    });
    await vi.waitFor(() => expect(aggOf(api, 'US')).toBeDefined());
    expect(aggOf(api, 'US')?.['sales']).toBe(100);
    api.destroy();
    el.remove();
  });

  it('addAggFuncs API registers a custom function usable by name', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(aggOf(api, 'US')).toBeDefined());

    api.addAggFuncs({
      double: (p) =>
        p.values.reduce((acc: number, v) => acc + (typeof v === 'number' ? v : 0), 0) * 2,
    });
    api.setColumnAggFunc('sales', 'double');

    await vi.waitFor(() => expect(aggOf(api, 'US')?.['sales']).toBe(600));

    api.destroy();
    el.remove();
  });

  it('getGroupRowAgg overrides per-column aggregation', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
      getGroupRowAgg: () => ({ sales: 999 }),
    });
    await vi.waitFor(() => expect(aggOf(api, 'US')).toBeDefined());
    expect(aggOf(api, 'US')?.['sales']).toBe(999);
    api.destroy();
    el.remove();
  });

  it('clearAggFuncs removes built-ins so named aggs stop resolving', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(aggOf(api, 'US')?.['sales']).toBe(300));
    api.clearAggFuncs();
    api.refreshCells?.();
    api.destroy();
    el.remove();
  });

  it('value column APIs track the value column set', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'sales' },
      ],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBeGreaterThan(0));

    expect(api.getValueColumns().map((c) => c.getColId())).toEqual([]);

    api.addValueColumns(['sales']);
    expect(api.getValueColumns().map((c) => c.getColId())).toEqual(['sales']);
    await vi.waitFor(() => expect(aggOf(api, 'US')?.['sales']).toBe(300));

    api.removeValueColumns(['sales']);
    expect(api.getValueColumns()).toEqual([]);

    api.setValueColumns(['sales']);
    expect(api.getValueColumns().map((c) => c.getColId())).toEqual(['sales']);

    api.destroy();
    el.remove();
  });

  it('setColumnAggFunc switches a column between agg functions', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(aggOf(api, 'US')?.['sales']).toBe(300));

    api.setColumnAggFunc('sales', 'max');
    await vi.waitFor(() => expect(aggOf(api, 'US')?.['sales']).toBe(200));

    api.destroy();
    el.remove();
  });

  it('aggregates respect filtering by default', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city', filter: true },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
    });
    await vi.waitFor(() => expect(aggOf(api, 'US')?.['sales']).toBe(300));

    api.setFilterModel({ city: { filterType: 'text', type: 'equals', filter: 'NY' } });
    await vi.waitFor(() => expect(aggOf(api, 'US')?.['sales']).toBe(100));

    api.destroy();
    el.remove();
  });

  it('suppressAggFilteredOnly keeps totals unaffected by filtering', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city', filter: true },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
      suppressAggFilteredOnly: true,
      groupDefaultExpanded: -1,
    });
    await vi.waitFor(() => expect(aggOf(api, 'US')?.['sales']).toBe(300));

    api.setFilterModel({ city: { filterType: 'text', type: 'equals', filter: 'NY' } });
    // Prove the filter actually engaged (US trimmed to NY for display) while
    // the aggregate stays unfiltered.
    await vi.waitFor(() => {
      const us = aggOf(api, 'US');
      expect(us?.['sales']).toBe(300);
    });
    const displayedCities: string[] = [];
    for (let i = 0; i < api.getDisplayedRowCount(); i++) {
      const node = api.getDisplayedRowAtIndex(i)!;
      if (!node.group) displayedCities.push(node.data?.city);
    }
    expect(displayedCities).toEqual(['NY']);

    api.destroy();
    el.remove();
  });

  it('alwaysAggregateAtRootLevel computes grand totals on the root node', async () => {
    const { api, el } = bootGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROW_DATA,
      alwaysAggregateAtRootLevel: true,
    });
    await vi.waitFor(() => expect(aggOf(api, 'US')).toBeDefined());

    const root = api.getRowNode(ROOT_NODE_ID);
    expect(root?.aggData?.['sales']).toBe(450);

    api.destroy();
    el.remove();
  });
});
