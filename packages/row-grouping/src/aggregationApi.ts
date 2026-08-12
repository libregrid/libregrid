import { _getClientSideRowModel } from 'ag-grid-community';
import type {
  BeanCollection,
  ColAggFunc,
  ColKey,
  Column,
  IAggFunc,
  IValueColsService,
} from 'ag-grid-community';

function svc(beans: BeanCollection): IValueColsService | undefined {
  return beans.valueColsSvc;
}

function refreshAggregate(beans: BeanCollection): void {
  _getClientSideRowModel(beans)?.refreshModel({ step: 'aggregate' });
}

/** Add custom aggregation functions. */
export function addAggFuncs(beans: BeanCollection, aggFuncs: { [key: string]: IAggFunc }): void {
  beans.aggFuncSvc?.addAggFuncs(aggFuncs);
  refreshAggregate(beans);
}

/** Clear all aggregation functions, including the built-ins. */
export function clearAggFuncs(beans: BeanCollection): void {
  beans.aggFuncSvc?.clear();
  refreshAggregate(beans);
}

/** Set the aggregation function for one column. */
export function setColumnAggFunc(beans: BeanCollection, key: ColKey, aggFunc: ColAggFunc): void {
  svc(beans)?.setColumnAggFunc(key, aggFunc, 'api');
  refreshAggregate(beans);
}

/** Columns currently acting as value (aggregation) columns. */
export function getValueColumns(beans: BeanCollection): Column[] {
  return (svc(beans)?.columns ?? []) as unknown as Column[];
}

/** Mark columns as value columns with the default agg function. */
export function addValueColumns(beans: BeanCollection, keys: ColKey[]): void {
  svc(beans)?.addColumns(keys, 'api');
  refreshAggregate(beans);
}

/** Remove columns from the value set. */
export function removeValueColumns(beans: BeanCollection, keys: ColKey[]): void {
  svc(beans)?.removeColumns(keys, 'api');
  refreshAggregate(beans);
}

/** Replace the value column set entirely. */
export function setValueColumns(beans: BeanCollection, keys: ColKey[]): void {
  svc(beans)?.setColumns(keys, 'api');
  refreshAggregate(beans);
}
