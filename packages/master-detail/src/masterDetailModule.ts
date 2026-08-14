import { type DetailGridInfo, type Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { DetailCellRenderer } from './detailCellRenderer';
import { MasterDetailService } from './masterDetailService';
import { VERSION } from './version';

type MasterBeans = { masterDetailSvc?: MasterDetailService };
function addDetailGridInfo(beans: MasterBeans, id: string, info: DetailGridInfo): void { beans.masterDetailSvc?.addDetail(id, info); }
function removeDetailGridInfo(beans: MasterBeans, id: string): void { beans.masterDetailSvc?.removeDetailInfo(id); }
function getDetailGridInfo(beans: MasterBeans, id: string): DetailGridInfo | undefined { return beans.masterDetailSvc?.store[id]; }
function forEachDetailGridInfo(beans: MasterBeans, callback: (info: DetailGridInfo, index: number) => void): void { Object.values(beans.masterDetailSvc?.store ?? {}).filter((info): info is DetailGridInfo => !!info).forEach(callback); }

const SharedMasterDetailModule: Module = { moduleName: 'SharedMasterDetail', version: VERSION };
export const MasterDetailModule: Module & { apiFunctions: object } = {
  moduleName: 'MasterDetail', version: VERSION, enterprise: true,
  dependsOn: [EnterpriseCoreModule, RowGroupingModule, SharedMasterDetailModule],
  beans: [MasterDetailService], userComponents: { agDetailCellRenderer: DetailCellRenderer },
  apiFunctions: { addDetailGridInfo, removeDetailGridInfo, getDetailGridInfo, forEachDetailGridInfo },
};
