import { BeanStub, type GridApi, type NamedBean, type ColumnChooserParams } from 'ag-grid-community';
import { inheritThemeTokens } from '@libregrid/core';
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
    close.className = 'lgr-column-chooser-close lgr-button';
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
    // The dialog lives on document.body, outside the themed grid root, so
    // copy the theme's --ag-* tokens across to keep light/dark mode intact.
    const gridRoot = (
      this.beans.gridApi as unknown as { getGridRootElement?: () => HTMLElement | undefined }
    ).getGridRootElement?.();
    if (gridRoot) inheritThemeTokens(gridRoot, overlay);
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
