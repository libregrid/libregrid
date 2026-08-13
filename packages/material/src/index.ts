/**
 * @libregrid/material — Angular Material theme bridge and components.
 *
 * Barrel: flat re-exports only. No logic, no side effects, no registration.
 */
export {
  LibreGridThemeService,
  buildGridTheme,
  provideLibreGridMaterialTheme,
} from './themeBridge';
export type { ThemeMode } from './themeBridge';
export { installMaterialSideBarRenderer } from './materialSideBarRenderer';
export {
  createMaterialColumnsToolPanelDragDropAdapter,
  installMaterialColumnsToolPanelDragDrop,
} from './materialColumnsToolPanelDragDrop';
export { VERSION } from './version';
