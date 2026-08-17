import type { MenuItemDef, Column, IRowNode, GridApi } from 'ag-grid-community';

/** Parameters passed to a menu item factory when resolving an item. */
export interface MenuActionParams {
  column: Column | null;
  node: IRowNode | null;
  value: unknown;
  api: GridApi;
  context?: unknown;
}

/** Factory that produces a MenuItemDef (or null to hide the item). */
export type MenuItemFactory = (params: MenuActionParams) => MenuItemDef | null;

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

  /** Resolve a single item by name. Returns null if not found or factory returns null. */
  getItem(name: string, params: MenuActionParams): MenuItemDef | null {
    const c = this.items.get(name);
    return c ? c.factory(params) : null;
  }

  /** Build a list of MenuItemDefs from names, in registry order. */
  buildItems(names: string[], params: MenuActionParams): MenuItemDef[] {
    const resolved: { item: MenuItemDef; order: number }[] = [];
    for (const name of names) {
      const item = this.getItem(name, params);
      if (item) {
        resolved.push({ item, order: this.items.get(name)?.order ?? 0 });
      }
    }
    return resolved.sort((a, b) => a.order - b.order).map(({ item }) => item);
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
