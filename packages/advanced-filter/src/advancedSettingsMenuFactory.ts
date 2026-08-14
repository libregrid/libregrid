import { BeanStub, type NamedBean } from 'ag-grid-community';

/** Named settings-menu seam; the builder owns its visible controls. */
export class AdvancedSettingsMenuFactory extends BeanStub implements NamedBean {
  public beanName = 'advSettingsMenuFactory' as const;
}
