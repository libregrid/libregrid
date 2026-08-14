import { BeanStub, type AdvancedFilterModel, type NamedBean } from 'ag-grid-community';
import { parseAdvancedFilterExpression, serialiseAdvancedFilterModel, type ExpressionColumn } from './expression';

/** Dedicated expression seam used by the advanced-filter pipeline and UI. */
export class AdvancedFilterExpressionService extends BeanStub implements NamedBean {
  public beanName = 'advFilterExpSvc' as const;
  public parse(text: string, columns: readonly ExpressionColumn[]) { return parseAdvancedFilterExpression(text, columns); }
  public serialise(model: AdvancedFilterModel | null): string { return serialiseAdvancedFilterModel(model); }
}
