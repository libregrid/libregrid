import { Component, type ComponentSelector } from 'ag-grid-community';
import { getUntypedBean, type IToolbarSvcShape } from '@libregrid/core';
import type { ToolbarEntry } from './toolbarService';

/**
 * Toolbar UI component — the Quick Access Toolbar shell.
 *
 * The grid layout template renders this component whenever a module registers
 * the AG-TOOLBAR selector (same seam as the status bar). Left-aligned items
 * flow from the start; the first right-aligned item pushes right with an
 * auto-margin, mirroring the native layout. The bar hides when no toolbar
 * grid option is set.
 */
export class ToolbarComponent extends Component {
  private toolbarSvc!: IToolbarSvcShape;

  constructor() {
    super();
    this.setTemplate('<div class="lgr-toolbar" role="toolbar" aria-label="Toolbar"></div>');
  }

  public postConstruct(): void {
    const svc = getUntypedBean<IToolbarSvcShape>(this.beans, 'toolbarSvc');
    if (!svc) return;
    this.toolbarSvc = svc;
    svc.comp = { refresh: () => this.refresh() };
    this.refresh();
  }

  /** Re-renders all items from the service's current entries. */
  public refresh(): void {
    const root = this.getGui();
    root.replaceChildren();
    const entries = this.toolbarSvc.getEntries() as ToolbarEntry[];
    let pushedRight = false;
    for (const entry of entries) {
      if (entry.align === 'right' && !pushedRight) {
        const spacer = document.createElement('span');
        spacer.className = 'lgr-toolbar-right-start';
        spacer.setAttribute('aria-hidden', 'true');
        root.appendChild(spacer);
        pushedRight = true;
      }
      root.appendChild(this.wrap(entry));
    }
    this.setDisplayed(entries.length > 0);
  }

  private wrap(entry: ToolbarEntry): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = 'lgr-toolbar-item';
    wrapper.appendChild(entry.gui);
    return wrapper;
  }

  public static getSelector(): ComponentSelector<Component> {
    return {
      selector: 'AG-TOOLBAR',
      component: ToolbarComponent,
    } as ComponentSelector<Component>;
  }
}
