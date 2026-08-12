import type { _ModuleWithApi, _ColumnChooserGridApi, BeanCollection, ColumnChooserParams } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { ColumnMenuFactory } from './colMenuFactory';
import { VERSION } from './version';

function showColumnChooser(_beans: BeanCollection, _params?: ColumnChooserParams): void {
  // TODO: implement column chooser popup
}

function hideColumnChooser(_beans: BeanCollection): void {
  // TODO: implement
}

/**
 * Column menu module — provides the column header menu.
 *
 * @feature Column Menu
 */
export const ColumnMenuModule: _ModuleWithApi<_ColumnChooserGridApi> = {
  moduleName: 'ColumnMenu',
  version: VERSION,
  beans: [ColumnMenuFactory],
  dependsOn: [EnterpriseCoreModule],
  apiFunctions: { showColumnChooser, hideColumnChooser },
};
