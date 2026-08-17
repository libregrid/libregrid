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
export { GRID_DENSITIES, spacingForDensity } from './themeParams';
export type { GridDensityId } from './themeParams';
export { installMaterialSideBarRenderer } from './materialSideBarRenderer';
export { MaterialStatusBarComponent } from './materialStatusBar';
export {
  createMaterialColumnsToolPanelDragDropAdapter,
  installMaterialColumnsToolPanelDragDrop,
} from './materialColumnsToolPanelDragDrop';
export { VERSION } from './version';
export { MaterialRichSelectCellEditor, installMaterialRichSelectCellEditor } from './materialRichSelect';
