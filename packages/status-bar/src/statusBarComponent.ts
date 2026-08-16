import { Component, type ComponentSelector } from 'ag-grid-community';
import type { StatusBarService, StatusPanelEntry } from './statusBarService';

/**
 * Status bar UI component — the visual shell for the grid status bar.
 *
 * The grid layout template renders this component whenever a module registers
 * the AG-STATUS-BAR selector (same seam the side bar uses). It lays the
 * configured panels out into left / center / right buckets and hides the
 * whole bar when no statusBar grid option is set.
 */
export class StatusBarComponent extends Component {
  private statusBarSvc!: StatusBarService;

  constructor() {
    super();
    this.setTemplate(
      '<div class="lgr-status-bar" role="status" aria-label="Status bar">' +
        '<div class="lgr-status-bar-left"></div>' +
        '<div class="lgr-status-bar-center"></div>' +
        '<div class="lgr-status-bar-right"></div>' +
        '</div>',
    );
  }

  public postConstruct(): void {
    this.statusBarSvc = this.beans.statusBarSvc as unknown as StatusBarService;
    this.statusBarSvc.comp = this;
    this.refresh();
  }

  /** Re-renders all buckets from the service's current panel entries. */
  public refresh(): void {
    const entries = this.statusBarSvc.getEntries();
    const root = this.getGui();
    const bucketFor = (align: StatusPanelEntry['align']): HTMLElement | null =>
      root.querySelector<HTMLElement>('.lgr-status-bar-' + align);

    for (const align of ['left', 'center', 'right'] as const) {
      bucketFor(align)?.replaceChildren();
    }
    for (const entry of entries) {
      const bucket = bucketFor(entry.align);
      const gui = entry.panel.getGui?.();
      if (!bucket || !gui) continue;
      gui.classList.toggle('lgr-status-panel-hidden', !(entry.panel.visible?.() ?? true));
      bucket.appendChild(gui);
    }
    this.setDisplayed(entries.length > 0);
  }

  public static getSelector(): ComponentSelector<Component> {
    return {
      selector: 'AG-STATUS-BAR',
      component: StatusBarComponent,
    } as ComponentSelector<Component>;
  }
}
