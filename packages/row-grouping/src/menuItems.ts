import type { GridApi, IRowNode, MenuItemDef } from 'ag-grid-community';
import { registerMenuItems, type MenuActionParams } from '@libregrid/menu';

const BUILT_IN_AGG_FUNC_NAMES = ['sum', 'min', 'max', 'avg', 'count', 'first', 'last'];
const AGG_FUNC_LABELS: Record<string, string> = {
  sum: 'Sum',
  min: 'Min',
  max: 'Max',
  avg: 'Average',
  count: 'Count',
  first: 'First',
  last: 'Last',
};

function isGrouped(api: GridApi, colId: string): boolean {
  return api.getRowGroupColumns().some((c) => c.getColId() === colId);
}

/**
 * Recursively expands/collapses `node` and every descendant group — there is
 * no scoped API for this (`expansionSvc.expandAll` is grid-wide), so this
 * walks the subtree calling the public `IRowNode.setExpanded`.
 */
function setSubtreeExpanded(node: IRowNode, expanded: boolean): void {
  node.setExpanded(expanded);
  for (const child of node.childrenAfterGroup ?? []) {
    if (child.group) setSubtreeExpanded(child, expanded);
  }
}

/**
 * Menu item factories contributed to `@libregrid/menu`'s registry — the
 * `registerMenuItem`/`registerMenuItems` module-scope pattern is the only way
 * a feature package adds items without a dependency from `@libregrid/menu`
 * back onto it (see `registryApi.ts`).
 *
 * Registering here makes these items resolvable by name
 * (`MenuItemRegistry.getItem('rowGroup', params)`), but does **not** add them
 * to `DEFAULT_COLUMN_MENU_ITEMS`/`DEFAULT_CONTEXT_MENU_ITEMS` — those two
 * arrays are static, Phase-1-owned content ("Later phases register their own
 * items via registerMenuItems()", per that file's own comment), and the
 * acceptance criterion is explicit: contribute *without editing*
 * `@libregrid/menu`. A consumer opts these into their own menu via
 * `getColumnMenuItems`/`contextMenuItems`, e.g.
 * `getColumnMenuItems: (params) => [...params.defaultItems, 'separator', 'rowGroup', 'rowUnGroup']`.
 *
 * `valueAggSubMenu` can only offer `colDef.allowedAggFuncs`, or else the
 * seven built-ins — `MenuActionParams` exposes only `{ column, node, value,
 * api }` (no bean access), so a custom function registered via `aggFuncs` /
 * `addAggFuncs` and not listed in `allowedAggFuncs` won't appear here. This
 * mirrors every other menu item factory in this codebase (Phase 1's included)
 * — none have bean access, by design.
 *
 * @feature Row Grouping -> Menu Contributions
 */
registerMenuItems([
  {
    name: 'rowGroup',
    order: 20,
    factory: (params: MenuActionParams): MenuItemDef | null => {
      const { column, api } = params;
      if (!column) return null;
      const colId = column.getColId();
      if (isGrouped(api, colId)) return null;
      if (column.getColDef().enableRowGroup !== true) return null;
      return {
        name: `Group by ${column.getColDef().headerName ?? colId}`,
        action: () => api.addRowGroupColumns([colId]),
      };
    },
  },
  {
    name: 'rowUnGroup',
    order: 21,
    factory: (params: MenuActionParams): MenuItemDef | null => {
      const { column, api } = params;
      if (!column) return null;
      const colId = column.getColId();
      if (!isGrouped(api, colId)) return null;
      return {
        name: `Stop grouping by ${column.getColDef().headerName ?? colId}`,
        action: () => api.removeRowGroupColumns([colId]),
      };
    },
  },
  {
    name: 'expandAll',
    order: 22,
    factory: (params: MenuActionParams): MenuItemDef | null => {
      const { node, api } = params;
      if (api.getRowGroupColumns().length === 0) return null;
      return {
        name: node?.group ? 'Expand All Below' : 'Expand All',
        action: () => (node?.group ? setSubtreeExpanded(node, true) : api.expandAll()),
      };
    },
  },
  {
    name: 'contractAll',
    order: 23,
    factory: (params: MenuActionParams): MenuItemDef | null => {
      const { node, api } = params;
      if (api.getRowGroupColumns().length === 0) return null;
      return {
        name: node?.group ? 'Collapse All Below' : 'Collapse All',
        action: () => (node?.group ? setSubtreeExpanded(node, false) : api.collapseAll()),
      };
    },
  },
  {
    name: 'valueAggSubMenu',
    order: 24,
    factory: (params: MenuActionParams): MenuItemDef | null => {
      const { column, api } = params;
      if (!column) return null;
      const colDef = column.getColDef();
      if (!(colDef.enableValue === true || column.getAggFunc() != null)) return null;
      const colId = column.getColId();
      const names = (colDef.allowedAggFuncs as string[] | undefined) ?? BUILT_IN_AGG_FUNC_NAMES;
      const current = column.getAggFunc();
      return {
        name: 'Aggregate',
        subMenu: names.map((funcName) => ({
          name: AGG_FUNC_LABELS[funcName] ?? funcName,
          checked: current === funcName,
          action: () => api.setColumnAggFunc(colId, funcName),
        })),
      };
    },
  },
]);
