import { BeanStub, type NamedBean, type GridApi, type MenuItemDef, type Column, type IRowNode } from 'ag-grid-community';
import type { MenuActionParams } from './menuItemRegistry';

/**
 * Menu utility functions.
 */
export class MenuUtils extends BeanStub implements NamedBean {
  beanName = 'menuUtils' as const;

  public isItemVisible(item: MenuItemDef | null): boolean {
    return item !== null && !item.disabled;
  }

  public buildActionParams(
    column: Column | null,
    node: IRowNode | null,
    value: unknown,
  ): MenuActionParams {
    const api = this.beans.gridApi as GridApi;
    return { column, node, value, api };
  }
}

/** The GridApi surface the popup-parent helper needs. */
interface PopupParentApi {
  getGridOption?(key: 'popupParent'): unknown;
  setGridOption?(key: 'popupParent', value: HTMLElement | null): void;
}

/**
 * Open a menu popup with the popup parent defaulted to the document body.
 *
 * Community's PopupService appends popups to the grid root element and clamps
 * their position inside the grid's rectangle (the root wrapper has
 * overflow:hidden), so a menu opened near the grid edge is cut off at the
 * grid's boundary. LibreGrid menus instead render in a body-level popup by
 * default — clamped to the viewport, so they can extend outside the grid
 * footprint. An app-configured `popupParent` is always honoured.
 *
 * The option is restored immediately: `addPopup` appends the wrapper and runs
 * the position callback synchronously, so the override only needs to live for
 * the duration of `open`.
 */
export function withViewportPopupParent(api: PopupParentApi | undefined, open: () => void): void {
  if (!api || typeof api.getGridOption !== 'function' || typeof api.setGridOption !== 'function') {
    open();
    return;
  }
  if (api.getGridOption('popupParent')) {
    open();
    return;
  }
  api.setGridOption('popupParent', document.body);
  try {
    open();
  } finally {
    api.setGridOption('popupParent', null);
  }
}
