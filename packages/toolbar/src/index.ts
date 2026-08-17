/**
 * @libregrid/toolbar — Quick Access Toolbar for AG Grid Community.
 *
 * Barrel: flat re-exports only. No logic, no side effects, no registration.
 */
export { ToolbarModule } from './toolbarModule';
export { registerToolbarItem } from './toolbarRegistry';
export type { ToolbarItemFactory, ToolbarItemFactoryResult, ToolbarItemParams } from './toolbarRegistry';
export { VERSION } from './version';
