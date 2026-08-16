/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { createMenuDom, type MenuItemInstance } from './menuDomRenderer';

class FakeItem implements MenuItemInstance {
  public agInit = vi.fn();
  public configureDefaults?: () => boolean | { suppressClick?: boolean } = () => true;
  public setActive = vi.fn();
  public setExpanded = vi.fn();
  public select = vi.fn();
  public destroy = vi.fn();
  private readonly gui = document.createElement('div');
  public getGui(): HTMLElement {
    this.gui.innerHTML = '<span>custom content</span>';
    return this.gui;
  }
}

describe('custom menu item components', () => {
  it('instantiates, initialises, and drives a default-behaviour component', () => {
    const instance = new FakeItem();
    const resolve = vi.fn(() => instance);
    const closeAll = vi.fn();
    const menu = createMenuDom(
      'context',
      [{ name: 'Custom', menuItem: class {}, menuItemParams: { id: 7 } }],
      { column: null, node: null, value: null, api: {} as never },
      { closeAll, resolveComponent: resolve },
    );
    document.body.appendChild(menu.element);

    expect(resolve).toHaveBeenCalledOnce();
    const initParams = resolve.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(initParams['level']).toBe(0);
    expect(initParams['menuItemParams']).toEqual({ id: 7 });
    expect(initParams['api']).toBeTruthy();
    expect(typeof initParams['openSubMenu']).toBe('function');
    expect(typeof initParams['closeMenu']).toBe('function');
    expect(typeof initParams['isAnotherSubMenuOpen']).toBe('function');

    const row = menu.element.querySelector<HTMLElement>('.lgr-menu-item');
    expect(row?.querySelector('.lgr-menu-item-custom')?.textContent).toBe('custom content');

    // Hover activates.
    row?.dispatchEvent(new MouseEvent('mouseenter'));
    expect(instance.setActive).toHaveBeenCalledWith(true);
    row?.dispatchEvent(new MouseEvent('mouseleave'));
    expect(instance.setActive).toHaveBeenCalledWith(false);

    // Click selects and closes.
    row?.click();
    expect(instance.select).toHaveBeenCalledOnce();
    expect(closeAll).toHaveBeenCalledOnce();

    // Destroy reaches the instance.
    menu.destroy();
    expect(instance.destroy).toHaveBeenCalledOnce();
    menu.element.remove();
  });

  it('respects configureDefaults() === false (component owns everything)', () => {
    const instance = new FakeItem();
    instance.configureDefaults = () => false;
    const menu = createMenuDom(
      'context',
      [{ name: 'Custom', menuItem: class {}, action: vi.fn() }],
      { column: null, node: null, value: null, api: {} as never },
      { closeAll: vi.fn(), resolveComponent: () => instance },
    );
    document.body.appendChild(menu.element);
    // With no defaults the row carries none of the grid's classes or roles.
    const row = menu.element.querySelector<HTMLElement>('.lgr-menu-list > :last-child');
    expect(row?.className).toBe('');
    expect(row?.getAttribute('role')).toBeNull();
    // No default click handling: selecting does not close the menu.
    row?.click();
    expect(instance.select).not.toHaveBeenCalled();
    menu.destroy();
    menu.element.remove();
  });

  it('respects selective suppression (suppressClick)', () => {
    const instance = new FakeItem();
    instance.configureDefaults = () => ({ suppressClick: true });
    const action = vi.fn();
    const closeAll = vi.fn();
    const menu = createMenuDom(
      'context',
      [{ name: 'Custom', menuItem: class {}, action }],
      { column: null, node: null, value: null, api: {} as never },
      { closeAll, resolveComponent: () => instance },
    );
    document.body.appendChild(menu.element);
    const row = menu.element.querySelector<HTMLElement>('.lgr-menu-item');
    row?.click();
    expect(instance.select).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
    expect(closeAll).not.toHaveBeenCalled();
    menu.destroy();
    menu.element.remove();
  });
});
