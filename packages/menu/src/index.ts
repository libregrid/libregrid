/**
 * @libregrid/menu — context menu, column menu and menu-item registry.
 *
 * Barrel: flat re-exports only. No logic, no side effects, no registration.
 */
export { MenuItemRegistry } from './menuItemRegistry';
export type { MenuItemContribution, MenuItemFactory, MenuActionParams } from './menuItemRegistry';
export { MenuItemMapper } from './menuItemMapper';
export { MenuUtils } from './menuUtils';
export { ContextMenuService } from './contextMenuSvc';
export { ColumnMenuFactory } from './colMenuFactory';
export { ContextMenuModule } from './contextMenuModule';
export { ColumnMenuModule } from './columnMenuModule';
export { DEFAULT_CONTEXT_MENU_ITEMS, DEFAULT_COLUMN_MENU_ITEMS } from './defaultItems';
export { registerMenuItem, registerMenuItems } from './registryApi';
export { registerMenuRenderer } from './menuRenderer';
export type { MenuKind, MenuRenderer, MenuRenderRequest, MenuRenderResult } from './menuRenderer';
export { VERSION } from './version';
