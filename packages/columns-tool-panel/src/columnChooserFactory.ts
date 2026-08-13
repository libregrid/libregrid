import { BeanStub, type GridApi, type NamedBean, type ColumnChooserParams } from 'ag-grid-community';
import { ColumnsToolPanel } from './columnsToolPanel';

export class ColumnChooserFactory extends BeanStub implements NamedBean {
  public beanName = 'colChooserFactory' as const;
  private overlay: HTMLElement | undefined;
  private panel: ColumnsToolPanel | undefined;

  public showColumnChooser(params: ColumnChooserParams = {}): void {
    this.hideColumnChooser();
    const overlay = document.createElement('div');
    overlay.className = 'lgr-column-chooser-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'lgr-column-chooser-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Column chooser');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'lgr-column-chooser-close';
    close.textContent = 'Close';
    close.setAttribute('aria-label', 'Close column chooser');
    this.addManagedElementListeners(close, { click: () => this.hideColumnChooser() });
    const panel = new ColumnsToolPanel();
    panel.init({
      ...params,
      suppressRowGroups: true,
      suppressValues: true,
      suppressPivots: true,
      suppressPivotMode: true,
      api: this.beans.gridApi as GridApi,
      context: null,
      onStateUpdated: () => {},
    });
    if (params.columnLayout) panel.setColumnLayout(params.columnLayout);
    dialog.append(close, panel.getGui());
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.panel = panel;
    this.addManagedElementListeners(document, { keydown: (event?: KeyboardEvent) => {
      if (event?.key === 'Escape') this.hideColumnChooser();
    } });
    close.focus();
  }

  public hideColumnChooser(): void {
    this.panel?.destroy();
    this.panel = undefined;
    this.overlay?.remove();
    this.overlay = undefined;
  }

  public override destroy(): void {
    this.hideColumnChooser();
    super.destroy();
  }
}
