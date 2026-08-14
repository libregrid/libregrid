import { Component, type ComponentSelector } from 'ag-grid-community';
import type { RowGroupPanelBuilder } from './rowGroupPanelBuilder';
import type { RowGroupDropZone } from './rowGroupDropZone';
import type { PivotDropZone } from './pivotDropZone';

/**
 * Standalone row-group panel component.
 *
 * @feature Row Grouping Panel
 */
export class RowGroupingPanel extends Component {
  private zone: RowGroupDropZone | undefined;
  private pivotZone: PivotDropZone | undefined;

  public constructor() {
    super();
    this.setTemplate('<div class="lgr-header-drop-zones"></div>');
  }

  public postConstruct(): void {
    const builder = this.beans.rowGroupPanelBuilder as RowGroupPanelBuilder | undefined;
    if (builder) {
      this.zone = this.createManagedBean(builder.createRowGroupDropZone(true));
      this.getGui().appendChild(this.zone.getGui());
      this.pivotZone = this.createManagedBean(builder.createPivotDropZone(true));
      this.getGui().appendChild(this.pivotZone.getGui());
    }
    this.addManagedEventListeners({
      columnRowGroupChanged: () => this.updateVisibility(),
      columnPivotChanged: () => this.updateVisibility(),
      columnPivotModeChanged: () => this.updateVisibility(),
      newColumnsLoaded: () => this.updateVisibility(),
    });
    this.addManagedPropertyListener('rowGroupPanelShow', () => this.updateVisibility());
    this.addManagedPropertyListener('pivotPanelShow', () => this.updateVisibility());
    this.updateVisibility();
  }

  private updateVisibility(): void {
    const show = this.gos.get('rowGroupPanelShow');
    const visible = show === 'always' || (show === 'onlyWhenGrouping' && (this.beans.rowGroupColsSvc?.columns.length ?? 0) > 0);
    this.setDisplayed(visible);
    const pivotShow = this.gos.get('pivotPanelShow');
    const pivoting = this.gos.get('pivotMode') === true;
    this.pivotZone?.setDisplayed(pivoting && (pivotShow === 'always' || (pivotShow === 'onlyWhenPivoting' && (this.beans.pivotColsSvc?.columns.length ?? 0) > 0)));
  }

  public static getSelector(): ComponentSelector<Component> {
    return {
      selector: 'AG-GRID-HEADER-DROP-ZONES',
      component: RowGroupingPanel,
    } as ComponentSelector<Component>;
  }
}
