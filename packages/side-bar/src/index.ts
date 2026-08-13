/**
 * @libregrid/side-bar — side bar with tool panels.
 *
 * Barrel: flat re-exports only. No logic, no side effects, no registration.
 */
export { SideBarService, registerToolPanel } from './sideBarSvc';
export { SideBarModule } from './sideBarModule';
export { VERSION } from './version';
export { registerSideBarRenderer } from './sideBarRenderer';
export type { SideBarRenderer, SideBarRenderRequest } from './sideBarRenderer';
