import type { _ColumnChooserGridApi, _ModuleWithApi, BeanCollection, ColumnChooserParams } from 'ag-grid-community';
import { EnterpriseCoreModule, getUntypedBean, type IColChooserFactoryShape } from '@libregrid/core';
import { SideBarModule } from '@libregrid/side-bar';
import { ColumnChooserFactory } from './columnChooserFactory';
import { ColumnsToolPanelFactory } from './columnsToolPanelFactory';
import { ColumnsToolPanel } from './columnsToolPanel';
import { columnsToolPanelCss } from './columnsToolPanelCss';
import { VERSION } from './version';

function showColumnChooser(beans: BeanCollection, params?: ColumnChooserParams): void {
  getUntypedBean<IColChooserFactoryShape>(beans, 'colChooserFactory')?.showColumnChooser(params);
}

function hideColumnChooser(beans: BeanCollection): void {
  getUntypedBean<IColChooserFactoryShape>(beans, 'colChooserFactory')?.hideColumnChooser();
}

/**
 * Registers the Columns tool panel and shared column chooser.
 *
 * @feature Columns Tool Panel
 */
export const ColumnsToolPanelModule: _ModuleWithApi<_ColumnChooserGridApi> = {
  moduleName: 'ColumnsToolPanel',
  version: VERSION,
  beans: [ColumnsToolPanelFactory, ColumnChooserFactory],
  dependsOn: [EnterpriseCoreModule, SideBarModule],
  userComponents: { agColumnsToolPanel: ColumnsToolPanel },
  css: [columnsToolPanelCss],
  apiFunctions: { showColumnChooser, hideColumnChooser },
  enterprise: true,
};
