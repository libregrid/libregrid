import { Component, type ComponentSelector } from 'ag-grid-community';
import type { RowGroupPanelBuilder } from './rowGroupPanelBuilder';
import type { RowGroupDropZone } from './rowGroupDropZone';

/**
 * Standalone row-group panel component.
 *
 * @feature Row Grouping Panel
 */
export class RowGroupingPanel extends Component {
  private zone: RowGroupDropZone | undefined;

  public constructor() {
    super();
    this.setTemplate('<div class="lgr-header-drop-zones"></div>');
  }

  public postConstruct(): void {
    const builder = this.beans.rowGroupPanelBuilder as RowGroupPanelBuilder | undefined;
    if (builder) {
      this.zone = this.createManagedBean(builder.createRowGroupDropZone(true));
      this.getGui().appendChild(this.zone.getGui());
    }
    this.addManagedEventListeners({
      columnRowGroupChanged: () => this.updateVisibility(),
      newColumnsLoaded: () => this.updateVisibility(),
    });
    this.addManagedPropertyListener('rowGroupPanelShow', () => this.updateVisibility());
    this.updateVisibility();
  }

  private updateVisibility(): void {
    const show = this.gos.get('rowGroupPanelShow');
    const visible = show === 'always' || (show === 'onlyWhenGrouping' && (this.beans.rowGroupColsSvc?.columns.length ?? 0) > 0);
    this.setDisplayed(visible);
  }

  public static getSelector(): ComponentSelector<Component> {
    return {
      selector: 'AG-GRID-HEADER-DROP-ZONES',
      component: RowGroupingPanel,
    } as ComponentSelector<Component>;
  }
}
