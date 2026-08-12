import { _getClientSideRowModel } from 'ag-grid-community';
import type { BeanCollection, ColKey, Column, IRowGroupColsService } from 'ag-grid-community';

function svc(beans: BeanCollection): IRowGroupColsService | undefined {
  return beans.rowGroupColsSvc;
}

function refreshGrouping(beans: BeanCollection): void {
  _getClientSideRowModel(beans)?.refreshModel({ step: 'group' });
}

/** Set the columns used for row grouping. */
export function setRowGroupColumns(beans: BeanCollection, colKeys: ColKey[]): void {
  svc(beans)?.setColumns(colKeys, 'api');
  refreshGrouping(beans);
}

/** Add columns to the row group set. */
export function addRowGroupColumns(beans: BeanCollection, keys: ColKey[]): void {
  svc(beans)?.addColumns(keys, 'api');
  refreshGrouping(beans);
}

/** Remove columns from the row group set. */
export function removeRowGroupColumns(beans: BeanCollection, keys: ColKey[]): void {
  svc(beans)?.removeColumns(keys, 'api');
  refreshGrouping(beans);
}

/** Move a row group column to a new index. */
export function moveRowGroupColumn(beans: BeanCollection, fromIndex: number, toIndex: number): void {
  svc(beans)?.moveColumn(fromIndex, toIndex, 'api');
  refreshGrouping(beans);
}

/** The columns currently used for row grouping. */
export function getRowGroupColumns(beans: BeanCollection): Column[] {
  return (svc(beans)?.columns ?? []) as unknown as Column[];
}
