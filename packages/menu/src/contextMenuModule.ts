import type { _ModuleWithApi, _ContextMenuGridApi, BeanCollection, IContextMenuParams } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { MenuItemMapper } from './menuItemMapper';
import { MenuUtils } from './menuUtils';
import { ContextMenuService } from './contextMenuSvc';
import { menuCss } from './menuCss';
import { VERSION } from './version';

function showContextMenu(beans: BeanCollection, params?: IContextMenuParams): void {
  const svc = beans.contextMenuSvc as ContextMenuService | undefined;
  if (svc) {
    svc.showContextMenu({
      rowNode: params?.rowNode ?? null,
      column: params?.column ?? null,
      value: params?.value ?? null,
      source: 'api',
    });
  }
}

/**
 * Context menu module — provides the right-click context menu.
 *
 * @feature Context Menu
 */
export const ContextMenuModule: _ModuleWithApi<_ContextMenuGridApi> = {
  moduleName: 'ContextMenu',
  version: VERSION,
  beans: [MenuItemMapper, MenuUtils, ContextMenuService],
  dependsOn: [EnterpriseCoreModule],
  apiFunctions: { showContextMenu },
  css: [menuCss],
};
