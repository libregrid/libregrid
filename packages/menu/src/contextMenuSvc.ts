import { BeanStub, type NamedBean, type IContextMenuService, type MenuItemDef, type Column, type IRowNode, type RowCtrl, type CellCtrl, type PopupService, type GridApi } from 'ag-grid-community';
import type { MenuItemMapper } from './menuItemMapper';
import type { MenuActionParams } from './menuItemRegistry';
import { DEFAULT_CONTEXT_MENU_ITEMS } from './defaultItems';
import { getMenuRenderer } from './menuRenderer';

/**
 * Context menu service — implements IContextMenuService.
 *
 * Community does not provide a context menu. This bean registers under the
 * reserved name `contextMenuSvc` and is called by CellCtrl on right-click.
 */
export class ContextMenuService extends BeanStub implements NamedBean, IContextMenuService {
  beanName = 'contextMenuSvc' as const;

  private mapper!: MenuItemMapper;
  private activeMenuHideFunc: (() => void) | null = null;
  private activeMenuTrigger: HTMLElement | null = null;

  public postConstruct(): void {
    this.mapper = this.beans.menuItemMapper as unknown as MenuItemMapper;
  }

  public handleContextMenuMouseEvent(
    mouseEvent: MouseEvent | undefined,
    touchEvent: TouchEvent | undefined,
    rowCtrl: RowCtrl | null,
    cellCtrl: CellCtrl | null,
  ): void {
    if (this.gos.get('suppressContextMenu')) {
      return;
    }

    const event = mouseEvent ?? touchEvent;
    if (!event) return;

    if (mouseEvent) {
      mouseEvent.preventDefault();
    }

    if (mouseEvent && !this.gos.get('allowContextMenuWithControlKey') && mouseEvent.ctrlKey) {
      return;
    }

    const column = cellCtrl ? (cellCtrl as unknown as { column?: Column }).column ?? null : null;
    const node = rowCtrl ? (rowCtrl as unknown as { rowNode?: IRowNode }).rowNode ?? null : null;
    const value = cellCtrl ? (cellCtrl as unknown as { value?: unknown }).value ?? null : null;

    const x = 'clientX' in event ? event.clientX : 0;
    const y = 'clientY' in event ? event.clientY : 0;

    this.showContextMenuAtPosition(
      x,
      y,
      column,
      node,
      value,
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>('[role="gridcell"]') ?? event.target
        : cellCtrl ? (cellCtrl as unknown as { getGui?: () => HTMLElement }).getGui?.() : undefined,
    );
  }

  public showContextMenu(params: {
    rowNode?: IRowNode | null;
    column?: Column | null;
    value: unknown;
    source: 'api' | 'ui';
    anchorToElement?: HTMLElement;
    mouseEvent?: MouseEvent;
    touchEvent?: TouchEvent;
  }): void {
    const column = params.column ?? null;
    const node = params.rowNode ?? null;
    const value = params.value;

    if (params.mouseEvent) {
      this.showContextMenuAtPosition(
        params.mouseEvent.clientX,
        params.mouseEvent.clientY,
        column,
        node,
        value,
      );
    } else {
      const position = this.getContextMenuPosition(node, column);
      this.showContextMenuAtPosition(position.x, position.y, column, node, value, params.anchorToElement);
    }
  }

  public hideActiveMenu(): void {
    if (this.activeMenuHideFunc) {
      this.activeMenuHideFunc();
      this.activeMenuHideFunc = null;
    }
  }

  public getContextMenuPosition(
    rowNode?: IRowNode | null,
    column?: Column | null,
  ): { x: number; y: number } {
    void rowNode;
    void column;
    const api = this.beans.gridApi as GridApi | undefined;
    if (api) {
      const gridEl = (api as unknown as { gridBodyCtrl?: { eGridBody?: HTMLElement } }).gridBodyCtrl?.eGridBody;
      if (gridEl) {
        const rect = gridEl.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    }
    return { x: 0, y: 0 };
  }

  private showContextMenuAtPosition(
    x: number,
    y: number,
    column: Column | null,
    node: IRowNode | null,
    value: unknown,
    trigger?: HTMLElement,
  ): void {
    const api = this.beans.gridApi as GridApi | undefined;
    if (!api) return;

    const params: MenuActionParams = { column, node, value, api };
    const items = this.buildMenuItems(params);
    if (items.length === 0) return;

    const filtered = this.filterItems(items);
    if (filtered.length === 0) return;

    this.renderMenu(filtered, x, y, params, trigger);
  }

  private buildMenuItems(params: MenuActionParams): (MenuItemDef | 'separator')[] {
    const defaultNames = [...DEFAULT_CONTEXT_MENU_ITEMS];

    const userCallback = this.gos.get('getContextMenuItems');
    if (userCallback && typeof userCallback === 'function') {
      const userItems = userCallback({
        ...params,
        context: null,
        defaultItems: defaultNames as never,
        event: new MouseEvent('contextmenu'),
      } as never);
      if (Array.isArray(userItems)) {
        return this.mapper.mapMixed(userItems as (string | MenuItemDef)[], params);
      }
    }

    const gridItems = (this.gos as unknown as { get: (key: string) => unknown }).get('contextMenuItems');
    if (Array.isArray(gridItems)) {
      return this.mapper.mapMixed(gridItems as (string | MenuItemDef)[], params);
    }

    if (params.column) {
      const colDef = (params.column as unknown as { getColDef?: () => { contextMenuItems?: unknown } }).getColDef?.();
      const colItems = colDef?.contextMenuItems;
      if (Array.isArray(colItems)) {
        return this.mapper.mapMixed(colItems as (string | MenuItemDef)[], params);
      }
    }

    return this.mapper.mapItems(defaultNames, params);
  }

  private filterItems(items: (MenuItemDef | 'separator')[]): MenuItemDef[] {
    const filtered: MenuItemDef[] = [];
    let lastWasSeparator = true;

    for (const item of items) {
      if (item === 'separator') {
        if (!lastWasSeparator && filtered.length > 0) {
          filtered.push({ name: '__separator__' });
          lastWasSeparator = true;
        }
      } else {
        filtered.push(item);
        lastWasSeparator = false;
      }
    }

    while (filtered.length > 0 && filtered[filtered.length - 1]?.name === '__separator__') {
      filtered.pop();
    }

    return filtered;
  }

  private renderMenu(
    items: MenuItemDef[],
    x: number,
    y: number,
    params: MenuActionParams,
    trigger?: HTMLElement,
  ): void {
    const popupSvc = this.beans.popupSvc as PopupService | undefined;
    if (!popupSvc) return;

    const rendered = getMenuRenderer()?.render({
      kind: 'context',
      items,
      params,
      onItemSelected: () => this.hideActiveMenu(),
      fallback: () => this.createMenuElement(items, params),
    });
    const menuEl = rendered?.element ?? this.createMenuElement(items, params);
    this.activeMenuTrigger = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);

    const popup = popupSvc.addPopup({
      eChild: menuEl,
      closeOnEsc: true,
      modal: true,
      afterGuiAttached: () => {
        menuEl.querySelector<HTMLElement>('.lgr-menu-item:not(.lgr-menu-item-disabled)')?.focus();
      },
      closedCallback: () => {
        this.activeMenuHideFunc = null;
        this.activeMenuTrigger?.focus({ preventScroll: true });
        this.activeMenuTrigger = null;
        rendered?.destroy?.();
      },
      positionCallback: () => {
        popupSvc.positionPopupUnderMouseEvent({
          type: 'contextMenu',
          mouseEvent: new MouseEvent('contextmenu', { clientX: x, clientY: y }),
          ePopup: menuEl,
        });
      },
      ariaLabel: 'Context Menu',
    });

    this.activeMenuHideFunc = popup.hideFunc;
  }

  private createMenuElement(items: MenuItemDef[], params: MenuActionParams): HTMLElement {
    const menuEl = document.createElement('div');
    menuEl.className = 'lgr-menu lgr-context-menu';
    menuEl.setAttribute('role', 'menu');
    menuEl.tabIndex = -1;

    for (const item of items) {
      if (item.name === '__separator__') {
        const sep = document.createElement('div');
        sep.className = 'lgr-menu-separator';
        sep.setAttribute('role', 'separator');
        menuEl.appendChild(sep);
        continue;
      }

      const itemEl = document.createElement('div');
      itemEl.className = 'lgr-menu-item';
      itemEl.setAttribute('role', 'menuitem');
      itemEl.tabIndex = 0;

      if (item.icon) {
        const iconEl = document.createElement('span');
        iconEl.className = 'lgr-menu-item-icon';
        if (typeof item.icon === 'string') {
          iconEl.innerHTML = item.icon;
        } else {
          iconEl.appendChild(item.icon);
        }
        itemEl.appendChild(iconEl);
      }

      const nameEl = document.createElement('span');
      nameEl.className = 'lgr-menu-item-name';
      nameEl.textContent = item.name;
      itemEl.appendChild(nameEl);

      if (item.shortcut) {
        const shortcutEl = document.createElement('span');
        shortcutEl.className = 'lgr-menu-item-shortcut';
        shortcutEl.textContent = item.shortcut;
        itemEl.appendChild(shortcutEl);
      }

      if (item.checked) {
        itemEl.classList.add('lgr-menu-item-checked');
      }

      if (item.disabled) {
        itemEl.classList.add('lgr-menu-item-disabled');
        itemEl.setAttribute('aria-disabled', 'true');
      }

      if (item.tooltip) {
        itemEl.title = item.tooltip;
      }

      if (item.cssClasses) {
        itemEl.classList.add(...item.cssClasses);
      }

      if (item.action && !item.disabled) {
        itemEl.addEventListener('click', (e) => {
          e.stopPropagation();
          item.action!(params as never);
          if (!item.suppressCloseOnSelect) {
            this.hideActiveMenu();
          }
        });
      }

      if (item.subMenu && item.subMenu.length > 0) {
        const arrowEl = document.createElement('span');
        arrowEl.className = 'lgr-menu-item-arrow';
        arrowEl.textContent = '▶';
        itemEl.appendChild(arrowEl);
        itemEl.setAttribute('aria-haspopup', 'true');
      }

      menuEl.appendChild(itemEl);
    }

    menuEl.addEventListener('keydown', (e) => {
      this.handleMenuKeydown(e, menuEl);
    });

    return menuEl;
  }

  private handleMenuKeydown(e: KeyboardEvent, menuEl: HTMLElement): void {
    const items = Array.from(
      menuEl.querySelectorAll('.lgr-menu-item:not(.lgr-menu-item-disabled)'),
    ) as HTMLElement[];
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[(currentIndex + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        (document.activeElement as HTMLElement)?.click();
        break;
      case 'Escape':
        e.preventDefault();
        this.hideActiveMenu();
        break;
    }
  }

  public override destroy(): void {
    this.hideActiveMenu();
    super.destroy();
  }
}
