import type { _StatusBarGridApi, BeanCollection, _ModuleWithApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { VERSION } from './version';
import {
  AggregationPanel,
  FilteredRowCountPanel,
  SelectedRowCountPanel,
  TotalAndFilteredRowCountPanel,
  TotalRowCountPanel,
} from './statusPanels';
import { StatusBarService } from './statusBarService';
function getStatusPanel(beans: BeanCollection, key: string) {
  return (beans.statusBarSvc as StatusBarService | undefined)?.getStatusPanel(key);
}

/** Registers the Status Bar feature boundary. @feature Status Bar */
export const StatusBarModule: _ModuleWithApi<_StatusBarGridApi> = {
  moduleName: 'StatusBar',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  beans: [StatusBarService],
  userComponents: {
    agTotalRowCountComponent: TotalRowCountPanel,
    agTotalAndFilteredRowCountComponent: TotalAndFilteredRowCountPanel,
    agFilteredRowCountComponent: FilteredRowCountPanel,
    agSelectedRowCountComponent: SelectedRowCountPanel,
    agAggregationComponent: AggregationPanel,
  },
  apiFunctions: {
    getStatusPanel,
  },
};
