import { describe, expect, it, vi } from 'vitest';
import type { Column, GridApi, IRowNode } from 'ag-grid-community';
import { MenuItemRegistry, type MenuActionParams } from '@libregrid/menu';
import './menuItems';

function makeColumn(overrides: Partial<Column> & { colDef?: Record<string, unknown> } = {}): Column {
  const colDef = { headerName: 'Sales', ...overrides.colDef };
  return {
    getColId: () => 'sales',
    getColDef: () => colDef,
    getAggFunc: () => null,
    ...overrides,
  } as unknown as Column;
}

function makeApi(overrides: Partial<GridApi> = {}): GridApi {
  return {
    getRowGroupColumns: () => [],
    addRowGroupColumns: vi.fn(),
    removeRowGroupColumns: vi.fn(),
    expandAll: vi.fn(),
    collapseAll: vi.fn(),
    setColumnAggFunc: vi.fn(),
    ...overrides,
  } as unknown as GridApi;
}

function params(overrides: Partial<MenuActionParams> = {}): MenuActionParams {
  return { column: null, node: null, value: null, api: makeApi(), ...overrides };
}

describe('row-grouping menu item contributions', () => {
  const registry = new MenuItemRegistry();

  it('registers all five items', () => {
    for (const name of ['rowGroup', 'rowUnGroup', 'expandAll', 'contractAll', 'valueAggSubMenu']) {
      expect(registry.has(name)).toBe(true);
    }
  });

  it('rowGroup: offered only for an ungrouped, enableRowGroup column; groups it on action', () => {
    const api = makeApi();
    const column = makeColumn({ colDef: { enableRowGroup: true } });
    expect(registry.getItem('rowGroup', params({ column: null }))).toBeNull();
    expect(registry.getItem('rowGroup', params({ column: makeColumn() }))).toBeNull(); // no enableRowGroup

    const item = registry.getItem('rowGroup', params({ column, api }));
    expect(item?.name).toBe('Group by Sales');
    item!.action!({} as never);
    expect(api.addRowGroupColumns).toHaveBeenCalledWith(['sales']);

    // Already grouped -> not offered
    const groupedApi = makeApi({ getRowGroupColumns: () => [makeColumn()] });
    expect(registry.getItem('rowGroup', params({ column, api: groupedApi }))).toBeNull();
  });

  it('rowUnGroup: offered only when the column is currently grouped; ungroups it on action', () => {
    const column = makeColumn();
    const notGrouped = makeApi();
    expect(registry.getItem('rowUnGroup', params({ column, api: notGrouped }))).toBeNull();

    const api = makeApi({ getRowGroupColumns: () => [column] });
    const item = registry.getItem('rowUnGroup', params({ column, api }));
    expect(item?.name).toBe('Stop grouping by Sales');
    item!.action!({} as never);
    expect(api.removeRowGroupColumns).toHaveBeenCalledWith(['sales']);
  });

  it('expandAll/contractAll: no-grouping -> hidden; with grouping and no node -> grid-wide', () => {
    expect(registry.getItem('expandAll', params({ api: makeApi() }))).toBeNull();

    const api = makeApi({ getRowGroupColumns: () => [makeColumn()] });
    const expandItem = registry.getItem('expandAll', params({ api }));
    expandItem!.action!({} as never);
    expect(api.expandAll).toHaveBeenCalled();

    const contractItem = registry.getItem('contractAll', params({ api }));
    contractItem!.action!({} as never);
    expect(api.collapseAll).toHaveBeenCalled();
  });

  it('expandAll: with a group node, expands only that subtree via setExpanded', () => {
    const api = makeApi({ getRowGroupColumns: () => [makeColumn()] });
    const leaf = { group: false, setExpanded: vi.fn() } as unknown as IRowNode;
    const child = { group: true, setExpanded: vi.fn(), childrenAfterGroup: [leaf] } as unknown as IRowNode;
    const node = { group: true, setExpanded: vi.fn(), childrenAfterGroup: [child] } as unknown as IRowNode;

    const item = registry.getItem('expandAll', params({ api, node }));
    item!.action!({} as never);

    expect(node.setExpanded).toHaveBeenCalledWith(true);
    expect(child.setExpanded).toHaveBeenCalledWith(true);
    expect(leaf.setExpanded).not.toHaveBeenCalled();
    expect(api.expandAll).not.toHaveBeenCalled();
  });

  it('valueAggSubMenu: offered for a value column, lists agg func names with the active one checked', () => {
    const notValue = makeColumn();
    expect(registry.getItem('valueAggSubMenu', params({ column: notValue }))).toBeNull();

    const api = makeApi();
    const column = makeColumn({ getAggFunc: () => 'max' });
    const item = registry.getItem('valueAggSubMenu', params({ column, api }));
    expect(item?.subMenu?.map((i) => (typeof i === 'string' ? i : i.name))).toContain('Max');
    const maxEntry = item!.subMenu!.find((i) => typeof i !== 'string' && i.name === 'Max')!;
    expect(typeof maxEntry !== 'string' && maxEntry.checked).toBe(true);

    const sumEntry = item!.subMenu!.find((i) => typeof i !== 'string' && i.name === 'Sum')!;
    (typeof sumEntry !== 'string' ? sumEntry.action : undefined)?.({} as never);
    expect(api.setColumnAggFunc).toHaveBeenCalledWith('sales', 'sum');
  });

  it('rowGroup/rowUnGroup fall back to the colId when the column has no headerName', () => {
    const noHeader = makeColumn({ colDef: { headerName: undefined, enableRowGroup: true } });
    const api = makeApi();
    expect(registry.getItem('rowGroup', params({ column: noHeader, api }))?.name).toBe('Group by sales');

    const groupedApi = makeApi({ getRowGroupColumns: () => [noHeader] });
    expect(registry.getItem('rowUnGroup', params({ column: noHeader, api: groupedApi }))?.name).toBe(
      'Stop grouping by sales',
    );
  });

  it('rowUnGroup: not offered without a column', () => {
    expect(registry.getItem('rowUnGroup', params({ column: null }))).toBeNull();
  });

  it('contractAll: no-grouping -> hidden; with a group node collapses only that subtree', () => {
    expect(registry.getItem('contractAll', params({ api: makeApi() }))).toBeNull();

    const api = makeApi({ getRowGroupColumns: () => [makeColumn()] });
    const leaf = { group: false, setExpanded: vi.fn() } as unknown as IRowNode;
    const childlessGroup = { group: true, setExpanded: vi.fn() } as unknown as IRowNode;
    const node = {
      group: true,
      setExpanded: vi.fn(),
      childrenAfterGroup: [leaf, childlessGroup],
    } as unknown as IRowNode;

    const item = registry.getItem('contractAll', params({ api, node }));
    expect(item?.name).toBe('Collapse All Below');
    item!.action!({} as never);

    expect(node.setExpanded).toHaveBeenCalledWith(false);
    expect(childlessGroup.setExpanded).toHaveBeenCalledWith(false);
    expect(leaf.setExpanded).not.toHaveBeenCalled();
    expect(api.collapseAll).not.toHaveBeenCalled();
  });

  it('expandAll: names the item "Expand All Below" for a group node', () => {
    const api = makeApi({ getRowGroupColumns: () => [makeColumn()] });
    const node = { group: true, setExpanded: vi.fn() } as unknown as IRowNode;
    const item = registry.getItem('expandAll', params({ api, node }));
    expect(item?.name).toBe('Expand All Below');
  });

  it('valueAggSubMenu: not offered without a column; unknown allowedAggFuncs fall back to the raw name', () => {
    expect(registry.getItem('valueAggSubMenu', params({ column: null }))).toBeNull();

    const column = makeColumn({ colDef: { enableValue: true, allowedAggFuncs: ['sum', 'myCustom'] } });
    const item = registry.getItem('valueAggSubMenu', params({ column }));
    expect(item?.subMenu?.map((i) => (typeof i === 'string' ? i : i.name))).toEqual(['Sum', 'myCustom']);
  });

  it('valueAggSubMenu: honours colDef.allowedAggFuncs', () => {
    const column = makeColumn({ colDef: { enableValue: true, allowedAggFuncs: ['sum', 'avg'] } });
    const item = registry.getItem('valueAggSubMenu', params({ column }));
    expect(item?.subMenu?.map((i) => (typeof i === 'string' ? i : i.name))).toEqual(['Sum', 'Average']);
  });
});
