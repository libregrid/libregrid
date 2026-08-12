import type { MenuItemContribution } from './menuItemRegistry';
import { _readGlobalStore } from './menuItemRegistry';

/**
 * Register a single menu item at module scope.
 *
 * Feature packages call this in their module's top-level scope:
 *   registerMenuItem({ name: 'rowGroup', factory: (params) => ({ ... }) });
 *
 * The MenuItemRegistry bean reads these during postConstruct.
 */
export function registerMenuItem(contribution: MenuItemContribution): void {
  const store = _readGlobalStore() as Map<string, MenuItemContribution>;
  store.set(contribution.name, contribution);
}

/**
 * Register multiple menu items at module scope.
 *
 * Convenience wrapper for packages that contribute several items.
 */
export function registerMenuItems(contributions: MenuItemContribution[]): void {
  for (const c of contributions) {
    registerMenuItem(c);
  }
}
