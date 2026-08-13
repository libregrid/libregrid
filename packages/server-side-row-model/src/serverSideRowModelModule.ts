import {
  _getServerSideRowModel,
  type IServerSideSelectionState,
  type Module,
  type _ServerSideRowModelGridApi,
  type ServerSideTransaction,
  type ServerSideTransactionResult,
} from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { ServerSideLoadingCellRenderer, ServerSideRowModel } from './serverSideRowModel';
import { VERSION } from './version';

function refreshServerSide(beans: Parameters<typeof _getServerSideRowModel>[0]): void {
  _getServerSideRowModel(beans)?.refreshStore();
}

function retryServerSideLoads(beans: Parameters<typeof _getServerSideRowModel>[0]): void {
  _getServerSideRowModel(beans)?.retryLoads();
}

function getServerSideGroupLevelState(beans: Parameters<typeof _getServerSideRowModel>[0]) {
  return _getServerSideRowModel(beans)?.getStoreState() ?? [];
}

function applyServerSideRowData(
  beans: Parameters<typeof _getServerSideRowModel>[0],
  params: Parameters<_ServerSideRowModelGridApi<unknown>['applyServerSideRowData']>[0],
): void {
  _getServerSideRowModel(beans)?.applyRowData(
    params.successParams,
    params.startRow ?? 0,
    params.route ?? [],
  );
}

function setRowCount(
  beans: Parameters<typeof _getServerSideRowModel>[0],
  rowCount: number,
  maxRowFound?: boolean,
): void {
  _getServerSideRowModel(beans)?.setRowCount(rowCount, maxRowFound);
}

function getCacheBlockState(beans: Parameters<typeof _getServerSideRowModel>[0]) {
  return _getServerSideRowModel(beans)?.getBlockStates() ?? {};
}

function isLastRowIndexKnown(beans: Parameters<typeof _getServerSideRowModel>[0]) {
  return _getServerSideRowModel(beans)?.isLastRowIndexKnown();
}

function applyServerSideTransaction(
  beans: Parameters<typeof _getServerSideRowModel>[0],
  transaction: ServerSideTransaction,
): ServerSideTransactionResult<unknown> | undefined {
  return _getServerSideRowModel(beans)?.applyTransaction(transaction);
}

function applyServerSideTransactionAsync(
  beans: Parameters<typeof _getServerSideRowModel>[0],
  transaction: ServerSideTransaction,
  callback?: (result: ServerSideTransactionResult<unknown>) => void,
): void {
  _getServerSideRowModel(beans)?.applyTransactionAsync(transaction, callback);
}

function flushServerSideAsyncTransactions(beans: Parameters<typeof _getServerSideRowModel>[0]): void {
  _getServerSideRowModel(beans)?.flushAsyncTransactions();
}

function getServerSideSelectionState(beans: Parameters<typeof _getServerSideRowModel>[0]) {
  return _getServerSideRowModel(beans)?.getSelectionState() ?? null;
}

function setServerSideSelectionState(
  beans: Parameters<typeof _getServerSideRowModel>[0],
  state: IServerSideSelectionState,
): void {
  _getServerSideRowModel(beans)?.setSelectionState(state);
}

/**
 * Registers the Server-Side Row Model feature boundary.
 *
 * The Phase-7 implementation will add the row-model bean and its API
 * companion here. Registration remains the consuming application's decision;
 * this package never registers itself at module scope.
 *
 * @feature Server-Side Row Model
 */
const ServerSideRowModelCoreModule = {
  moduleName: 'ServerSideRowModel' as const,
  version: VERSION,
  enterprise: true,
  rowModels: ['serverSide' as const],
  beans: [ServerSideRowModel],
  userComponents: { agLoadingCellRenderer: ServerSideLoadingCellRenderer },
  dependsOn: [EnterpriseCoreModule],
};

const apiFunctions = {
  refreshServerSide,
  retryServerSideLoads,
  getServerSideGroupLevelState,
  applyServerSideRowData,
  setRowCount,
  getCacheBlockState,
  isLastRowIndexKnown,
  applyServerSideTransaction,
  applyServerSideTransactionAsync,
  flushServerSideAsyncTransactions,
  getServerSideSelectionState,
  setServerSideSelectionState,
};

/**
 * Server-Side Row Model module and its API companion.
 *
 * Register this single module in the consuming application; it brings in the
 * server-side row-model bean under Community's `ServerSideRowModel` seam.
 *
 * @feature Server-Side Row Model
 */
export const ServerSideRowModelModule: Module & { apiFunctions: typeof apiFunctions } = {
  moduleName: 'ServerSideRowModelApi',
  version: VERSION,
  enterprise: true,
  dependsOn: [ServerSideRowModelCoreModule],
  apiFunctions,
};
