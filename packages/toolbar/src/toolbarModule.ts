import type { _ToolbarGridApi, BeanCollection, _ModuleWithApi } from 'ag-grid-community';
import { EnterpriseCoreModule, getUntypedBean, type IToolbarSvcShape } from '@libregrid/core';
import { ToolbarComponent } from './toolbarComponent';
import { ToolbarService } from './toolbarService';
import { toolbarCss } from './toolbarCss';
import { VERSION } from './version';

function getToolbarItemInstance(beans: BeanCollection, key: string) {
  return getUntypedBean<IToolbarSvcShape>(beans, 'toolbarSvc')?.getToolbarItemInstance(key);
}

/**
 * Quick Access Toolbar feature boundary.
 *
 * The shell renders via the AG-TOOLBAR selector seam; built-in items come
 * from this package (quick filter, find) or from feature packages that call
 * registerToolbarItem (row group panel, pivot panel, menu).
 *
 * @feature Toolbar
 */
export const ToolbarModule: _ModuleWithApi<_ToolbarGridApi> = {
  moduleName: 'Toolbar',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  // 'toolbarSvc' is not in Community's closed BeanName union; the DI still
  // keys beans by their beanName string at runtime (api-seams.md §7).
  beans: [ToolbarService as never],
  selectors: [ToolbarComponent.getSelector()],
  css: [toolbarCss],
  apiFunctions: {
    getToolbarItemInstance,
  },
};
