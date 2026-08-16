import type { _ModuleWithoutApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { ColumnMenuFactory } from './colMenuFactory';
import { MenuItemMapper } from './menuItemMapper';
import { menuCss } from './menuCss';
import { VERSION } from './version';

/**
 * Column menu module — provides the column header menu.
 *
 * Standalone-capable: it registers the shared menu CSS and the
 * MenuItemMapper bean it depends on, so it works without
 * ContextMenuModule (docs/design/ux-2-menus.md gap 9).
 *
 * @feature Column Menu
 */
export const ColumnMenuModule: _ModuleWithoutApi = {
  moduleName: 'ColumnMenu',
  version: VERSION,
  beans: [MenuItemMapper, ColumnMenuFactory],
  dependsOn: [EnterpriseCoreModule],
  css: [menuCss],
};
