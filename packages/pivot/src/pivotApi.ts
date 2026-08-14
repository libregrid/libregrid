import { _getClientSideRowModel } from 'ag-grid-community';
import type { BeanCollection, ColDef, ColGroupDef, ColKey, Column } from 'ag-grid-community';
import type { PivotResultColsService } from './pivotResultColsService';

function refresh(beans: BeanCollection): void { _getClientSideRowModel(beans)?.refreshModel({ step: 'pivot' }); }

/** Whether pivot mode is enabled, even before a pivot-axis column is selected. */
export function isPivotMode(beans: BeanCollection): boolean { return beans.colModel.pivotMode === true; }
export function getPivotColumns(beans: BeanCollection): Column[] { return (beans.pivotColsSvc?.columns ?? []) as unknown as Column[]; }
export function setPivotColumns(beans: BeanCollection, keys: ColKey[]): void { beans.pivotColsSvc?.setColumns(keys, 'api'); refresh(beans); }
export function addPivotColumns(beans: BeanCollection, keys: ColKey[]): void { beans.pivotColsSvc?.addColumns(keys, 'api'); refresh(beans); }
export function removePivotColumns(beans: BeanCollection, keys: ColKey[]): void {
  beans.pivotColsSvc?.removeColumns(keys, 'api');
  if ((beans.pivotColsSvc?.columns.length ?? 0) === 0) {
    (beans.pivotResultCols as PivotResultColsService | undefined)?.setPivotResultCols(null, 'api');
  }
  refresh(beans);
}
export function getPivotResultColumn(beans: BeanCollection, keys: string[], value: ColKey): Column | null {
  return (beans.pivotResultCols as PivotResultColsService | undefined)?.lookupPivotResultCol(keys, value) ?? null;
}
export function setPivotResultColumns(beans: BeanCollection, defs: (ColDef | ColGroupDef)[] | null): void {
  (beans.pivotResultCols as PivotResultColsService | undefined)?.setPivotResultCols(defs, 'api', true);
  refresh(beans);
}
export function getPivotResultColumns(beans: BeanCollection): Column[] | null {
  return ((beans.pivotResultCols as PivotResultColsService | undefined)?.pivotCols ?? null) as unknown as Column[] | null;
}
