import type { _ModuleWithoutApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { ColumnMenuFactory } from './colMenuFactory';
import { VERSION } from './version';

/**
 * Column menu module — provides the column header menu.
 *
 * @feature Column Menu
 */
export const ColumnMenuModule: _ModuleWithoutApi = {
  moduleName: 'ColumnMenu',
  version: VERSION,
  beans: [ColumnMenuFactory],
  dependsOn: [EnterpriseCoreModule],
};
