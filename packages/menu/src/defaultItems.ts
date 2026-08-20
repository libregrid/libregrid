import type { Column } from 'ag-grid-community';
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
  // The note item resolves to the real "Add/Edit/View Note" entries only when
  // @libregrid/notes is registered (its NotesService re-registers the same
  // name in postConstruct); without the module the 'note' factory is the
  // built-in null stub and the preceding separator is trimmed by the menu
  // service, so the default menu is unchanged.
  'separator',
  'note',
  'separator',
  // Resolved by @libregrid/calculated-columns when a calculated column is
  // the context-menu target. It remains hidden when that package is absent.
  'calculatedColumnRemove',
];

/**
 * Narrow a menu target to a Column (group-header menus carry an
 * AgProvidedColumnGroup, which has no `getColDef`). Structural check (not
 * `instanceof`) so it matches the factory's local guard and test fakes.
 */
function menuColumn(column: unknown): Column | null {
  return column != null && typeof (column as Column).getColDef === 'function' ? (column as Column) : null;
}

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
  'showValuesAs',
  'separator',
  // Resolved by @libregrid/calculated-columns when the feature is enabled.
  // This is deliberately part of the default recipe so end users can create
  // a derived column from any ordinary header without app code wiring a
  // custom menu callback.
  'calculatedColumn',
  'separator',
  'editColumnName',
];

// ---------------------------------------------------------------------------
// Built-in item factories — Phase 1 items only.
// Later phases register their own via registerMenuItems().
//
// The `factory: () => null` entries below are *fallback stubs*, not the real
// items: the owning package replaces each one in the global store when its
// module is registered (last-write-wins), so these keep the item hidden only
// while the owning module is absent:
//   copy / copyWithHeaders / copyWithGroupHeaders / cut / paste
//     -> @libregrid/clipboard (onRegister)
//   export / csvExport / excelExport
//     -> @libregrid/excel-export (onRegister)
//   rowGroup / rowUnGroup / expandAll / contractAll / valueAggSubMenu
//     -> @libregrid/row-grouping (menuItems.ts, module scope)
//   editColumnName
//     -> @libregrid/column-header-edit (service postConstruct)
//   showValuesAs
//     -> @libregrid/row-grouping (ShowValuesAsService postConstruct)
// ---------------------------------------------------------------------------

const builtInItems: MenuItemContribution[] = [
  {
    name: 'separator',
    factory: () => null, // Handled specially by the renderer
    order: -1,
  },
  {
    name: 'copy',
    factory: () => null, // Fallback stub — replaced by @libregrid/clipboard
    order: 0,
  },
  {
    name: 'copyWithHeaders',
    factory: () => null, // Fallback stub — replaced by @libregrid/clipboard
    order: 1,
  },
  {
    name: 'copyWithGroupHeaders',
    factory: () => null, // Fallback stub — replaced by @libregrid/clipboard
    order: 2,
  },
  {
    name: 'cut',
    factory: () => null, // Fallback stub — replaced by @libregrid/clipboard
    order: 3,
  },
  {
    name: 'paste',
    factory: () => null, // Fallback stub — replaced by @libregrid/clipboard
    order: 4,
  },
  {
    name: 'export',
    factory: () => null, // Fallback stub — replaced by @libregrid/excel-export
    order: 10,
  },
  {
    name: 'csvExport',
    factory: () => null, // Fallback stub — replaced by @libregrid/excel-export
    order: 11,
  },
  {
    name: 'excelExport',
    factory: () => null, // Fallback stub — replaced by @libregrid/excel-export
    order: 12,
  },
  {
    name: 'rowGroup',
    factory: () => null, // Fallback stub — replaced by @libregrid/row-grouping
    order: 20,
  },
  {
    name: 'rowUnGroup',
    factory: () => null, // Fallback stub — replaced by @libregrid/row-grouping
    order: 21,
  },
  {
    name: 'expandAll',
    factory: () => null, // Fallback stub — replaced by @libregrid/row-grouping
    order: 22,
  },
  {
    name: 'contractAll',
    factory: () => null, // Fallback stub — replaced by @libregrid/row-grouping
    order: 23,
  },
  {
    name: 'valueAggSubMenu',
    factory: () => null, // Fallback stub — replaced by @libregrid/row-grouping
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
    // Stub — resolved to the real "Edit Column Name" item at runtime when
    // @libregrid/column-header-edit is registered (its service registers the
    // same name with the live MenuItemMapper registry in postConstruct).
    // Returns null here so the item stays hidden without that module.
    name: 'editColumnName',
    factory: () => null,
    order: 41,
  },
  {
    // Stub — resolved to the real "Show Values As" item at runtime when
    // @libregrid/row-grouping is registered (ShowValuesAsService registers the
    // same name with the live MenuItemMapper registry in postConstruct).
    // Returns null here so the item stays hidden without that module.
    name: 'showValuesAs',
    factory: () => null,
    order: 43,
  },
  {
    name: 'calculatedColumn',
    factory: () => null, // Stub — Phase 13
    order: 42,
  },

  // Phase 1 items — these have real implementations.
  // Per-column items resolve the target to a Column and hide themselves for
  // group-header menus (single-column operations don't apply to a group).
  {
    name: 'sortAscending',
    factory: (params) => {
      const column = menuColumn(params.column);
      if (!column) return null;
      return {
        name: 'Sort Ascending',
        action: () =>
          params.api.applyColumnState({
            state: [{ colId: column.getColId(), sort: 'asc' }],
            defaultState: { sort: null },
          }),
        icon: 'sortAscending',
        order: 0,
      };
    },
    order: 0,
  },
  {
    name: 'sortDescending',
    factory: (params) => {
      const column = menuColumn(params.column);
      if (!column) return null;
      return {
        name: 'Sort Descending',
        action: () =>
          params.api.applyColumnState({
            state: [{ colId: column.getColId(), sort: 'desc' }],
            defaultState: { sort: null },
          }),
        icon: 'sortDescending',
        order: 1,
      };
    },
    order: 1,
  },
  {
    name: 'sortUnSort',
    factory: (params) => {
      const column = menuColumn(params.column);
      if (!column) return null;
      return {
        name: 'Clear Sort',
        action: () =>
          params.api.applyColumnState({
            state: [{ colId: column.getColId(), sort: null }],
            defaultState: { sort: null },
          }),
        icon: 'sortUnSort',
        order: 2,
      };
    },
    order: 2,
  },
  {
    name: 'pinSubMenu',
    factory: () => null, // TODO: implement pin sub-menu
    order: 3,
  },
  {
    name: 'autoSizeThis',
    factory: (params) => {
      const column = menuColumn(params.column);
      if (!column) return null;
      return {
        name: 'Auto-Size This Column',
        action: () => params.api.autoSizeColumns([column.getColId()]),
        order: 4,
      };
    },
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
      const column = menuColumn(params.column);
      if (!column) return null;
      const api = params.api as typeof params.api & { isModuleRegistered(moduleName: string): boolean };
      if (!api.isModuleRegistered('ColumnsToolPanel')) return null;
      return {
        name: 'Choose Columns',
        icon: 'columns',
        action: () => params.api.showColumnChooser(column.getColDef().columnChooserParams),
        order: 7,
      };
    },
    order: 7,
  },
  {
    name: 'columnFilter',
    factory: (params) => {
      const column = menuColumn(params.column);
      if (!column?.getColDef().filter) return null;
      return {
        name: 'Filter',
        icon: 'filter',
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
