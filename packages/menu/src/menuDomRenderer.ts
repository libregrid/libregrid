import type { MenuItemDef } from 'ag-grid-community';
import { iconSvg } from '@libregrid/core';
import { inheritThemeTokens as inheritThemeTokensImpl } from '@libregrid/core';
import type { MenuActionParams } from './menuItemRegistry';

/** Sentinel name used for separator rows inside a menu item list. */
export const SEPARATOR_NAME = '__separator__';

/**
 * Normalise the `'separator'` string tokens produced by the mapper into
 * `MenuItemDef` sentinel objects every renderer understands.
 */
export function normalizeSeparators(items: (MenuItemDef | 'separator')[]): MenuItemDef[] {
  return items.map((item) => (item === 'separator' ? { name: SEPARATOR_NAME } : item));
}

/** Defaults a custom menu item component can opt in or out of. */
export interface MenuConfigDefaults {
  suppressTooltip?: boolean;
  suppressClick?: boolean;
  suppressMouseDown?: boolean;
  suppressMouseOver?: boolean;
  suppressKeyboardSelect?: boolean;
  suppressTabIndex?: boolean;
  suppressAria?: boolean;
  suppressRootStyles?: boolean;
  suppressFocus?: boolean;
}

/** The custom menu item component contract (IMenuItemComp). */
export interface MenuItemInstance {
  agInit?(params: object): void;
  configureDefaults?(): boolean | MenuConfigDefaults;
  setActive?(active: boolean): void;
  setExpanded?(expanded: boolean): void;
  select?(): void;
  getGui(): HTMLElement;
  destroy?(): void;
}

export interface MenuDomOptions {
  /** Closes this level (a submenu) and returns focus to the parent item. */
  closeLevel?: () => void;
  /** Closes the whole popup. */
  closeAll: () => void;
  /**
   * Instantiates a custom menu item component (MenuItemDef.menuItem) through
   * the grid's component factory. Absent in unit tests without a grid.
   */
  resolveComponent?: (component: unknown, initParams: object) => MenuItemInstance | undefined;
}

export interface MenuDom {
  readonly element: HTMLElement;
  focusFirst(): void;
  destroy(): void;
}

const SUBMENU_OPEN_DELAY_MS = 150;
const SUBMENU_CLOSE_DELAY_MS = 150;
const TYPEAHEAD_RESET_MS = 500;

/**
 * Framework-neutral DOM menu with theme-native rows, icons, shortcuts,
 * separators, working submenus, and ARIA keyboard navigation. Used as the
 * fallback renderer by both the column menu and the context menu.
 */
export function createMenuDom(
  kind: 'context' | 'column',
  items: (MenuItemDef | 'separator' | string)[],
  params: MenuActionParams,
  options: MenuDomOptions,
  depth = 0,
): MenuDom {
  const resolved = normalizeSeparators(
    items.filter((item): item is MenuItemDef | 'separator' => item === 'separator' || typeof item !== 'string'),
  );

  const root = document.createElement('div');
  root.className = kind === 'context' ? 'lgr-menu lgr-context-menu' : 'lgr-menu lgr-column-menu';
  root.setAttribute('role', 'menu');
  root.tabIndex = -1;

  const scroll = document.createElement('div');
  scroll.className = 'lgr-menu-scroll';
  const list = document.createElement('div');
  list.className = 'lgr-menu-list';
  scroll.appendChild(list);
  root.appendChild(scroll);

  // Column presence is menu-wide, not per-row: every row renders the shortcut
  // and arrow cells (empty when absent) so all rows span the full table width
  // and the hover highlight reaches the menu edge.
  const menuHasShortcut = resolved.some((item) => Boolean(item.shortcut));
  const menuHasSubmenu = resolved.some(
    (item) =>
      (item.subMenu?.filter((child): child is MenuItemDef => typeof child !== 'string') ?? [])
        .length > 0,
  );

  let openSubmenu: { element: HTMLElement; parentRow: HTMLElement; dom: MenuDom } | null = null;
  let openTimer: number | undefined;
  let closeTimer: number | undefined;
  let typeahead = '';
  let typeaheadTimer: number | undefined;
  let destroyed = false;
  const customInstances = new Set<MenuItemInstance>();
  const rowCustomInstances = new WeakMap<HTMLElement, MenuItemInstance>();

  const closeSubmenu = (): void => {
    if (!openSubmenu) return;
    const { element, parentRow, dom } = openSubmenu;
    openSubmenu = null;
    element.remove();
    parentRow.setAttribute('aria-expanded', 'false');
    parentRow.classList.remove('lgr-menu-item-submenu-open', 'lgr-menu-item-active');
    const parentInstance = rowCustomInstances.get(parentRow);
    parentInstance?.setExpanded?.(false);
    parentInstance?.setActive?.(false);
    // destroy() removes any deeper levels and their custom item instances.
    dom.destroy();
  };

  const openSubmenuFor = (row: HTMLElement, item: MenuItemDef): void => {
    if (openSubmenu?.parentRow === row) return;
    closeSubmenu();
    const children = item.subMenu?.filter((child): child is MenuItemDef => typeof child !== 'string') ?? [];
    if (children.length === 0) return;
    const submenu = createMenuDom(
      kind,
      item.subMenu ?? [],
      params,
      {
        closeLevel: () => {
          closeSubmenu();
          row.focus();
        },
        closeAll: options.closeAll,
        ...(options.resolveComponent ? { resolveComponent: options.resolveComponent } : {}),
      },
      depth + 1,
    );
    const submenuEl = submenu.element;
    submenuEl.classList.add('lgr-sub-menu');
    // The submenu lives inside the root menu element so the grid's popup
    // service treats clicks in it as inside the popup (its outside-click
    // detection only recognises the registered popup child and its
    // descendants). It is position:fixed, so it still renders outside the
    // root's overflow box.
    root.appendChild(submenuEl);
    openSubmenu = { element: submenuEl, parentRow: row, dom: submenu };
    row.setAttribute('aria-expanded', 'true');
    row.classList.add('lgr-menu-item-submenu-open');
    rowCustomInstances.get(row)?.setExpanded?.(true);
    inheritThemeTokensImpl(root, submenuEl);
    positionSubmenu(submenuEl, row);
    scheduleSubmenuCloseGuards(submenuEl, row, submenu);
  };

  const scheduleSubmenuCloseGuards = (submenuEl: HTMLElement, row: HTMLElement, submenu: MenuDom): void => {
    row.addEventListener('mouseleave', () => {
      closeTimer = window.setTimeout(() => closeSubmenu(), SUBMENU_CLOSE_DELAY_MS);
    });
    submenuEl.addEventListener('mouseenter', () => {
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
    });
    submenuEl.addEventListener('mouseleave', () => {
      closeTimer = window.setTimeout(() => closeSubmenu(), SUBMENU_CLOSE_DELAY_MS);
    });
    // Keep the submenu DOM in sync with the parent menu's lifecycle.
    const submenuDestroy = submenu.destroy.bind(submenu);
    submenu.destroy = () => {
      closeSubmenu();
      submenuDestroy();
    };
  };

  const positionSubmenu = (submenuEl: HTMLElement, row: HTMLElement): void => {
    // Submenus are position:absolute relative to the root `.lgr-menu`, so all
    // coordinates are computed root-relative (not viewport-relative). This
    // keeps them anchored even when a host app applies a transform/filter/
    // contain to an ancestor of the grid — that transform affects the root
    // menu too, but the delta between the row and the root is unchanged.
    const rootRect = root.getBoundingClientRect();
    const rect = row.getBoundingClientRect();
    const menuWidth = submenuEl.offsetWidth;
    const menuHeight = submenuEl.offsetHeight;
    const margin = 4;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Horizontal: prefer to the right of the row; flip left when it overflows.
    let left = rect.right - rootRect.left - margin;
    if (rootRect.left + left + menuWidth > viewportWidth - margin) {
      left = rect.left - rootRect.left - menuWidth + margin;
    }
    left = Math.max(margin - rootRect.left, left);

    // Vertical: align with the row top; clamp to the viewport.
    let top = rect.top - rootRect.top;
    if (rootRect.top + top + menuHeight > viewportHeight - margin) {
      top = viewportHeight - margin - menuHeight - rootRect.top;
    }
    top = Math.max(margin - rootRect.top, top);

    submenuEl.style.left = `${left}px`;
    submenuEl.style.top = `${top}px`;
  };

  const enabledRows = (scope: HTMLElement): HTMLElement[] =>
    Array.from(scope.querySelectorAll<HTMLElement>('.lgr-menu-item:not(.lgr-menu-item-disabled)'));

  const activate = (row: HTMLElement, item: MenuItemDef): void => {
    const children = item.subMenu?.filter((child): child is MenuItemDef => typeof child !== 'string') ?? [];
    if (children.length > 0) {
      openSubmenuFor(row, item);
      // Keyboard activation moves focus into the submenu (native behavior).
      enabledRows(openSubmenu?.element ?? list)[0]?.focus();
      return;
    }
    row.click();
  };

  for (const item of resolved) {
    const isSeparator = item.name === SEPARATOR_NAME;
    if (isSeparator) {
      const sep = document.createElement('div');
      sep.className = 'lgr-menu-separator';
      sep.setAttribute('role', 'separator');
      // One part per option column (icon / name / shortcut / arrow) so the
      // border-top on each cell spans the full menu width.
      for (let column = 0; column < 4; column++) {
        const part = document.createElement('div');
        part.className = 'lgr-menu-separator-part';
        part.setAttribute('aria-hidden', 'true');
        sep.appendChild(part);
      }
      list.appendChild(sep);
      continue;
    }

    const row = document.createElement('div');
    const hasSubmenu = (item.subMenu?.filter((child): child is MenuItemDef => typeof child !== 'string') ?? []).length > 0;
    if (item.menuItem) {
      attachCustomItem(item, row, hasSubmenu);
      list.appendChild(row);
      continue;
    }

    row.className = 'lgr-menu-item';
    row.setAttribute('role', item.checked ? 'menuitemcheckbox' : 'menuitem');
    row.tabIndex = -1;
    if (item.checked) row.setAttribute('aria-checked', 'true');
    if (item.disabled) {
      row.classList.add('lgr-menu-item-disabled');
      row.setAttribute('aria-disabled', 'true');
    }
    if (item.tooltip) row.title = item.tooltip;
    if (item.cssClasses) row.classList.add(...item.cssClasses);
    if (hasSubmenu) row.setAttribute('aria-haspopup', 'true');

    const iconCell = document.createElement('span');
    iconCell.className = 'lgr-menu-item-icon';
    const iconContent = item.checked ? iconSvg('check') : renderIcon(item.icon);
    if (iconContent) iconCell.innerHTML = iconContent;
    row.appendChild(iconCell);

    const nameCell = document.createElement('span');
    nameCell.className = 'lgr-menu-item-name';
    nameCell.textContent = item.name;
    row.appendChild(nameCell);

    if (menuHasShortcut) {
      const shortcutCell = document.createElement('span');
      shortcutCell.className = 'lgr-menu-item-shortcut';
      shortcutCell.textContent = item.shortcut ?? '';
      row.appendChild(shortcutCell);
    }

    if (menuHasSubmenu) {
      const arrowCell = document.createElement('span');
      arrowCell.className = 'lgr-menu-item-arrow';
      arrowCell.innerHTML = hasSubmenu ? iconSvg('subMenuOpen') ?? '›' : '';
      row.appendChild(arrowCell);
    }

    row.addEventListener('click', (event) => {
      event.stopPropagation();
      if (item.disabled) return;
      if (hasSubmenu) {
        if (openSubmenu?.parentRow === row) {
          closeSubmenu();
        } else {
          openSubmenuFor(row, item);
        }
        return;
      }
      if (item.action) {
        item.action(params as never);
      }
      if (!item.suppressCloseOnSelect) {
        options.closeAll();
      }
    });

    row.addEventListener('mouseenter', () => {
      if (item.disabled) return;
      if (openTimer !== undefined) window.clearTimeout(openTimer);
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
      setActiveRow(row);
      if (hasSubmenu) {
        if (openSubmenu?.parentRow !== row) {
          openTimer = window.setTimeout(() => openSubmenuFor(row, item), SUBMENU_OPEN_DELAY_MS);
        }
      } else if (openSubmenu) {
        // Hovering a plain item closes an open submenu after the grace delay.
        closeTimer = window.setTimeout(() => closeSubmenu(), SUBMENU_CLOSE_DELAY_MS);
      }
    });
    row.addEventListener('mouseleave', () => {
      if (openTimer !== undefined) window.clearTimeout(openTimer);
      // Keep the row highlighted while its submenu is open.
      if (openSubmenu?.parentRow === row) return;
      row.classList.remove('lgr-menu-item-active');
    });

    list.appendChild(row);
  }

  function attachCustomItem(item: MenuItemDef, row: HTMLElement, hasSubmenu: boolean): void {
    if (!options.resolveComponent) return;
    const instance = options.resolveComponent(item.menuItem, {
      name: item.name,
      disabled: item.disabled,
      shortcut: item.shortcut,
      action: item.action,
      checked: item.checked,
      icon: item.icon,
      cssClasses: item.cssClasses,
      tooltip: item.tooltip,
      subMenu: item.subMenu,
      menuItem: item.menuItem,
      menuItemParams: item.menuItemParams,
      api: params.api,
      context: params.context,
      level: depth,
      isAnotherSubMenuOpen: () => openSubmenu !== null,
      openSubMenu: (activateFirstItem?: boolean) => {
        openSubmenuFor(row, item);
        if (activateFirstItem) {
          enabledRows(openSubmenu?.element ?? list)[0]?.focus();
        }
      },
      closeSubMenu: () => closeSubmenu(),
      closeMenu: () => options.closeAll(),
      updateTooltip: (tooltip?: string) => {
        if (tooltip) row.title = tooltip;
      },
      onItemActivated: () => setActiveRow(row),
    });
    if (!instance) return;
    customInstances.add(instance);

    const configured = instance.configureDefaults?.();
    const defaults: MenuConfigDefaults | null =
      configured === true
        ? {}
        : configured === false || configured === undefined
          ? null
          : configured;
    if (defaults === null) {
      // Component owns all behaviour and styling.
      const customCell = document.createElement('span');
      customCell.className = 'lgr-menu-item-custom';
      customCell.appendChild(instance.getGui());
      row.appendChild(customCell);
      return;
    }

    const suppress = defaults;
    if (!suppress.suppressRootStyles) {
      row.classList.add('lgr-menu-item');
      if (item.disabled) row.classList.add('lgr-menu-item-disabled');
      if (item.cssClasses) row.classList.add(...item.cssClasses);
    }
    if (!suppress.suppressTabIndex) {
      row.tabIndex = -1;
    }
    if (!suppress.suppressAria) {
      row.setAttribute('role', 'menuitem');
      if (item.checked) row.setAttribute('aria-checked', 'true');
      if (item.disabled) row.setAttribute('aria-disabled', 'true');
      if (hasSubmenu) row.setAttribute('aria-haspopup', 'true');
    }
    if (!suppress.suppressTooltip && item.tooltip) {
      row.title = item.tooltip;
    }

    const iconCell = document.createElement('span');
    iconCell.className = 'lgr-menu-item-icon';
    const iconContent = item.checked ? iconSvg('check') : renderIcon(item.icon);
    if (iconContent) iconCell.innerHTML = iconContent;
    row.appendChild(iconCell);

    const customCell = document.createElement('span');
    customCell.className = 'lgr-menu-item-custom';
    customCell.appendChild(instance.getGui());
    row.appendChild(customCell);

    if (menuHasShortcut) {
      const shortcutCell = document.createElement('span');
      shortcutCell.className = 'lgr-menu-item-shortcut';
      shortcutCell.textContent = item.shortcut ?? '';
      row.appendChild(shortcutCell);
    }

    if (menuHasSubmenu) {
      const arrowCell = document.createElement('span');
      arrowCell.className = 'lgr-menu-item-arrow';
      arrowCell.innerHTML = hasSubmenu ? iconSvg('subMenuOpen') ?? '›' : '';
      row.appendChild(arrowCell);
    }

    if (!suppress.suppressMouseOver) {
      row.addEventListener('mouseenter', () => {
        if (item.disabled) return;
        if (openTimer !== undefined) window.clearTimeout(openTimer);
        if (closeTimer !== undefined) window.clearTimeout(closeTimer);
        setActiveRow(row);
        instance.setActive?.(true);
        if (hasSubmenu) {
          if (openSubmenu?.parentRow !== row) {
            openTimer = window.setTimeout(() => openSubmenuFor(row, item), SUBMENU_OPEN_DELAY_MS);
          }
        } else if (openSubmenu) {
          closeTimer = window.setTimeout(() => closeSubmenu(), SUBMENU_CLOSE_DELAY_MS);
        }
      });
      row.addEventListener('mouseleave', () => {
        if (openTimer !== undefined) window.clearTimeout(openTimer);
        // Keep the row highlighted while its submenu is open.
        if (openSubmenu?.parentRow === row) return;
        row.classList.remove('lgr-menu-item-active');
        instance.setActive?.(false);
      });
    }

    if (!suppress.suppressClick) {
      row.addEventListener('click', (event) => {
        event.stopPropagation();
        if (item.disabled) return;
        instance.select?.();
        if (hasSubmenu) {
          if (openSubmenu?.parentRow === row) {
            closeSubmenu();
          } else {
            openSubmenuFor(row, item);
          }
          return;
        }
        if (item.action) {
          item.action(params as never);
        }
        if (!item.suppressCloseOnSelect) {
          options.closeAll();
        }
      });
    }

    rowCustomInstances.set(row, instance);
  };

  const setActiveRow = (row: HTMLElement): void => {
    // Scope to this level's own rows — submenu rows manage their own state.
    for (const other of enabledRows(list)) {
      other.classList.toggle('lgr-menu-item-active', other === row);
    }
  };

  root.addEventListener('focusin', () => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    // Rows inside an open submenu are handled by that submenu's listeners.
    if (openSubmenu?.element.contains(active)) return;
    if (active.classList.contains('lgr-menu-item')) {
      setActiveRow(active);
      rowCustomInstances.get(active)?.setActive?.(true);
    }
  });

  root.addEventListener('keydown', (event) => {
    // Events from an open submenu are processed by that submenu's own
    // keydown handler as they bubble; ancestors must not double-handle them.
    if (openSubmenu && event.target instanceof Node && openSubmenu.element.contains(event.target)) {
      return;
    }
    const rows = enabledRows(list);
    const currentIndex = rows.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        rows[(currentIndex + 1) % rows.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        rows[(currentIndex - 1 + rows.length) % rows.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        rows[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        rows[rows.length - 1]?.focus();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        {
          const row = document.activeElement as HTMLElement | null;
          const item = row && rows.includes(row) ? findItem(row) : undefined;
          if (row && item) activate(row, item);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        {
          const row = document.activeElement as HTMLElement | null;
          const item = row && rows.includes(row) ? findItem(row) : undefined;
          if (row && item) {
            const children = item.subMenu?.filter((child): child is MenuItemDef => typeof child !== 'string') ?? [];
            if (children.length > 0) activate(row, item);
          }
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (openSubmenu) {
          // Close the deeper level first and keep focus in this one.
          closeSubmenu();
          const active = document.activeElement;
          if (active instanceof HTMLElement && list.contains(active)) {
            setActiveRow(active);
          }
        } else {
          // No deeper level: hand back to the parent menu (submenu levels
          // have closeLevel; the root menu does not).
          options.closeLevel?.();
        }
        break;
      case 'Escape':
        event.preventDefault();
        options.closeAll();
        break;
      case 'Tab':
        options.closeAll();
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          typeahead = (typeahead + event.key).toLowerCase();
          if (typeaheadTimer !== undefined) window.clearTimeout(typeaheadTimer);
          typeaheadTimer = window.setTimeout(() => { typeahead = ''; }, TYPEAHEAD_RESET_MS);
          const match = rows.find((row) => {
            const item = findItem(row);
            return item?.name.toLowerCase().startsWith(typeahead);
          });
          match?.focus();
        }
        break;
    }
  });

  const findItem = (row: HTMLElement): MenuItemDef | undefined => {
    const nameCell = row.querySelector<HTMLElement>('.lgr-menu-item-name');
    return resolved.find((item) => item.name === nameCell?.textContent);
  };

  return {
    element: root,
    focusFirst(): void {
      enabledRows(list)[0]?.focus();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      if (openTimer !== undefined) window.clearTimeout(openTimer);
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
      if (typeaheadTimer !== undefined) window.clearTimeout(typeaheadTimer);
      closeSubmenu();
      for (const instance of customInstances) {
        instance.destroy?.();
      }
      customInstances.clear();
    },
  };
}

/**
 * Instantiate a custom menu item component through the grid's component
 * factory (JS classes or framework components). Best-effort: returns
 * undefined when the factory is absent or the component does not resolve.
 */
export function instantiateMenuItemComponent(
  userCompFactory: unknown,
  component: unknown,
  initParams: object,
): MenuItemInstance | undefined {
  const factory = userCompFactory as {
    getCompDetailsFromGridOptions?: (
      type: object,
      name: string,
      params: object,
      mandatory: boolean,
    ) => { newAgStackInstance?: () => MenuItemInstance | undefined } | undefined;
  };
  try {
    const details = factory.getCompDetailsFromGridOptions?.(
      { name: 'menuItem', mandatoryMethods: ['agInit'], optionalMethods: ['refresh', 'destroy'] },
      'agCustomMenuItem',
      { ...initParams, menuItem: component },
      true,
    );
    return details?.newAgStackInstance?.();
  } catch {
    return undefined;
  }
}

function renderIcon(icon: MenuItemDef['icon']): string {
  if (typeof icon === 'string') {
    return iconSvg(icon as never) ?? (icon.includes('<') ? icon : '');
  }
  if (icon instanceof HTMLElement) {
    return icon.outerHTML;
  }
  return '';
}

/** Re-exported from core so the menu package keeps a single public entry. */
export { inheritThemeTokensImpl as inheritThemeTokens };

