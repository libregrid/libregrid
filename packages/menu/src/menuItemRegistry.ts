import type { MenuItemDef, AgProvidedColumnGroup, Column, IRowNode, GridApi } from 'ag-grid-community';

/** Parameters passed to a menu item factory when resolving an item. */
export interface MenuActionParams {
  /** The menu target: a column, or a column group (group-header menu). */
  column: Column | AgProvidedColumnGroup | null;
  node: IRowNode | null;
  value: unknown;
  api: GridApi;
  context?: unknown;
}

/**
 * Factory that produces a MenuItemDef, a list of MenuItemDefs, or null to hide
 * the item. Returning a list lets one token expand to several flat items based
 * on state (e.g. the `note` token yields Add Note / Edit Note + Remove Note).
 */
export type MenuItemFactory = (params: MenuActionParams) => MenuItemDef | MenuItemDef[] | null;

/** A contribution to the menu-item registry. */
export interface MenuItemContribution {
  /** Unique name, e.g. 'copy', 'rowGroup', 'separator'. */
  name: string;
  /** Factory that produces the MenuItemDef. */
  factory: MenuItemFactory;
  /** Sort order (lower = earlier). Default 0. */
  order?: number;
}

// ---------------------------------------------------------------------------
// Global registration store — written at module scope by feature packages.
// This is the ONLY way feature packages contribute menu items without a
// dependency on the menu package (which would create a circular dependency).
// The store is read by MenuItemMapper during postConstruct.
// ---------------------------------------------------------------------------

const _globalStore = new Map<string, MenuItemContribution>();

/** @internal — used by the registry. */
export function _readGlobalStore(): ReadonlyMap<string, MenuItemContribution> {
  return _globalStore;
}

/**
 * Menu-item registry — the extensibility point for LibreGrid menus.
 *
 * NOT a bean (the name 'menuItemRegistry' is not in Community's BeanName
 * union). Instead, it is a plain class owned by the MenuItemMapper bean.
 *
 * Later phases register their items here without editing this package.
 */
export class MenuItemRegistry {
  private items = new Map<string, MenuItemContribution>();

  constructor() {
    // Read contributions registered at module scope
    for (const [name, contribution] of _globalStore) {
      this.items.set(name, contribution);
    }
  }

  /** Register a single item. Overwrites any existing item with the same name. */
  register(contribution: MenuItemContribution): void {
    this.items.set(contribution.name, contribution);
  }

  /**
   * Resolve a single item by name. Returns null if not found or the factory
   * returns null. The factory may return one item or a list of items.
   */
  getItem(name: string, params: MenuActionParams): MenuItemDef | MenuItemDef[] | null {
    const c = this.items.get(name);
    return c ? c.factory(params) : null;
  }

  /**
   * Build a list of MenuItemDefs from names, in registry order. A factory that
   * returns a list contributes each item in the list's own order.
   */
  buildItems(names: string[], params: MenuActionParams): MenuItemDef[] {
    const resolved: { item: MenuItemDef; order: number; group: number; seq: number }[] = [];
    names.forEach((name, group) => {
      const item = this.getItem(name, params);
      if (!item) return;
      const order = this.items.get(name)?.order ?? 0;
      const items = Array.isArray(item) ? item : [item];
      items.forEach((entry, seq) => {
        resolved.push({ item: entry, order, group, seq });
      });
    });
    // order is primary; then the name's position in the list (so one name's
    // items stay together); then the list order within the name.
    return resolved
      .sort((a, b) => a.order - b.order || a.group - b.group || a.seq - b.seq)
      .map(({ item }) => item);
  }

  /** Check if an item is registered. */
  has(name: string): boolean {
    return this.items.has(name);
  }

  /** Get all registered item names. */
  getRegisteredNames(): string[] {
    return [...this.items.keys()];
  }
}
