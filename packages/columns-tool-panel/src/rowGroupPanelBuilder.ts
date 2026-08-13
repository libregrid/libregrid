import { BeanStub, type NamedBean, type _IRowGroupPanelBuilder } from 'ag-grid-community';
import { RowGroupDropZone } from './rowGroupDropZone';
import { PivotDropZone } from './pivotDropZone';

export class RowGroupPanelBuilder extends BeanStub implements NamedBean, _IRowGroupPanelBuilder {
  public beanName = 'rowGroupPanelBuilder' as const;

  public createRowGroupDropZone(horizontal: boolean, embedded = false): RowGroupDropZone {
    return new RowGroupDropZone(horizontal, embedded);
  }

  public createPivotDropZone(horizontal: boolean, embedded = false): PivotDropZone {
    return new PivotDropZone(horizontal, embedded);
  }
}
