import {
  BeanStub,
  type AgColumn,
  type IAggColumnNameService,
  type NamedBean,
} from 'ag-grid-community';

/**
 * Prefixes a value column's header with its aggregation function — bean
 * `aggColNameSvc`. Community's `ColumnNameService.getDisplayNameForColumn`
 * consults it when called with `includeAggFunc` (headers, floating filters,
 * tooltips, exports), so a `sum` column named "Sales" reads `sum(Sales)`.
 * `suppressAggFuncInHeader` turns it off. A function-valued `aggFunc` has no
 * name to show and renders as `func`.
 *
 * Pivot result columns (`colDef.pivotValueColumn`) are left to the pivot
 * module's own header generation.
 *
 * @feature Aggregation
 * @gridOption suppressAggFuncInHeader
 */
export class AggColumnNameService extends BeanStub implements IAggColumnNameService, NamedBean {
  beanName = 'aggColNameSvc' as const;

  public getHeaderName(column: AgColumn, headerName: string | null): string | null {
    if (headerName == null || this.gos.get('suppressAggFuncInHeader')) return headerName;
    if (column.getColDef().pivotValueColumn) return headerName;
    if (!column.isValueActive()) return headerName;

    const aggFunc = column.getAggFunc();
    if (aggFunc == null) return headerName;
    return `${typeof aggFunc === 'string' ? aggFunc : 'func'}(${headerName})`;
  }
}
