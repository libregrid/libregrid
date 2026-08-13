import type { _ModuleWithApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { RowGroupPanelBuilder } from './rowGroupPanelBuilder';
import { RowGroupingPanel } from './rowGroupingPanel';
import { rowGroupingPanelCss } from './rowGroupingPanelCss';
import { VERSION } from './version';

/**
 * Registers the standalone row-group panel above the grid.
 *
 * @feature Row Grouping Panel
 */
export const RowGroupingPanelModule: _ModuleWithApi<never> = {
  moduleName: 'RowGroupingPanel',
  version: VERSION,
  beans: [RowGroupPanelBuilder],
  selectors: [RowGroupingPanel.getSelector()],
  dependsOn: [EnterpriseCoreModule],
  css: [rowGroupingPanelCss],
  enterprise: true,
};
