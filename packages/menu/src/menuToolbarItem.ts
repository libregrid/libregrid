import type { MenuItemDef, PopupService } from 'ag-grid-community';
import { iconSvg } from '@libregrid/core';
import { createMenuDom } from './menuDomRenderer';
import { _readGlobalStore } from './menuItemRegistry';
import type { MenuActionParams } from './menuItemRegistry';

/**
 * Toolbar menu item contribution — a dropdown button that opens a menu of
 * configured items (MenuItemDef objects or built-in item names).
 *
 * Registered against the toolbar package's Symbol.for store directly, so this
 * package does not need a dependency on @libregrid/toolbar.
 */

const REGISTRY_KEY = Symbol.for('libregrid.toolbarItems');

interface ToolbarItemParams {
  api: never;
  popupSvc?: unknown;
  label?: string;
  tooltip?: string;
  icon?: unknown;
  toolbarItemParams?: { menuItems?: (MenuItemDef | string)[] };
}

interface ToolbarItemFactoryResult {
  gui: HTMLElement;
  instance?: unknown;
  destroy?: () => void;
}

function register(name: string, factory: (params: ToolbarItemParams) => ToolbarItemFactoryResult): void {
  const scope = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: { factories: Map<string, (params: ToolbarItemParams) => ToolbarItemFactoryResult> };
  };
  const store = (scope[REGISTRY_KEY] ??= { factories: new Map() });
  store.factories.set(name, factory);
}

/**
 * Register the toolbar menu item contribution. Called from
 * ContextMenuModule.onRegister, so bundlers cannot tree-shake the
 * registration away (sideEffects: false packages must not rely on
 * side-effect imports).
 */
export function registerMenuToolbarItem(): void {
  register('agMenuToolbarItem', (params) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'lgr-toolbar-button';
  const tooltip = params.tooltip ?? params.label;
  if (tooltip) {
    button.setAttribute('aria-label', tooltip);
    button.title = tooltip;
  }
  const svg = params.icon ? iconSvg(params.icon as never) : iconSvg('menu');
  if (svg) {
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = svg;
    button.appendChild(icon);
  }
  if (params.label) {
    const text = document.createElement('span');
    text.textContent = params.label;
    button.appendChild(text);
  }

  const popupSvc = params.popupSvc as PopupService | undefined;
  let hideFunc: (() => void) | null = null;

  button.addEventListener('click', () => {
    if (!popupSvc) return;
    const items = resolveItems((params.toolbarItemParams?.menuItems ?? []).filter((item) => item !== 'separator'), params.api);
    const menu = createMenuDom('column', items, { column: null, node: null, value: null, api: params.api }, {
      closeAll: () => hideFunc?.(),
    });
    const popup = popupSvc.addPopup({
      eChild: menu.element,
      modal: true,
      closeOnEsc: true,
      ariaLabel: 'Toolbar Menu',
      afterGuiAttached: () => menu.focusFirst(),
      closedCallback: () => {
        menu.destroy();
        hideFunc = null;
      },
      positionCallback: () =>
        popupSvc.positionPopupByComponent({
          type: 'columnMenu',
          eventSource: button,
          ePopup: menu.element,
          position: 'under',
          keepWithinBounds: true,
        }),
    });
    hideFunc = popup.hideFunc;
  });

  return {
    gui: button,
    instance: button,
    destroy: () => hideFunc?.(),
  };
  });
}

function resolveItems(items: (MenuItemDef | string)[], api: never): MenuItemDef[] {
  const actionParams: MenuActionParams = { column: null, node: null, value: null, api };
  const store = _readGlobalStore();
  return items.flatMap((item): MenuItemDef[] => {
    if (typeof item === 'string') {
      const contribution = store.get(item);
      const resolved = contribution?.factory(actionParams);
      return resolved ? [resolved] : [];
    }
    if (item.subMenu) {
      return [{ ...item, subMenu: resolveItems(item.subMenu.filter((child) => child !== 'separator'), api) }];
    }
    return [item];
  });
}
