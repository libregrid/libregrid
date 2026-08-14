import { BeanStub } from 'ag-grid-community';

/** Applies a chart datum selection back to the grid's normal filter pipeline. */
export class ChartCrossFilterService extends BeanStub {
  public readonly beanName = 'chartCrossFilterSvc';
  public apply(column: string, value: unknown): void {
    const beans = this.beans as typeof this.beans & { filterManager?: { setFilterModel(model: Record<string, unknown>, source?: string): void; onFilterChanged?(params?: object): void } };
    beans.filterManager?.setFilterModel({ [column]: { filterType: 'set', values: [value] } }, 'chart');
    beans.filterManager?.onFilterChanged?.({ source: 'chart' });
  }
}
