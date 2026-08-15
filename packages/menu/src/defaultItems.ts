import type { MenuItemContribution } from './menuItemRegistry';
import { openColumnFilterPopup } from './filterPopup';
import { registerMenuItems } from './registryApi';

/**
 * Default context menu items — always available.
 * These are the items whose owning feature exists in Phase 1.
 * Later phases register their own items via registerMenuItems().
 */
export const DEFAULT_CONTEXT_MENU_ITEMS: string[] = [
  'copy',
  'copyWithHeaders',
  'copyWithGroupHeaders',
  'separator',
  'paste',
  'separator',
  'export',
];

/**
 * Default column menu items — always available.
 */
export const DEFAULT_COLUMN_MENU_ITEMS: string[] = [
  'sortAscending',
  'sortDescending',
  'sortUnSort',
  'separator',
  'pinSubMenu',
  'autoSizeThis',
  'autoSizeAll',
  'separator',
  'resetColumns',
  'separator',
  'columnChooser',
  'columnFilter',
];

// ---------------------------------------------------------------------------
// Built-in item factories — Phase 1 items only.
// Later phases register their own via registerMenuItems().
// ---------------------------------------------------------------------------

const builtInItems: MenuItemContribution[] = [
  {
    name: 'separator',
    factory: () => null, // Handled specially by the renderer
    order: -1,
  },
  {
    name: 'copy',
    factory: () => null, // Stub — implemented in Phase 4
    order: 0,
  },
  {
    name: 'copyWithHeaders',
    factory: () => null, // Stub — Phase 4
    order: 1,
  },
  {
    name: 'copyWithGroupHeaders',
    factory: () => null, // Stub — Phase 4
    order: 2,
  },
  {
    name: 'cut',
    factory: () => null, // Stub — Phase 4
    order: 3,
  },
  {
    name: 'paste',
    factory: () => null, // Stub — Phase 4
    order: 4,
  },
  {
    name: 'export',
    factory: () => null, // Stub — Phase 5
    order: 10,
  },
  {
    name: 'csvExport',
    factory: () => null, // Stub — Phase 5
    order: 11,
  },
  {
    name: 'excelExport',
    factory: () => null, // Stub — Phase 5
    order: 12,
  },
  {
    name: 'rowGroup',
    factory: () => null, // Stub — Phase 2
    order: 20,
  },
  {
    name: 'rowUnGroup',
    factory: () => null, // Stub — Phase 2
    order: 21,
  },
  {
    name: 'expandAll',
    factory: () => null, // Stub — Phase 2
    order: 22,
  },
  {
    name: 'contractAll',
    factory: () => null, // Stub — Phase 2
    order: 23,
  },
  {
    name: 'valueAggSubMenu',
    factory: () => null, // Stub — Phase 2
    order: 24,
  },
  {
    name: 'chartRange',
    factory: () => null, // Stub — Phase 12
    order: 30,
  },
  {
    name: 'pivotChart',
    factory: () => null, // Stub — Phase 12
    order: 31,
  },
  {
    name: 'note',
    factory: () => null, // Stub — Phase 13
    order: 40,
  },
  {
    name: 'editColumnName',
    factory: () => null, // Stub — Phase 13
    order: 41,
  },
  {
    name: 'calculatedColumn',
    factory: () => null, // Stub — Phase 13
    order: 42,
  },

  // Phase 1 items — these have real implementations
  {
    name: 'sortAscending',
    factory: (params) => ({
      name: 'Sort Ascending',
      action: () => {
        if (params.column) {
          params.api.applyColumnState({
            state: [{ colId: params.column.getColId(), sort: 'asc' }],
            defaultState: { sort: null },
          });
        }
      },
      icon: '↑',
      order: 0,
    }),
    order: 0,
  },
  {
    name: 'sortDescending',
    factory: (params) => ({
      name: 'Sort Descending',
      action: () => {
        if (params.column) {
          params.api.applyColumnState({
            state: [{ colId: params.column.getColId(), sort: 'desc' }],
            defaultState: { sort: null },
          });
        }
      },
      icon: '↓',
      order: 1,
    }),
    order: 1,
  },
  {
    name: 'sortUnSort',
    factory: (params) => ({
      name: 'Clear Sort',
      action: () => {
        if (params.column) {
          params.api.applyColumnState({
            state: [{ colId: params.column.getColId(), sort: null }],
            defaultState: { sort: null },
          });
        }
      },
      order: 2,
    }),
    order: 2,
  },
  {
    name: 'pinSubMenu',
    factory: () => null, // TODO: implement pin sub-menu
    order: 3,
  },
  {
    name: 'autoSizeThis',
    factory: (params) => ({
      name: 'Auto-Size This Column',
      action: () => {
        if (params.column) {
          params.api.autoSizeColumns([params.column.getColId()]);
        }
      },
      order: 4,
    }),
    order: 4,
  },
  {
    name: 'autoSizeAll',
    factory: (params) => ({
      name: 'Auto-Size All Columns',
      action: () => {
        params.api.autoSizeAllColumns();
      },
      order: 5,
    }),
    order: 5,
  },
  {
    name: 'resetColumns',
    factory: (params) => ({
      name: 'Reset Columns',
      action: () => {
        params.api.resetColumnState();
      },
      order: 6,
    }),
    order: 6,
  },
  {
    name: 'columnChooser',
    factory: (params) => {
      const api = params.api as typeof params.api & { isModuleRegistered(moduleName: string): boolean };
      if (!api.isModuleRegistered('ColumnsToolPanel')) return null;
      return {
        name: 'Choose Columns',
        action: () => params.api.showColumnChooser(params.column?.getColDef().columnChooserParams),
        order: 7,
      };
    },
    order: 7,
  },
  {
    name: 'columnFilter',
    factory: (params) => {
      const column = params.column;
      if (!column?.getColDef().filter) return null;
      return {
        name: 'Filter',
        // api.showColumnFilter routes through the enterprise menuSvc bean,
        // which the menu package deliberately does not register (Community's
        // header comp removes the column-menu button when it exists).
        action: () => openColumnFilterPopup(params.api, column.getColId()),
        order: 8,
      };
    },
    order: 8,
  },
  {
    name: 'pinRowSubMenu',
    factory: () => null, // Stub — row pinning
    order: 50,
  },
  {
    name: 'pinTop',
    factory: () => null,
    order: 51,
  },
  {
    name: 'pinBottom',
    factory: () => null,
    order: 52,
  },
  {
    name: 'unpinRow',
    factory: () => null,
    order: 53,
  },
];

// Register all built-in items at module scope
registerMenuItems(builtInItems);
