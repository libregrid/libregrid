import { Component, type ISideBar, type SideBarDef, type IToolPanel, type SideBarState, type ComponentSelector } from 'ag-grid-community';
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
          <div class="lgr-side-bar-resize-handle" role="separator" aria-label="Resize side bar" aria-orientation="vertical"></div>
          <div class="lgr-side-bar-panel" role="tabpanel"></div>
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
    this.refreshRenderer();
  }

  public setSideBarPosition(position?: 'left' | 'right'): void {
    this.position = position ?? 'right';
    this.toggleCss('lgr-side-bar-left', this.position === 'left');
    this.toggleCss('lgr-side-bar-right', this.position === 'right');
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

  private renderPanel(key: string, parent?: HTMLElement | null): void {
    const panelEl = this.getGui().querySelector('.lgr-side-bar-panel');
    if (!panelEl) return;

    // Find the panel definition
    const panelDef = this.sideBarSvc.getToolPanelDefs().find((d) => d.id === key);
    if (!panelDef) {
      panelEl.innerHTML = `<div class="lgr-tool-panel-missing">Panel '${key}' not found</div>`;
      return;
    }

    const target = parent ?? panelDef.parent ?? panelEl as HTMLElement;
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
  }

  private clampPanelWidth(width: number): number {
    const panel = this.sideBarSvc.getToolPanelDefs().find((item) => item.id === this.openedPanelId);
    const minWidth = panel?.minWidth ?? 100;
    const maxWidth = panel?.maxWidth ?? 500;
    return Math.min(Math.max(width, minWidth), maxWidth);
  }

  private initialPanelWidth(key: string): number {
    const panel = this.sideBarSvc.getToolPanelDefs().find((item) => item.id === key);
    return this.clampPanelWidth(panel?.width ?? 200);
  }

  private renderButtons(): void {
    const buttonsEl = this.getGui().querySelector('.lgr-side-bar-buttons');
    if (!buttonsEl) return;

    buttonsEl.innerHTML = '';
    for (const panel of this.sideBarSvc.getToolPanelDefs()) {
      const button = document.createElement('button');
      button.className = 'lgr-side-bar-button';
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-label', panel.labelDefault ?? panel.labelKey ?? panel.id);
      button.setAttribute('aria-expanded', String(this.openedPanelId === panel.id));
      button.textContent = panel.labelDefault ?? panel.labelKey ?? panel.id;
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
    renderSideBar({
      host: this.getGui().querySelector<HTMLElement>('.lgr-side-bar-buttons') ?? this.getGui(),
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
