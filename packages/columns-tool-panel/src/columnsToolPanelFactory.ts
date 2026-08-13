import { BeanStub, type BeanCollection, type NamedBean, type ToolPanelDef } from 'ag-grid-community';
import { registerToolPanel } from '@libregrid/side-bar';
import { ColumnsToolPanel } from './columnsToolPanel';

export class ColumnsToolPanelFactory extends BeanStub implements NamedBean {
  public beanName = 'colToolPanelFactory' as const;

  public postConstruct(): void {
    registerToolPanel(this.beans, columnsToolPanelDef);
  }
}

export const columnsToolPanelDef: ToolPanelDef = {
  id: 'columns',
  labelKey: 'columns',
  labelDefault: 'Columns',
  iconKey: 'columns',
  width: 260,
  minWidth: 220,
  maxWidth: 380,
  toolPanel: ColumnsToolPanel,
};

export type RegisterToolPanel = (beans: BeanCollection, def: ToolPanelDef) => void;
