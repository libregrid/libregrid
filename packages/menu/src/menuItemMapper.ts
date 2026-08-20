import { BeanStub, type NamedBean, type MenuItemDef } from 'ag-grid-community';
import type { MenuActionParams } from './menuItemRegistry';
import { MenuItemRegistry } from './menuItemRegistry';

/**
 * Maps item names to MenuItemDef objects using the registry.
 *
 * This bean owns the MenuItemRegistry (a plain class, since 'menuItemRegistry'
 * is not in Community's BeanName union) and provides the bridge between the
 * registry and the menu services.
 */
export class MenuItemMapper extends BeanStub implements NamedBean {
  beanName = 'menuItemMapper' as const;

  /** The registry instance. Access this to register items at runtime. */
  public readonly registry = new MenuItemRegistry();

  /**
   * Resolve a list of item names to MenuItemDef objects.
   * 'separator' items are passed through as-is (they have no factory).
   * Registered items with string `subMenu` entries get those resolved
   * recursively, so feature packages can contribute submenus by name.
   */
  public mapItems(names: string[], params: MenuActionParams): (MenuItemDef | 'separator')[] {
    const result: (MenuItemDef | 'separator')[] = [];
    for (const name of names) {
      if (name === 'separator') {
        result.push('separator');
        continue;
      }
      const item = this.registry.getItem(name, params);
      if (item) {
        this.pushResolved(item, params, result);
      }
    }
    return result;
  }

  /**
   * Resolve a mixed list of names and MenuItemDef objects.
   */
  public mapMixed(
    items: (string | MenuItemDef)[],
    params: MenuActionParams,
  ): (MenuItemDef | 'separator')[] {
    const result: (MenuItemDef | 'separator')[] = [];
    for (const item of items) {
      if (typeof item === 'string') {
        if (item === 'separator') {
          result.push('separator');
          continue;
        }
        const resolved = this.registry.getItem(item, params);
        if (resolved) {
          this.pushResolved(resolved, params, result);
        }
      } else {
        result.push(this.mapDefinition(item, params));
      }
    }
    return result;
  }

  /**
   * Push a resolved item (or list of items) onto the result, mapping each
   * definition so nested subMenus are resolved recursively.
   */
  private pushResolved(
    item: MenuItemDef | MenuItemDef[],
    params: MenuActionParams,
    result: (MenuItemDef | 'separator')[],
  ): void {
    const items = Array.isArray(item) ? item : [item];
    for (const def of items) {
      result.push(this.mapDefinition(def, params));
    }
  }

  private mapDefinition(item: MenuItemDef, params: MenuActionParams): MenuItemDef {
    if (!item.subMenu) return item;
    const subMenu = this.mapMixed(item.subMenu, params).map((child) =>
      child === 'separator' ? ({ name: '__separator__' } as MenuItemDef) : child,
    );
    return { ...item, subMenu };
  }
}
