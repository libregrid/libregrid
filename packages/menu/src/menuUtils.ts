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
