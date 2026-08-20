import { Component, type ISideBar, type SideBarDef, type IToolPanel, type SideBarState, type ComponentSelector } from 'ag-grid-community';
import { iconSvg } from '@libregrid/core';
import type { SideBarService } from './sideBarSvc';
import { renderSideBar } from './sideBarRenderer';

/**
 * Side bar UI component — the visual shell for the side bar.
 *
 * This component is instantiated by the grid when it encounters the
 * `<ag-side-bar>` tag in the grid template. It implements ISideBar,
 * which the grid calls to control the side bar.
 */
export class SideBarComponent extends Component implements ISideBar {
  private sideBarSvc!: SideBarService;
  private def: SideBarDef | undefined;
  private _displayed = false;
  private position: 'left' | 'right' = 'right';
  private openedPanelId: string | null = null;
  private panels = new Map<string, IToolPanel>();
  private panelWidths = new Map<string, number>();
  private panelWidth = 200;
  private activePanelHost: HTMLElement | null = null;

  constructor() {
    super();
    this.setTemplate(`
        <div class="lgr-side-bar" role="complementary" aria-label="Side bar">
          <div class="lgr-side-bar-buttons" role="tablist"></div>
          <div class="lgr-side-bar-panel" role="tabpanel">
            <div class="lgr-side-bar-resize-handle" role="separator" aria-label="Resize side bar" aria-orientation="vertical"></div>
            <div class="lgr-side-bar-panel-content"></div>
          </div>
      </div>
    `);
  }

  public postConstruct(): void {
    this.sideBarSvc = this.beans.sideBar as unknown as SideBarService;
    this.sideBarSvc.comp = this;
    this._displayed = this.sideBarSvc.isDisplayed();
    this.position = this.sideBarSvc.getPosition();
    const refreshRenderer = () => this.refreshRenderer();
    document.addEventListener('lgr-side-bar-renderer-changed', refreshRenderer);
    this.addDestroyFunc(() => document.removeEventListener('lgr-side-bar-renderer-changed', refreshRenderer));
    this.refresh();
    requestAnimationFrame(() => this.refreshRenderer());
  }

  public override destroy(): void {
    for (const panel of this.panels.values()) {
      (panel as IToolPanel & { destroy?: () => void }).destroy?.();
    }
    this.panels.clear();
    this.openedPanelId = null;
    this.applyGridInset();
    super.destroy();
  }

  public refresh(): void {
    this.def = this.sideBarSvc.getDef();
    if (!this.def) {
      this.setDisplayed(false);
      return;
    }
    for (const panel of this.panels.values()) {
      panel.refresh({
        api: this.beans.gridApi as never,
        context: null,
        onStateUpdated: () => {},
      });
    }
    this.setSideBarPosition(this.sideBarSvc.getPosition());
    this.renderButtons();
    this.toggleCss('lgr-side-bar-buttons-hidden', !!this.def.hideButtons);
    this.setDisplayed(this.sideBarSvc.isDisplayed());
    if (this.def.defaultToolPanel && !this.openedPanelId) {
      this.openToolPanel(this.def.defaultToolPanel, 'sideBarInitializing');
      this.renderButtons();
    }
    this.refreshRenderer();
  }

  public override setDisplayed(show: boolean): void {
    this._displayed = show;
    this.setVisible(show);
    // A hidden bar must not leave its scroll inset on the grid.
    if (!show) {
      this.openedPanelId = null;
    }
    this.applyGridInset();
    this.refreshRenderer();
  }

  public setSideBarPosition(position?: 'left' | 'right'): void {
    this.position = position ?? 'right';
    this.toggleCss('lgr-side-bar-left', this.position === 'left');
    this.toggleCss('lgr-side-bar-right', this.position === 'right');
    this.applyGridInset();
    this.refreshRenderer();
  }

  public isToolPanelShowing(): boolean {
    return this.openedPanelId !== null;
  }

  public openToolPanel(key: string, _source?: 'sideBarButtonClicked' | 'sideBarInitializing' | 'api', _parent?: HTMLElement | null): void {
    const previousPanelId = this.openedPanelId;
    this.openedPanelId = key;
    this.panelWidth = this.panelWidths.get(key) ?? this.initialPanelWidth(key);
    this.renderPanel(key, _parent);
    this.getGui().querySelector('.lgr-side-bar-panel')?.classList.add('lgr-side-bar-panel-open');
    this.applyPanelWidth();
    this.refreshRenderer();
    if (previousPanelId !== key) {
      this.dispatchToolPanelVisibleChanged(key, true);
      if (previousPanelId) this.dispatchToolPanelVisibleChanged(previousPanelId, false);
    }
  }

  public getToolPanelInstance(key: string): IToolPanel | undefined {
    return this.panels.get(key);
  }

  public close(_source?: 'sideBarButtonClicked' | 'sideBarInitializing' | 'api'): void {
    const previousPanelId = this.openedPanelId;
    this.openedPanelId = null;
    this.activePanelHost?.replaceChildren();
    this.activePanelHost = null;
    const panelEl = this.getGui().querySelector<HTMLElement>('.lgr-side-bar-panel');
    panelEl?.classList.remove('lgr-side-bar-panel-open');
    panelEl?.setAttribute('aria-hidden', 'true');
    this.applyGridInset();
    this.refreshRenderer();
    if (previousPanelId) this.dispatchToolPanelVisibleChanged(previousPanelId, false);
  }

  public openedItem(): string | null {
    return this.openedPanelId;
  }

  public override isDisplayed(): boolean {
    return this._displayed;
  }

  public getDef(): SideBarDef | undefined {
    return this.def;
  }

  public getState(): SideBarState {
    return {
      visible: this._displayed,
      position: this.position,
      openToolPanel: this.openedPanelId,
      toolPanels: {},
    };
  }

  public setState(state?: SideBarState): void {
    if (!state) return;
    this._displayed = state.visible;
    this.position = state.position;
    this.openedPanelId = state.openToolPanel;
    this.setDisplayed(state.visible);
  }

  private panelButtonId(key: string): string {
    return `lgr-side-bar-${key}-button`;
  }

  private panelHostId(key: string): string {
    return `lgr-side-bar-${key}-panel`;
  }

  private renderPanel(key: string, parent?: HTMLElement | null): void {
    const panelEl = this.getGui().querySelector<HTMLElement>('.lgr-side-bar-panel');
    const contentEl = this.getGui().querySelector<HTMLElement>('.lgr-side-bar-panel-content');
    if (!panelEl || !contentEl) return;
    // Mirror the enterprise panel host wiring: the tabpanel is labelled by
    // the active tab button and hidden from the tree while closed.
    panelEl.id = this.panelHostId(key);
    panelEl.setAttribute('aria-labelledby', this.panelButtonId(key));
    panelEl.setAttribute('aria-hidden', 'false');

    // Find the panel definition
    const panelDef = this.sideBarSvc.getToolPanelDefs().find((d) => d.id === key);
    if (!panelDef) {
      contentEl.innerHTML = `<div class="lgr-tool-panel-missing">Panel '${key}' not found</div>`;
      return;
    }

    const target = parent ?? panelDef.parent ?? contentEl;
    this.activePanelHost?.replaceChildren();
    target.innerHTML = '';
    this.activePanelHost = target;
    const instance = this.getOrCreatePanel(panelDef);
    if (instance && isPanelComponent(instance)) {
      target.appendChild(instance.getGui());
    } else {
      target.innerHTML = `
        <div class="lgr-tool-panel" data-panel-id="${key}">
          <div class="lgr-tool-panel-header">${panelDef.labelDefault ?? panelDef.labelKey}</div>
          <div class="lgr-tool-panel-body">Panel content for '${key}'</div>
        </div>
      `;
    }
    this.configureResizeHandle();
  }

  private configureResizeHandle(): void {
    const handle = this.getGui().querySelector<HTMLElement>('.lgr-side-bar-resize-handle');
    if (!handle || handle.dataset['configured']) return;
    handle.dataset['configured'] = 'true';
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = this.panelWidth;
      const onPointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        this.panelWidth = this.clampPanelWidth(startWidth + (this.position === 'right' ? -delta : delta));
        if (this.openedPanelId) {
          this.panelWidths.set(this.openedPanelId, this.panelWidth);
          this.dispatchToolPanelSizeChanged(this.openedPanelId);
        }
        this.applyPanelWidth();
      };
      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp, { once: true });
    });
  }

  private applyPanelWidth(): void {
    const panelEl = this.getGui().querySelector<HTMLElement>('.lgr-side-bar-panel');
    if (!panelEl) return;
    panelEl.style.width = `${this.clampPanelWidth(this.panelWidth)}px`;
    this.applyGridInset();
  }

  /**
   * Keep the grid's scrollbars in sync with the open panel.
   *
   * The panel overlays the columns, and the columns never re-layout or
   * shift. The grid's own horizontal-scroll math is
   * contentWidth - viewport.clientWidth, so the viewport's flex width is
   * reduced by the panel width through a margin (no JS resize fires), while
   * the rows container keeps its grid-assigned width with flex-shrink: 0 —
   * the columns stay put, the scroll range grows, and the grid's scrollbar
   * service renders the thumb and syncs natively. The scrollbars themselves
   * are pinned beside the panel: the vertical scrollbar shifts left of the
   * panel and the horizontal scrollbar shortens to the panel's edge. All
   * originals are restored when the panel closes.
   */
  private applyGridInset(): void {
    const wrapper = this.getGui().closest<HTMLElement>('.ag-root-wrapper');
    const viewport = wrapper?.querySelector<HTMLElement>('.ag-grid-viewport');
    if (!viewport) {
      // The side bar is not attached to the grid DOM yet (panel opened via
      // defaultToolPanel during grid construction) — retry next frame.
      if (this.openedPanelId) {
        requestAnimationFrame(() => this.applyGridInset());
      }
      return;
    }
    const rowsContainer = wrapper?.querySelector<HTMLElement>('.ag-grid-scrolling-container');
    const vertical = wrapper?.querySelector<HTMLElement>('.ag-body-vertical-scroll');
    const horizontal = wrapper?.querySelector<HTMLElement>('.ag-body-horizontal-scroll');

    if (viewport.dataset['lgrSaved'] !== 'true') {
      viewport.dataset['lgrMarginLeft'] = viewport.style.marginLeft;
      viewport.dataset['lgrMarginRight'] = viewport.style.marginRight;
      if (rowsContainer) rowsContainer.dataset['lgrFlexShrink'] = rowsContainer.style.flexShrink;
      if (vertical) vertical.dataset['lgrMarginRight'] = vertical.style.marginRight;
      if (horizontal) {
        horizontal.dataset['lgrWidth'] = horizontal.style.width;
        horizontal.dataset['lgrMarginLeft'] = horizontal.style.marginLeft;
      }
      viewport.dataset['lgrSaved'] = 'true';
    }

    const width = this.openedPanelId ? this.clampPanelWidth(this.panelWidth) : 0;
    if (width === 0) {
      viewport.style.marginLeft = viewport.dataset['lgrMarginLeft'] ?? '';
      viewport.style.marginRight = viewport.dataset['lgrMarginRight'] ?? '';
      if (rowsContainer) rowsContainer.style.flexShrink = rowsContainer.dataset['lgrFlexShrink'] ?? '';
      if (vertical) vertical.style.marginRight = vertical.dataset['lgrMarginRight'] ?? '';
      if (horizontal) {
        horizontal.style.width = horizontal.dataset['lgrWidth'] ?? '';
        horizontal.style.marginLeft = horizontal.dataset['lgrMarginLeft'] ?? '';
      }
      return;
    }

    if (this.position === 'left') {
      viewport.style.marginLeft = `${width}px`;
      viewport.style.marginRight = '';
    } else {
      viewport.style.marginLeft = '';
      viewport.style.marginRight = `${width}px`;
    }
    if (rowsContainer) rowsContainer.style.flexShrink = '0';
    if (vertical) {
      // Right-positioned panel: pin the vertical scrollbar left of the
      // panel. Left-positioned panel: the scrollbar stays at the grid's
      // right edge, uncovered — restore its original margin.
      vertical.style.marginRight =
        this.position === 'left'
          ? (vertical.dataset['lgrMarginRight'] ?? '')
          : `${width}px`;
    }
    if (horizontal) {
      horizontal.style.width = `calc(100% - ${width}px)`;
      horizontal.style.marginLeft = this.position === 'left' ? `${width}px` : '';
    }
  }

  private clampPanelWidth(width: number): number {
    const panel = this.sideBarSvc.getToolPanelDefs().find((item) => item.id === this.openedPanelId);
    const minWidth = panel?.minWidth ?? 100;
    const maxWidth = panel?.maxWidth ?? 500;
    return Math.min(Math.max(width, minWidth), maxWidth);
  }

  private initialPanelWidth(key: string): number {
    const panel = this.sideBarSvc.getToolPanelDefs().find((item) => item.id === key);
    return this.clampPanelWidth(panel?.width ?? 250);
  }

  private renderButtons(): void {
    const buttonsEl = this.getButtonsEl();

    buttonsEl.innerHTML = '';
    for (const panel of this.sideBarSvc.getToolPanelDefs()) {
      const button = document.createElement('button');
      button.className = 'lgr-side-bar-button';
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.id = this.panelButtonId(panel.id);
      button.setAttribute('aria-controls', this.panelHostId(panel.id));
      const label = panel.labelDefault ?? panel.labelKey ?? panel.id;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-expanded', String(this.openedPanelId === panel.id));
      button.title = label;
      const svg = panel.iconKey ? iconSvg(panel.iconKey as never) : null;
      if (svg) {
        const icon = document.createElement('span');
        icon.className = 'lgr-side-bar-button-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = svg;
        button.appendChild(icon);
      }
      const labelEl = document.createElement('span');
      labelEl.className = 'lgr-side-bar-button-label';
      labelEl.textContent = label;
      button.appendChild(labelEl);
      button.addEventListener('click', () => {
        if (this.openedPanelId === panel.id) {
          this.sideBarSvc.close('sideBarButtonClicked');
        } else {
          this.sideBarSvc.openToolPanel(panel.id, 'sideBarButtonClicked');
        }
        this.renderButtons();
      });
      buttonsEl.appendChild(button);
    }
  }

  private refreshRenderer(): void {
    const buttonsEl = this.getButtonsEl();
    renderSideBar({
      host: buttonsEl,
      panelDefs: this.sideBarSvc.getToolPanelDefs(),
      openedPanelId: this.openedPanelId,
      position: this.position,
      displayed: this._displayed,
      togglePanel: (id) => {
        if (this.openedPanelId === id) {
          this.sideBarSvc.close('sideBarButtonClicked');
        } else {
          this.sideBarSvc.openToolPanel(id, 'sideBarButtonClicked');
        }
      },
    });
  }

  /**
   * AG Grid can remove an empty template child while constructing a component.
   * Keep the tablist as a dedicated child so a framework renderer never falls
   * back to the complementary sidebar landmark as its host.
   */
  private getButtonsEl(): HTMLElement {
    const root = this.getGui();
    const existing = root.querySelector<HTMLElement>('.lgr-side-bar-buttons');
    if (existing) return existing;

    const buttonsEl = document.createElement('div');
    buttonsEl.className = 'lgr-side-bar-buttons';
    buttonsEl.setAttribute('role', 'tablist');
    root.prepend(buttonsEl);
    return buttonsEl;
  }

  private getOrCreatePanel(def: NonNullable<SideBarDef['toolPanels']>[number] & { id: string }): IToolPanel | undefined {
    const existing = this.panels.get(def.id);
    if (existing) return existing;
    if (typeof def === 'string' || !def.toolPanel) return undefined;
    const Panel = def.toolPanel as new () => IToolPanel;
    const panel = new Panel();
    const initialisable = panel as IToolPanel & { init?: (params: unknown) => void };
    initialisable.init?.({
      ...(def.toolPanelParams ?? {}),
      api: this.beans.gridApi,
      onStateUpdated: () => {},
    });
    this.panels.set(def.id, panel);
    return panel;
  }

  private dispatchToolPanelVisibleChanged(key: string, visible: boolean): void {
    (this.beans.eventSvc as unknown as { dispatchEvent: (event: object) => void } | undefined)?.dispatchEvent({
      type: 'toolPanelVisibleChanged',
      key,
      visible,
      source: 'api',
    });
  }

  private dispatchToolPanelSizeChanged(key: string): void {
    (this.beans.eventSvc as unknown as { dispatchEvent: (event: object) => void } | undefined)?.dispatchEvent({
      type: 'toolPanelSizeChanged',
      key,
      width: this.panelWidth,
      source: 'api',
    });
  }

  public static getSelector(): ComponentSelector<Component> {
    return {
      selector: 'AG-SIDE-BAR',
      component: SideBarComponent,
    } as ComponentSelector<Component>;
  }
}

function isPanelComponent(panel: IToolPanel): panel is IToolPanel & { getGui: () => HTMLElement } {
  return typeof (panel as { getGui?: unknown }).getGui === 'function';
}
