import type { _ModuleWithApi, _SideBarGridApi, BeanCollection, SideBarDef, IToolPanel } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { SideBarService } from './sideBarSvc';
import { SideBarComponent } from './sideBarComponent';
import { sideBarCss } from './sideBarCss';
import { VERSION } from './version';

function getSideBar(beans: BeanCollection): SideBarDef | undefined {
  return (beans.sideBar as SideBarService | undefined)?.getDef();
}

function setSideBarVisible(beans: BeanCollection, visible: boolean): void {
  (beans.sideBar as SideBarService | undefined)?.setDisplayed(visible);
}

function isSideBarVisible(beans: BeanCollection): boolean {
  return (beans.sideBar as SideBarService | undefined)?.isDisplayed() ?? false;
}

function setSideBarPosition(beans: BeanCollection, position: 'left' | 'right'): void {
  (beans.sideBar as SideBarService | undefined)?.setSideBarPosition(position);
}

function openToolPanel(beans: BeanCollection, key: string, parent?: HTMLElement | null): void {
  (beans.sideBar as SideBarService | undefined)?.openToolPanel(key, 'api', parent);
}

function closeToolPanel(beans: BeanCollection): void {
  (beans.sideBar as SideBarService | undefined)?.close('api');
}

function getOpenedToolPanel(beans: BeanCollection): string | null {
  return (beans.sideBar as SideBarService | undefined)?.openedItem() ?? null;
}

function isToolPanelShowing(beans: BeanCollection): boolean {
  return (beans.sideBar as SideBarService | undefined)?.isToolPanelShowing() ?? false;
}

function refreshToolPanel(beans: BeanCollection): void {
  (beans.sideBar as SideBarService | undefined)?.refresh();
}

function getToolPanelInstance(beans: BeanCollection, key: string): IToolPanel | undefined {
  return (beans.sideBar as SideBarService | undefined)?.getToolPanelInstance(key);
}

/**
 * Side bar module — provides the side bar with tool panels.
 *
 * @feature Side Bar
 */
export const SideBarModule: _ModuleWithApi<_SideBarGridApi<unknown>> = {
  moduleName: 'SideBar',
  version: VERSION,
  beans: [SideBarService],
  selectors: [SideBarComponent.getSelector()],
  dependsOn: [EnterpriseCoreModule],
  apiFunctions: {
    getSideBar,
    setSideBarVisible,
    isSideBarVisible,
    setSideBarPosition,
    openToolPanel,
    closeToolPanel,
    getOpenedToolPanel,
    isToolPanelShowing,
    refreshToolPanel,
    getToolPanelInstance,
  },
  css: [sideBarCss],
};
