import {
  BeanStub,
  type NamedBean,
  type MenuItemDef,
  type Column,
  type GridApi,
  type PopupService,
  type IMenuFactory,
  type ContainerType,
} from 'ag-grid-community';
import type { MenuItemMapper } from './menuItemMapper';
import type { MenuActionParams } from './menuItemRegistry';
import { DEFAULT_COLUMN_MENU_ITEMS } from './defaultItems';
import { getMenuRenderer } from './menuRenderer';

/**
 * Column menu factory — builds the column menu content.
 *
 * Registered as `colMenuFactory` (a reserved UntypedBeanName). The grid's
 * MenuService delegates to this bean when showing the column menu.
 */
export class ColumnMenuFactory extends BeanStub implements NamedBean, IMenuFactory {
  beanName = 'enterpriseMenuFactory' as const;

  private mapper!: MenuItemMapper;
  private activeMenuHideFunc: (() => void) | null = null;

  public postConstruct(): void {
    this.mapper = this.beans.menuItemMapper as unknown as MenuItemMapper;
  }

  /**
   * Build the column menu items for a given column.
   */
  public buildColumnMenuItems(
    column: Column | null,
    source: 'columnMenu' | 'columnsToolPanel' | 'columnChooser' = 'columnMenu',
  ): MenuItemDef[] {
    const api = this.beans.gridApi as GridApi | undefined;
    if (!api) return [];

    const params: MenuActionParams = { column, node: null, value: null, api };

    const userCallback = this.gos.get('getColumnMenuItems');
    if (userCallback && typeof userCallback === 'function') {
      const userItems = userCallback({
        ...params,
        column,
        columnGroup: null,
        defaultItems: DEFAULT_COLUMN_MENU_ITEMS as never,
        source,
      } as never);
      if (Array.isArray(userItems)) {
        const mapped = this.mapper.mapMixed(userItems as (string | MenuItemDef)[], params);
        return mapped.filter((item): item is MenuItemDef => item !== 'separator');
      }
    }

    const legacyCallback = this.gos.get('getMainMenuItems');
    if (legacyCallback && typeof legacyCallback === 'function') {
      const legacyItems = legacyCallback({
        ...params,
        column,
        columnGroup: null,
        defaultItems: DEFAULT_COLUMN_MENU_ITEMS as never,
      } as never);
      if (Array.isArray(legacyItems)) {
        const mapped = this.mapper.mapMixed(legacyItems as (string | MenuItemDef)[], params);
        return mapped.filter((item): item is MenuItemDef => item !== 'separator');
      }
    }

    if (column) {
      const colDef = (column as unknown as { getColDef?: () => { columnMenuItems?: unknown } }).getColDef?.();
      const colItems = colDef?.columnMenuItems;
      if (Array.isArray(colItems)) {
        const mapped = this.mapper.mapMixed(colItems as (string | MenuItemDef)[], params);
        return mapped.filter((item): item is MenuItemDef => item !== 'separator');
      }
    }

    const items = this.mapper.mapItems(DEFAULT_COLUMN_MENU_ITEMS, params);
    return items.filter((item): item is MenuItemDef => item !== 'separator');
  }

  public isMenuEnabled(column: Column): boolean {
    return !column.getColDef().suppressHeaderMenuButton;
  }

  public showMenuAfterButtonClick(
    column: unknown,
    eventSource: HTMLElement,
    _containerType: ContainerType,
    onClosedCallback?: (event?: Event) => void,
    options?: { filtersOnly?: boolean; suppressCloseOnEventSource?: boolean },
  ): boolean {
    if (!isColumn(column)) return false;
    const colDef = column.getColDef();
    if (options?.filtersOnly ? colDef.suppressHeaderFilterButton : colDef.suppressHeaderMenuButton) return false;
    return this.showMenu(column, onClosedCallback, (popupSvc, menuEl) => {
      popupSvc.positionPopupByComponent({
        type: 'columnMenu',
        eventSource,
        ePopup: menuEl,
        position: 'under',
        keepWithinBounds: true,
      });
    }, eventSource);
  }

  public showMenuAfterMouseEvent(
    column: unknown,
    mouseEvent: MouseEvent | Touch,
    _containerType: ContainerType,
    onClosedCallback?: () => void,
    _filtersOnly?: boolean,
  ): void {
    if (!isColumn(column)) return;
    if (column.getColDef().suppressHeaderMenuButton) return;
    this.showMenu(column, onClosedCallback, (popupSvc, menuEl) => {
      popupSvc.positionPopupUnderMouseEvent({
        type: 'columnMenu',
        mouseEvent,
        ePopup: menuEl,
      });
    }, mouseEvent.target instanceof HTMLElement ? mouseEvent.target : undefined);
  }

  public showMenuAfterContextMenuEvent(
    column: unknown,
    mouseEvent?: MouseEvent | null,
    touchEvent?: TouchEvent | null,
  ): void {
    const event = mouseEvent ?? touchEvent?.touches[0];
    if (!isColumn(column) || !event) return;
    if (column.getColDef().suppressHeaderContextMenu) return;
    this.showMenuAfterMouseEvent(column, event, 'columnMenu');
  }

  public hideActiveMenu(): void {
    this.activeMenuHideFunc?.();
    this.activeMenuHideFunc = null;
  }

  public override destroy(): void {
    this.hideActiveMenu();
    super.destroy();
  }

  private showMenu(
    column: Column,
    onClosedCallback: ((event?: Event) => void) | undefined,
    position: (popupSvc: PopupService, menuEl: HTMLElement) => void,
    anchorToElement?: HTMLElement,
  ): boolean {
    const popupSvc = this.beans.popupSvc as PopupService | undefined;
    if (!popupSvc) return false;

    this.hideActiveMenu();
    const params: MenuActionParams = { column, node: null, value: null, api: this.beans.gridApi as GridApi };
    const items = this.buildColumnMenuItems(column);
    const rendered = getMenuRenderer()?.render({
      kind: 'column',
      items,
      params,
      onItemSelected: () => this.hideActiveMenu(),
      fallback: () => this.createMenuElement(items, params),
    });
    const menuEl = rendered?.element ?? this.createMenuElement(items, params);
    const popup = popupSvc.addPopup({
      eChild: menuEl,
      modal: true,
      closeOnEsc: true,
      ariaLabel: 'Column Menu',
      ...(anchorToElement ? { anchorToElement, eventSourceToIgnore: anchorToElement } : {}),
      afterGuiAttached: () => {
        menuEl.querySelector<HTMLElement>('.lgr-menu-item:not(.lgr-menu-item-disabled)')?.focus();
      },
      closedCallback: (event) => {
        this.activeMenuHideFunc = null;
        rendered?.destroy?.();
        this.dispatchVisibleChanged(column, false);
        onClosedCallback?.(event);
      },
      positionCallback: () => position(popupSvc, menuEl),
    });
    this.activeMenuHideFunc = popup.hideFunc;
    this.dispatchVisibleChanged(column, true);
    return true;
  }

  private dispatchVisibleChanged(column: Column, visible: boolean): void {
    (this.beans.eventSvc as unknown as { dispatchEvent: (event: object) => void } | undefined)?.dispatchEvent({
      type: 'columnMenuVisibleChanged',
      visible,
      switchingTab: false,
      key: 'columnMenu',
      column,
      columnGroup: null,
    });
  }

  private createMenuElement(items: MenuItemDef[], params: MenuActionParams): HTMLElement {
    const menuEl = document.createElement('div');
    menuEl.className = 'lgr-menu lgr-column-menu';
    menuEl.setAttribute('role', 'menu');
    menuEl.tabIndex = -1;

    for (const item of items) {
      const itemEl = document.createElement('div');
      itemEl.className = 'lgr-menu-item';
      itemEl.setAttribute('role', 'menuitem');
      itemEl.tabIndex = 0;
      itemEl.textContent = item.name;
      if (item.disabled) {
        itemEl.classList.add('lgr-menu-item-disabled');
        itemEl.setAttribute('aria-disabled', 'true');
      } else if (item.action) {
        itemEl.addEventListener('click', () => {
          item.action!(params as never);
          this.hideActiveMenu();
        });
      }
      menuEl.appendChild(itemEl);
    }

    menuEl.addEventListener('keydown', (event) => {
      const menuItems = Array.from(menuEl.querySelectorAll<HTMLElement>('.lgr-menu-item:not(.lgr-menu-item-disabled)'));
      const index = menuItems.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
        menuItems[(next + menuItems.length) % menuItems.length]?.focus();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        (document.activeElement as HTMLElement)?.click();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.hideActiveMenu();
      }
    });

    return menuEl;
  }
}

function isColumn(value: unknown): value is Column {
  return !!value && typeof (value as Column).getColDef === 'function';
}
