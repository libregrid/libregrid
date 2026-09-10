/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
  AllCommunityModule,
  ModuleRegistry,
  createGrid,
  type GridApi,
  type GridOptions,
} from 'ag-grid-community';
import { RowGroupingModule } from './rowGroupingModule';
import { RowGroupingEditModule } from './rowGroupingEditModule';
import { AggregationStage } from './aggregationStage';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, RowGroupingEditModule]);

const ROWS = [
  { country: 'US', city: 'NY', sales: 100 },
  { country: 'US', city: 'SF', sales: 200 },
  { country: 'UK', city: 'London', sales: 150 },
];

function mount(options: Partial<GridOptions>): { api: GridApi; el: HTMLElement } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const api = createGrid(el, options as GridOptions);
  return { api, el };
}

async function settle(api: GridApi): Promise<void> {
  await vi.waitFor(() => {
    expect(api.getDisplayedRowCount()).toBeGreaterThan(0);
  });
}

/** Displayed group rows by their group key. */
function groupsByKey(api: GridApi): Map<string, { data: unknown; children: number; expanded: boolean }> {
  const out = new Map<string, { data: unknown; children: number; expanded: boolean }>();
  for (let i = 0; i < api.getDisplayedRowCount(); i++) {
    const node = api.getDisplayedRowAtIndex(i)!;
    if (!node.group) continue;
    out.set(String(node.key), {
      data: node.data,
      children: node.allChildrenCount ?? 0,
      expanded: !!node.expanded,
    });
  }
  return out;
}

/** The `city` of every displayed leaf row. */
function displayedKeys(api: GridApi): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < api.getDisplayedRowCount(); i++) {
    const node = api.getDisplayedRowAtIndex(i)!;
    if (!node.group) out.add(String(node.data?.city));
  }
  return out;
}

/** All leaf nodes, expanded or not — groups are collapsed by default. */
function leaves(api: GridApi) {
  const out: NonNullable<ReturnType<GridApi['getDisplayedRowAtIndex']>>[] = [];
  api.forEachLeafNode((node) => out.push(node));
  return out;
}

function leafByCity(api: GridApi, city: string) {
  const node = leaves(api).find((candidate) => candidate.data?.city === city);
  if (!node) throw new Error(`no leaf for city ${city}`);
  return node;
}

function salesByCity(api: GridApi): Map<string, number> {
  const out = new Map<string, number>();
  for (const node of leaves(api)) out.set(node.data.city, node.data.sales);
  return out;
}

/** Unwraps an aggregation result (`{ value }` / `{ toNumber() }` wrappers) to a scalar. */
function scalar(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const obj = value as { value?: unknown; toNumber?: () => unknown };
    if (typeof obj.toNumber === 'function') return Number(obj.toNumber());
    return Number(obj.value);
  }
  return Number(value);
}

const baseColumns = () => [
  { field: 'country', rowGroup: true },
  { field: 'city' },
  { field: 'sales', aggFunc: 'sum' },
];

describe('RowGroupingEditModule — editability', () => {
  it('lets a group cell start an edit when groupRowEditable is set', async () => {
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum', groupRowEditable: true },
      ],
      rowData: ROWS,
    });
    await settle(api);

    api.startEditingCell({ rowIndex: 0, colKey: 'sales' });
    expect(api.getEditingCells()).toHaveLength(1);

    api.stopEditing(true);
    el.remove();
    api.destroy();
  });

  it('does not edit a group cell without groupRowEditable', async () => {
    const { api, el } = mount({ columnDefs: baseColumns(), rowData: ROWS });
    await settle(api);

    api.startEditingCell({ rowIndex: 0, colKey: 'sales' });
    expect(api.getEditingCells()).toHaveLength(0);

    el.remove();
    api.destroy();
  });

  it('evaluates a groupRowEditable callback', async () => {
    const callback = vi.fn(() => true);
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum', groupRowEditable: callback },
      ],
      rowData: ROWS,
    });
    await settle(api);

    api.startEditingCell({ rowIndex: 0, colKey: 'sales' });
    expect(callback).toHaveBeenCalled();
    expect(api.getEditingCells()).toHaveLength(1);

    api.stopEditing(true);
    el.remove();
    api.destroy();
  });

  it('treats a groupRowValueSetter of false as not editable', async () => {
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum', groupRowEditable: true, groupRowValueSetter: false },
      ],
      rowData: ROWS,
    });
    await settle(api);

    api.startEditingCell({ rowIndex: 0, colKey: 'sales' });
    expect(api.getEditingCells()).toHaveLength(0);

    el.remove();
    api.destroy();
  });

  it('treats a `count` group as not editable without an explicit enablement', async () => {
    // `count` is disabled by default, so `groupRowEditable` alone leaves the cell
    // non-editable — the documented "distribution resolves to suppressed" override.
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'count', groupRowEditable: true },
      ],
      rowData: ROWS,
    });
    await settle(api);

    api.startEditingCell({ rowIndex: 0, colKey: 'sales' });
    expect(api.getEditingCells()).toHaveLength(0);

    el.remove();
    api.destroy();
  });

  it('lets a per-aggFunc entry of `true` enable a `count` group cell', async () => {
    // The end-to-end guard for the Phase 21 review's finding 1: a record entry of
    // `true` must resolve to a real strategy so the cell opens and the edit lands.
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        {
          field: 'sales',
          aggFunc: 'count',
          groupRowEditable: true,
          groupRowValueSetter: { distribution: { count: true } },
        },
      ],
      rowData: ROWS.map((row) => ({ ...row })),
    });
    await settle(api);

    api.startEditingCell({ rowIndex: 0, colKey: 'sales' });
    expect(api.getEditingCells()).toHaveLength(1);
    api.stopEditing(true);

    const group = api.getDisplayedRowAtIndex(0)!;
    group.setDataValue('sales', 7, 'edit');

    await vi.waitFor(() => {
      expect(salesByCity(api).get('NY')).toBe(7);
    });
    expect(salesByCity(api).get('SF')).toBe(7);
    expect(salesByCity(api).get('London')).toBe(150);

    el.remove();
    api.destroy();
  });

  it('leaves a non-editable column non-editable on a group row', async () => {
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROWS,
    });
    await settle(api);

    api.startEditingCell({ rowIndex: 0, colKey: 'city' });
    expect(api.getEditingCells()).toHaveLength(0);

    el.remove();
    api.destroy();
  });
});

describe('RowGroupingEditModule — distribution', () => {
  it('preserves weighted averages through uneven nested groups', async () => {
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city', rowGroup: true },
        { field: 'sales', aggFunc: 'avg', groupRowEditable: true,
          groupRowValueSetter: { distribution: 'percentage' } },
      ],
      rowData: [
        { country: 'US', city: 'NY', sales: 100 },
        { country: 'US', city: 'SF', sales: 400 },
        { country: 'US', city: 'SF', sales: 400 },
      ],
    });
    await settle(api);
    try {
      const group = api.getDisplayedRowAtIndex(0)!;
      expect(scalar(group.aggData?.sales)).toBe(300);
      group.setDataValue('sales', 150);
      expect(leaves(api).map((node) => node.data.sales)).toEqual([50, 200, 200]);
      expect(scalar(group.aggData?.sales)).toBe(150);
    } finally {
      api.destroy();
      el.remove();
    }
  });

  it('refreshes nested group cells in one aggregate pass', async () => {
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city', rowGroup: true },
        { field: 'sales', aggFunc: 'sum', groupRowEditable: true },
      ],
      rowData: ROWS.map((row) => ({ ...row })),
      groupDefaultExpanded: -1,
    });
    await settle(api);
    const aggregate = vi.spyOn(AggregationStage.prototype, 'execute');
    try {
      api.getDisplayedRowAtIndex(0)!.setDataValue('sales', 600);
      expect(aggregate).toHaveBeenCalledTimes(1);
      expect([...el.querySelectorAll('.ag-cell[col-id="sales"]')].map((cell) => cell.textContent)).toContain('600');
      expect(salesByCity(api).get('NY')).toBe(300);
    } finally {
      aggregate.mockRestore();
      api.destroy();
      el.remove();
    }
  });

  it('distributes a group edit uniformly across children and re-aggregates', async () => {
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum', groupRowEditable: true },
      ],
      rowData: ROWS.map((row) => ({ ...row })),
    });
    await settle(api);

    const group = api.getDisplayedRowAtIndex(0)!;
    expect(group.key).toBe('US');

    group.setDataValue('sales', 600, 'edit');

    await vi.waitFor(() => {
      expect(salesByCity(api).get('NY')).toBe(300);
    });

    // NY and SF each received 600 / 2; London is untouched.
    const byCity = salesByCity(api);
    expect(byCity.get('NY')).toBe(300);
    expect(byCity.get('SF')).toBe(300);
    expect(byCity.get('London')).toBe(150);

    // The group re-aggregated in the same pass.
    expect(scalar(group.aggData?.sales)).toBe(600);

    el.remove();
    api.destroy();
  });

  it('honours an explicit distribution strategy and precision', async () => {
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        {
          field: 'sales',
          aggFunc: 'sum',
          groupRowEditable: true,
          groupRowValueSetter: { distribution: 'uniform', precision: 0 },
        },
      ],
      rowData: [
        { country: 'US', city: 'NY', sales: 0 },
        { country: 'US', city: 'SF', sales: 0 },
        { country: 'US', city: 'LA', sales: 0 },
      ],
    });
    await settle(api);

    const group = api.getDisplayedRowAtIndex(0)!;
    group.setDataValue('sales', 10, 'edit');

    await vi.waitFor(() => {
      const values = [...salesByCity(api).values()];
      expect(values.reduce((a, b) => a + b, 0)).toBe(10);
    });
    expect([...salesByCity(api).values()]).toEqual([4, 3, 3]);

    el.remove();
    api.destroy();
  });

  it('uses a custom groupRowValueSetter callback', async () => {
    const setter = vi.fn(
      (params: { aggregatedChildren: { setDataValue: (c: string, v: unknown, s: string) => void }[] }) => {
        for (const child of params.aggregatedChildren) child.setDataValue('sales', 7, 'data');
        return true;
      },
    );
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum', groupRowEditable: true, groupRowValueSetter: setter },
      ],
      rowData: ROWS.map((row) => ({ ...row })),
    });
    await settle(api);

    const group = api.getDisplayedRowAtIndex(0)!;
    group.setDataValue('sales', 999, 'edit');

    await vi.waitFor(() => {
      expect(setter).toHaveBeenCalledTimes(1);
      expect(salesByCity(api).get('NY')).toBe(7);
    });
    expect(salesByCity(api).get('SF')).toBe(7);
    expect(salesByCity(api).get('London')).toBe(150);

    el.remove();
    api.destroy();
  });

  it('does not distribute when neither option is configured', async () => {
    const { api, el } = mount({
      columnDefs: baseColumns(),
      rowData: ROWS.map((row) => ({ ...row })),
    });
    await settle(api);

    const group = api.getDisplayedRowAtIndex(0)!;
    group.setDataValue('sales', 555, 'edit');

    // The ordinary value path writes to the group node; children are untouched.
    expect(salesByCity(api).get('NY')).toBe(100);
    expect(salesByCity(api).get('SF')).toBe(200);

    el.remove();
    api.destroy();
  });

  it('still writes leaf edits through the ordinary path', async () => {
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum', editable: true, groupRowEditable: true },
      ],
      rowData: ROWS.map((row) => ({ ...row })),
    });
    await settle(api);

    const ny = leafByCity(api, 'NY');
    ny.setDataValue('sales', 555, 'edit');
    expect(ny.data.sales).toBe(555);
    expect(scalar(ny.parent?.aggData?.sales)).toBe(755);

    el.remove();
    api.destroy();
  });
});

describe('RowGroupingEditModule — module-name validation', () => {
  it('registers both module names Community validates against', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const { api, el } = mount({
        columnDefs: [
          { field: 'country', rowGroup: true },
          { field: 'city' },
          { field: 'sales', aggFunc: 'sum', groupRowEditable: true, groupRowValueSetter: true },
        ],
        rowData: ROWS,
        refreshAfterGroupEdit: true,
      });
      await settle(api);
      // Community debounces missing-module reports by 50 ms before logging them,
      // so a synchronous assertion would pass vacuously.
      await new Promise((resolve) => setTimeout(resolve, 120));

      // `groupRowEditable`/`groupRowValueSetter` validate against `RowGroupingEdit`;
      // `refreshAfterGroupEdit` validates against `RowGrouping`. A missing name
      // surfaces as Community error #200. Verified to fail when
      // `RowGroupingEditModule` is not registered.
      const messages = [...warn.mock.calls, ...error.mock.calls]
        .flat()
        .map((message) => String(message))
        .filter((message) => message.includes('RowGroupingEdit') || message.includes('refreshAfterGroupEdit'));
      expect(messages).toEqual([]);

      el.remove();
      api.destroy();
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });
});

describe('RowGroupingEditModule — refreshAfterGroupEdit', () => {
  it('moves an edited row into the correct group', async () => {
    const { api, el } = mount({
      columnDefs: baseColumns(),
      rowData: ROWS.map((row) => ({ ...row })),
      refreshAfterGroupEdit: true,
    });
    await settle(api);

    expect(groupsByKey(api).get('US')?.children).toBe(2);

    const ny = leafByCity(api, 'NY');
    expect(ny.data.city).toBe('NY');
    ny.setDataValue('country', 'UK', 'data');

    await vi.waitFor(() => {
      expect(groupsByKey(api).get('US')?.children).toBe(1);
    });
    expect(groupsByKey(api).get('UK')?.children).toBe(2);

    el.remove();
    api.destroy();
  });

  it('keeps the row in place when the option is off', async () => {
    const { api, el } = mount({
      columnDefs: baseColumns(),
      rowData: ROWS.map((row) => ({ ...row })),
    });
    await settle(api);

    const ny = leafByCity(api, 'NY');
    ny.setDataValue('country', 'UK', 'data');
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(groupsByKey(api).get('US')?.children).toBe(2);

    el.remove();
    api.destroy();
  });

  it('preserves group expansion across the re-homing refresh', async () => {
    // The regroup rebuilds every group node; `GroupStage` restores expansion from
    // the previous node of the same deterministic ID. Two groups are expanded
    // here, so the assertion only passes if both survive the rebuild.
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROWS.map((row) => ({ ...row })),
      refreshAfterGroupEdit: true,
      groupDefaultExpanded: -1,
    });
    await settle(api);

    expect(displayedKeys(api).has('NY')).toBe(true);
    expect(displayedKeys(api).has('SF')).toBe(true);
    expect(displayedKeys(api).has('London')).toBe(true);

    const ny = leafByCity(api, 'NY');
    ny.setDataValue('country', 'UK', 'data');

    await vi.waitFor(() => {
      expect(groupsByKey(api).get('UK')?.children).toBe(2);
    });

    // US and UK are both still expanded: their leaf rows remain on screen.
    const keys = displayedKeys(api);
    expect(keys.has('SF')).toBe(true);
    expect(keys.has('London')).toBe(true);
    expect(keys.has('NY')).toBe(true);

    const countryGroups = ['US', 'UK'].map((key) => groupsByKey(api).get(key));
    expect(countryGroups[0]?.children).toBe(1);
    expect(countryGroups[1]?.children).toBe(2);

    el.remove();
    api.destroy();
  });

  it('keeps a collapsed group collapsed across the re-homing refresh', async () => {
    // The mirror image: without `groupDefaultExpanded` the groups start collapsed
    // and the rebuilt destination group must not spring open.
    const { api, el } = mount({
      columnDefs: baseColumns(),
      rowData: ROWS.map((row) => ({ ...row })),
      refreshAfterGroupEdit: true,
    });
    await settle(api);

    expect(api.getDisplayedRowCount()).toBe(groupsByKey(api).size);

    const ny = leafByCity(api, 'NY');
    ny.setDataValue('country', 'UK', 'data');

    await vi.waitFor(() => {
      expect(groupsByKey(api).get('UK')?.children).toBe(2);
    });

    expect([...groupsByKey(api).values()].every((group) => group.expanded === false)).toBe(true);
    expect(api.getDisplayedRowCount()).toBe(groupsByKey(api).size);

    el.remove();
    api.destroy();
  });

  it('distributes an edit to the grouped column itself and re-homes the group', async () => {
    // The two Phase 21 features interacting: the distribution writes the grouping
    // key on every child, each write marks the hierarchy dirty, and the regroup
    // must not lose any of those writes.
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true, editable: true, groupRowEditable: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: ROWS.map((row) => ({ ...row })),
      refreshAfterGroupEdit: true,
    });
    await settle(api);

    const group = api.getDisplayedRowAtIndex(0)!;
    expect(group.key).toBe('US');
    group.setDataValue('country', 'CA', 'edit');

    await vi.waitFor(() => {
      expect(groupsByKey(api).get('CA')?.children).toBe(2);
    });
    expect(groupsByKey(api).has('US')).toBe(false);

    const countries: string[] = [];
    api.forEachLeafNode((node) => countries.push(node.data.country));
    expect(countries.filter((country) => country === 'CA')).toHaveLength(2);
    expect(countries.filter((country) => country === 'UK')).toHaveLength(1);

    el.remove();
    api.destroy();
  });
});

describe('AggregatedChildrenService', () => {
  it('exposes real children through rowNode.getAggregatedChildren()', async () => {
    const { api, el } = mount({ columnDefs: baseColumns(), rowData: ROWS });
    await settle(api);

    const us = api.getDisplayedRowAtIndex(0)!;
    expect(us.key).toBe('US');
    const children = us.getAggregatedChildren(null);
    expect(children.map((node) => node.data.city).sort()).toEqual(['NY', 'SF']);

    const leaves = us.getAggregatedChildren(null, true);
    expect(leaves).toHaveLength(2);

    el.remove();
    api.destroy();
  });

  it('returns an empty array for a leaf node', async () => {
    const { api, el } = mount({ columnDefs: baseColumns(), rowData: ROWS });
    await settle(api);

    const leaf = leafByCity(api, 'NY');
    expect(leaf.group).toBeFalsy();
    expect(leaf.getAggregatedChildren(null)).toEqual([]);

    el.remove();
    api.destroy();
  });

  it('matches the aggregation scope under suppressAggFilteredOnly', async () => {
    // Docs: `aggregatedChildren` respects `suppressAggFilteredOnly`. With the
    // option on, the group total still spans all children even when a filter
    // hides some, so `getAggregatedChildren` must return the same full set —
    // otherwise an edit would distribute across only the visible children.
    const { api, el } = mount({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'city' },
        { field: 'sales', aggFunc: 'sum', filter: 'agNumberColumnFilter', groupRowEditable: true },
      ],
      rowData: ROWS.map((row) => ({ ...row })),
      suppressAggFilteredOnly: true,
    });
    await settle(api);

    api.setFilterModel({ sales: { filterType: 'number', type: 'lessThan', filter: 150 } });
    await vi.waitFor(() => {
      // The filter trims the displayed leaves, but with suppressAggFilteredOnly
      // the group row still shows and re-aggregates over all children (300).
      const node = api.getDisplayedRowAtIndex(0);
      expect(node?.key).toBe('US');
      expect(scalar(node?.aggData?.sales)).toBe(300);
    });

    const groupNode = api.getDisplayedRowAtIndex(0)!;

    // aggregatedChildren must agree with the aggregate's scope, not the filter.
    const children = groupNode.getAggregatedChildren(api.getColumn('sales')!);
    expect(children.map((node) => node.data.city).sort()).toEqual(['NY', 'SF']);

    groupNode.setDataValue('sales', 600);
    expect(scalar(groupNode.aggData?.sales)).toBe(600);
    expect(salesByCity(api).get('NY')).toBe(300);
    expect(salesByCity(api).get('SF')).toBe(300);

    el.remove();
    api.destroy();
  });
});
