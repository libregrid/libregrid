import { BeanStub, type NamedBean, type ToolPanelDef } from 'ag-grid-community';
import { registerToolPanel } from '@libregrid/side-bar';
import { FiltersToolPanel } from './filtersToolPanel';

export class FiltersToolPanelFactory extends BeanStub implements NamedBean {
  public beanName = 'filterPanelSvc' as const;
  public postConstruct(): void { registerToolPanel(this.beans, filtersToolPanelDef); }
}

export const filtersToolPanelDef: ToolPanelDef = {
  id: 'filters', labelKey: 'filters', labelDefault: 'Filters', iconKey: 'filter', width: 300, minWidth: 240, maxWidth: 460, toolPanel: FiltersToolPanel,
};
