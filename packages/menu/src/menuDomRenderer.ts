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
const SUBMENU_CLOSE_DELAY_MS = 250;
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

  const list = document.createElement('div');
  list.className = 'lgr-menu-list';
  root.appendChild(list);

  let openSubmenu: { element: HTMLElement; parentRow: HTMLElement } | null = null;
  let openTimer: number | undefined;
  let closeTimer: number | undefined;
  let typeahead = '';
  let typeaheadTimer: number | undefined;
  let destroyed = false;
  const customInstances = new Set<MenuItemInstance>();
  const rowCustomInstances = new WeakMap<HTMLElement, MenuItemInstance>();

  const closeSubmenu = (): void => {
    if (!openSubmenu) return;
    const { element, parentRow } = openSubmenu;
    element.remove();
    openSubmenu = null;
    parentRow.setAttribute('aria-expanded', 'false');
    parentRow.classList.remove('lgr-menu-item-submenu-open');
    rowCustomInstances.get(parentRow)?.setExpanded?.(false);
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
    document.body.appendChild(submenuEl);
    openSubmenu = { element: submenuEl, parentRow: row };
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
    const rect = row.getBoundingClientRect();
    const menuWidth = submenuEl.offsetWidth;
    const menuHeight = submenuEl.offsetHeight;
    let left = rect.right - 4;
    if (left + menuWidth > window.innerWidth - 4) {
      left = Math.max(4, rect.left - menuWidth + 4);
    }
    let top = rect.top;
    if (top + menuHeight > window.innerHeight - 4) {
      top = Math.max(4, window.innerHeight - menuHeight - 4);
    }
    submenuEl.style.left = `${left}px`;
    submenuEl.style.top = `${top}px`;
  };

  const enabledRows = (scope: HTMLElement): HTMLElement[] =>
    Array.from(scope.querySelectorAll<HTMLElement>('.lgr-menu-item:not(.lgr-menu-item-disabled)'));

  const activate = (row: HTMLElement, item: MenuItemDef): void => {
    const children = item.subMenu?.filter((child): child is MenuItemDef => typeof child !== 'string') ?? [];
    if (children.length > 0) {
      openSubmenuFor(row, item);
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
      const part = document.createElement('div');
      part.className = 'lgr-menu-separator-part';
      sep.appendChild(part);
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

    if (item.shortcut) {
      const shortcutCell = document.createElement('span');
      shortcutCell.className = 'lgr-menu-item-shortcut';
      shortcutCell.textContent = item.shortcut;
      row.appendChild(shortcutCell);
    }

    if (hasSubmenu) {
      const arrowCell = document.createElement('span');
      arrowCell.className = 'lgr-menu-item-arrow';
      arrowCell.innerHTML = iconSvg('subMenuOpen') ?? '›';
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
        openTimer = window.setTimeout(() => openSubmenuFor(row, item), SUBMENU_OPEN_DELAY_MS);
      }
    });
    row.addEventListener('mouseleave', () => {
      if (openTimer !== undefined) window.clearTimeout(openTimer);
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
          enabledRows(openSubmenu?.element ?? root)[0]?.focus();
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

    if (item.shortcut) {
      const shortcutCell = document.createElement('span');
      shortcutCell.className = 'lgr-menu-item-shortcut';
      shortcutCell.textContent = item.shortcut;
      row.appendChild(shortcutCell);
    }

    if (hasSubmenu) {
      const arrowCell = document.createElement('span');
      arrowCell.className = 'lgr-menu-item-arrow';
      arrowCell.innerHTML = iconSvg('subMenuOpen') ?? '›';
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
          openTimer = window.setTimeout(() => openSubmenuFor(row, item), SUBMENU_OPEN_DELAY_MS);
        }
      });
      row.addEventListener('mouseleave', () => {
        if (openTimer !== undefined) window.clearTimeout(openTimer);
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
    for (const other of enabledRows(root)) {
      other.classList.toggle('lgr-menu-item-active', other === row);
    }
  };

  root.addEventListener('focusin', () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.classList.contains('lgr-menu-item')) {
      setActiveRow(active);
    }
  });

  root.addEventListener('keydown', (event) => {
    const scope = currentLevel(root);
    const rows = enabledRows(scope);
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
            if (children.length > 0) openSubmenuFor(row, item);
          }
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (openSubmenu) {
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

  const currentLevel = (menuEl: HTMLElement): HTMLElement => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      const activeList = active.closest<HTMLElement>('.lgr-menu-list');
      if (activeList && menuEl.contains(activeList) === false && openSubmenu?.element.contains(activeList)) {
        return openSubmenu.element;
      }
    }
    return menuEl;
  };

  return {
    element: root,
    focusFirst(): void {
      enabledRows(root)[0]?.focus();
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

