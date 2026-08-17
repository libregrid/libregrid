/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMenuDom } from './menuDomRenderer';

/**
 * Submenu and separator behavior of the shared DOM renderer.
 *
 * Submenus must live INSIDE the registered menu element (the popup child), so
 * the grid popup service's outside-click detection still treats interactions
 * with them as inside the popup — see contextMenuSvc.renderMenu.
 */

const params = { column: null, node: null, value: null, api: {} as never };

function renderMenu(items: Parameters<typeof createMenuDom>[1], closeAll = vi.fn()) {
  const menu = createMenuDom('context', items, params, { closeAll });
  document.body.appendChild(menu.element);
  return { menu, closeAll };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('separators', () => {
  it('render one part per option column so the line spans the full width', () => {
    const { menu } = renderMenu([{ name: 'A', shortcut: 'Ctrl+A' }, 'separator', { name: 'B' }]);
    const separator = menu.element.querySelector<HTMLElement>('.lgr-menu-separator');
    expect(separator?.getAttribute('role')).toBe('separator');
    expect(separator?.querySelectorAll('.lgr-menu-separator-part')).toHaveLength(4);
    expect(separator?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
    menu.destroy();
  });
});

describe('submenus', () => {
  it('open on hover inside the menu element and close after the grace delay', () => {
    const { menu } = renderMenu([{ name: 'Parent', subMenu: [{ name: 'Child' }] }]);
    const parent = menu.element.querySelector<HTMLElement>('.lgr-menu-item');
    parent?.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(150);
    const submenu = menu.element.querySelector<HTMLElement>('.lgr-sub-menu');
    expect(submenu).not.toBeNull();
    expect(submenu?.querySelector('.lgr-menu-item')?.textContent).toBe('Child');
    expect(parent?.classList.contains('lgr-menu-item-submenu-open')).toBe(true);
    expect(parent?.getAttribute('aria-expanded')).toBe('true');
    // The submenu is a descendant of the registered menu element (the popup
    // child), not a sibling appended to the document body.
    expect(submenu?.parentElement).toBe(menu.element);

    // Moving to the submenu keeps it open; leaving everything closes it.
    parent?.dispatchEvent(new MouseEvent('mouseleave'));
    submenu?.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(150);
    expect(menu.element.querySelector('.lgr-sub-menu')).not.toBeNull();
    submenu?.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(150);
    expect(menu.element.querySelector('.lgr-sub-menu')).toBeNull();
    expect(parent?.getAttribute('aria-expanded')).toBe('false');
    menu.destroy();
  });

  it('clicking a child item fires its action and closes the whole menu', () => {
    const action = vi.fn();
    const { menu, closeAll } = renderMenu([{ name: 'Parent', subMenu: [{ name: 'Child', action }] }]);
    const parent = menu.element.querySelector<HTMLElement>('.lgr-menu-item');
    parent?.click();
    const child = menu.element.querySelectorAll<HTMLElement>('.lgr-sub-menu .lgr-menu-item')[0];
    child?.click();
    expect(action).toHaveBeenCalledOnce();
    expect(closeAll).toHaveBeenCalledOnce();
    // Destroying the menu (what closeAll triggers in the grid service) also
    // tears down the nested submenu.
    menu.destroy();
    expect(menu.element.querySelector('.lgr-sub-menu')).toBeNull();
  });

  it('ArrowRight opens the submenu and focuses its first item; ArrowLeft returns to the parent', () => {
    const { menu } = renderMenu([{ name: 'Parent', subMenu: [{ name: 'Child A' }, { name: 'Child B' }] }, { name: 'Other' }]);
    const parent = menu.element.querySelector<HTMLElement>('.lgr-menu-item');
    parent?.focus();
    parent?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    const submenu = menu.element.querySelector<HTMLElement>('.lgr-sub-menu');
    expect(submenu).not.toBeNull();
    const children = submenu?.querySelectorAll<HTMLElement>('.lgr-menu-item') ?? [];
    expect(document.activeElement).toBe(children[0]);

    // ArrowDown moves within the submenu exactly one row — the parent menu
    // must not double-handle the bubbled event.
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(children[1]);

    // ArrowLeft closes the submenu and returns focus to the parent row.
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(menu.element.querySelector('.lgr-sub-menu')).toBeNull();
    expect(document.activeElement).toBe(parent);
    menu.destroy();
  });

  it('Escape from inside the submenu closes the whole menu', () => {
    const { menu, closeAll } = renderMenu([{ name: 'Parent', subMenu: [{ name: 'Child' }] }]);
    const parent = menu.element.querySelector<HTMLElement>('.lgr-menu-item');
    parent?.click();
    const child = menu.element.querySelector<HTMLElement>('.lgr-sub-menu .lgr-menu-item');
    child?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closeAll).toHaveBeenCalledOnce();
    menu.destroy();
  });

  it('hovering a plain item closes an open submenu after the delay', () => {
    const { menu } = renderMenu([{ name: 'Parent', subMenu: [{ name: 'Child' }] }, { name: 'Plain' }]);
    const rows = menu.element.querySelectorAll<HTMLElement>('.lgr-menu-item');
    rows[0]?.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(150);
    expect(menu.element.querySelector('.lgr-sub-menu')).not.toBeNull();
    rows[1]?.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(150);
    expect(menu.element.querySelector('.lgr-sub-menu')).toBeNull();
    menu.destroy();
  });

  it('keeps the parent row highlighted while its submenu is open', () => {
    const { menu } = renderMenu([{ name: 'Parent', subMenu: [{ name: 'Child' }] }]);
    const parent = menu.element.querySelector<HTMLElement>('.lgr-menu-item');
    parent?.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(150);
    parent?.dispatchEvent(new MouseEvent('mouseleave'));
    // Mouse left the parent, but its submenu is open: the highlight stays.
    expect(parent?.classList.contains('lgr-menu-item-submenu-open')).toBe(true);
    menu.destroy();
  });

  it('supports nested submenus and destroys custom instances on close', () => {
    const destroy = vi.fn();
    const resolveComponent = vi.fn(() => ({ getGui: () => document.createElement('span'), destroy }));
    const menuWithComponent = createMenuDom(
      'context',
      [
        {
          name: 'Level 1',
          subMenu: [
            {
              name: 'Level 2',
              subMenu: [{ name: 'Leaf', menuItem: class {}, menuItemParams: { id: 1 } }],
            },
          ],
        },
      ],
      params,
      { closeAll: vi.fn(), resolveComponent },
    );
    document.body.appendChild(menuWithComponent.element);

    const level1 = menuWithComponent.element.querySelector<HTMLElement>('.lgr-menu-item');
    level1?.click();
    const level2 = menuWithComponent.element.querySelector<HTMLElement>('.lgr-sub-menu .lgr-menu-item');
    level2?.click();
    const leaf = menuWithComponent.element.querySelector<HTMLElement>('.lgr-sub-menu .lgr-sub-menu .lgr-menu-item');
    expect(leaf?.querySelector('.lgr-menu-item-custom')).not.toBeNull();

    // Destroying the root tears down every level, including custom items.
    menuWithComponent.destroy();
    expect(menuWithComponent.element.querySelector('.lgr-sub-menu')).toBeNull();
    expect(destroy).toHaveBeenCalledOnce();
  });
});
