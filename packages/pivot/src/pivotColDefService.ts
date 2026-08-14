import { BeanStub, type NamedBean } from 'ag-grid-community';
import type { ColDef, ColGroupDef, IPivotColDefService } from 'ag-grid-community';

/** Compatibility seam for callers that provide server-style pivot result fields. */
export class PivotColDefService extends BeanStub implements IPivotColDefService, NamedBean {
  public beanName = 'pivotColDefSvc' as const;
  /** Server responses name result columns; the server, never this helper, supplies the values. */
  public createColDefsFromFields = (fields: string[]): (ColDef | ColGroupDef)[] => {
    // Unit consumers may use this pure compatibility helper before the bean
    // is attached to a grid context.
    const separator = this.gos?.get('serverSidePivotResultFieldSeparator') ?? '_';
    return fields.map((field) => ({ colId: field, field, headerName: field, pivotKeys: field.split(separator) }));
  };
  public orderPivotResultColDefs = (defs: (ColDef | ColGroupDef)[]): (ColDef | ColGroupDef)[] => defs.slice();
  public recreateColDef = (def: ColDef): ColDef => ({ ...def });
}
