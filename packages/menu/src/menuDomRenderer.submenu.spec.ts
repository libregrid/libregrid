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

describe('submenus survive the menu moving under a stationary pointer', () => {
  /**
   * Menus are position:absolute, so a page scroll, a smooth-scroll animation or
   * a late popup re-position slides them out from under a stationary cursor.
   * The browser then fires mouseleave/mouseenter with no user intent behind
   * them. Before this guard the submenu closed the instant you hovered it, with
   * no way to reopen — and only sometimes, whenever something moved the menu.
   */
  function pinMenuAt(el: HTMLElement, top: number): void {
    el.getBoundingClientRect = () =>
      ({
        top,
        left: 100,
        right: 100,
        bottom: top,
        width: 0,
        height: 0,
        x: 100,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect;
  }

  const pointerMove = (): void => {
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));
  };

  it('keeps the submenu open when the row leaves because the menu moved', () => {
    const { menu } = renderMenu([{ name: 'Parent', subMenu: [{ name: 'Child' }] }]);
    const root = menu.element;
    pinMenuAt(root, 100);
    pointerMove();

    const parent = root.querySelector<HTMLElement>('.lgr-menu-item');
    parent?.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(150);
    expect(root.querySelector('.lgr-sub-menu')).not.toBeNull();

    // The document scrolls: the menu shifts and the browser fires mouseleave
    // even though the pointer never moved.
    pinMenuAt(root, 20);
    parent?.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(150);

    expect(root.querySelector('.lgr-sub-menu')).not.toBeNull();
    menu.destroy();
  });

  it('still opens the submenu when the menu moves during the open delay', () => {
    // The open is scheduled on mouseenter and cancelled on mouseleave, so a
    // menu that moves inside that window would never show a submenu at all.
    const { menu } = renderMenu([{ name: 'Parent', subMenu: [{ name: 'Child' }] }]);
    const root = menu.element;
    pinMenuAt(root, 100);
    pointerMove();

    const parent = root.querySelector<HTMLElement>('.lgr-menu-item');
    parent?.dispatchEvent(new MouseEvent('mouseenter'));
    pinMenuAt(root, 20);
    parent?.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(150);

    expect(root.querySelector('.lgr-sub-menu')).not.toBeNull();
    menu.destroy();
  });

  it('does not let a plain row that slid under the pointer close the submenu', () => {
    const { menu } = renderMenu([
      { name: 'Parent', subMenu: [{ name: 'Child' }] },
      { name: 'Plain' },
    ]);
    const root = menu.element;
    pinMenuAt(root, 100);
    pointerMove();

    const rows = Array.from(root.querySelectorAll<HTMLElement>('.lgr-menu-item'));
    rows[0]?.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(150);
    expect(root.querySelector('.lgr-sub-menu')).not.toBeNull();

    // The menu moves and the plain row lands under the cursor on its own.
    pinMenuAt(root, 20);
    rows[1]?.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(150);

    expect(root.querySelector('.lgr-sub-menu')).not.toBeNull();
    menu.destroy();
  });

  it('still closes on a genuine pointer-driven leave', () => {
    const { menu } = renderMenu([{ name: 'Parent', subMenu: [{ name: 'Child' }] }]);
    const root = menu.element;
    pinMenuAt(root, 100);
    pointerMove();

    const parent = root.querySelector<HTMLElement>('.lgr-menu-item');
    parent?.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(150);
    expect(root.querySelector('.lgr-sub-menu')).not.toBeNull();

    // The menu has NOT moved; the pointer really did leave.
    pointerMove();
    parent?.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(150);

    expect(root.querySelector('.lgr-sub-menu')).toBeNull();
    menu.destroy();
  });
});

describe('submenus', () => {
  it.each([
    ['context', 'lgr-context-menu'],
    ['column', 'lgr-column-menu'],
  ] as const)('reserves .lgr-%s-menu for the root menu while a submenu is open', (kind, rootClass) => {
    const menu = createMenuDom(
      kind,
      [{ name: 'Parent', subMenu: [{ name: 'Child' }] }],
      params,
      { closeAll: vi.fn() },
    );
    document.body.appendChild(menu.element);

    menu.element.querySelector<HTMLElement>('.lgr-menu-item')?.click();

    expect(menu.element.querySelector('.lgr-sub-menu')).not.toBeNull();
    expect(document.querySelectorAll(`.${rootClass}`)).toHaveLength(1);
    expect(menu.element.classList.contains(rootClass)).toBe(true);
    expect(menu.element.querySelector('.lgr-sub-menu')?.classList.contains(rootClass)).toBe(false);
    menu.destroy();
  });

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
