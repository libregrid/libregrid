import { BeanStub, type NamedBean, type ISideBarService, type ISideBar, type SideBarDef, type ToolPanelDef, type IToolPanel, type SideBarState, type ComponentSelector, type Component } from 'ag-grid-community';
import { SideBarComponent } from './sideBarComponent';

/**
 * Side bar service — manages the side bar state and tool panels.
 *
 * Registered as `sideBar` (a typed bean in Community's BeanCollection).
 * The grid's side bar UI component delegates to this bean for state management.
 */
export class SideBarService extends BeanStub implements NamedBean, ISideBarService {
  beanName = 'sideBar' as const;

  /** The UI component — set by the side bar component when it initialises. */
  public comp!: ISideBar;

  private def: SideBarDef | undefined;
  private displayed = false;
  private position: 'left' | 'right' = 'right';
  private openedPanelId: string | null = null;
  private panelDefs = new Map<string, ToolPanelDef>();

  public postConstruct(): void {
    this.parseGridOption();
    this.addManagedPropertyListener('sideBar', () => {
      this.parseGridOption();
      this.comp?.refresh();
    });
  }

  public getSelector(): ComponentSelector<Component> {
    return SideBarComponent.getSelector();
  }

  private parseGridOption(): void {
    const option = this.gos.get('sideBar');
    this.position = 'right';
    if (option === undefined || option === null || option === false) {
      this.def = undefined;
      this.displayed = false;
      return;
    }

    if (option === true) {
      this.def = { toolPanels: [] };
      this.displayed = true;
      return;
    }

    if (typeof option === 'string') {
      this.def = { toolPanels: [option] };
      this.displayed = true;
      return;
    }

    if (Array.isArray(option)) {
      this.def = { toolPanels: option };
      this.displayed = true;
      return;
    }

    this.def = option as SideBarDef;
    this.displayed = !this.def.hiddenByDefault;
    this.position = this.def.position ?? 'right';
  }

  // Delegate ISideBar methods to the component

  public refresh(): void {
    this.comp?.refresh();
  }

  public setDisplayed(show: boolean): void {
    this.displayed = show;
    this.comp?.setDisplayed(show);
  }

  public setSideBarPosition(position?: 'left' | 'right'): void {
    this.position = position ?? 'right';
    this.comp?.setSideBarPosition(position);
  }

  public isToolPanelShowing(): boolean {
    return this.openedPanelId !== null;
  }

  public openToolPanel(key: string, source?: 'sideBarButtonClicked' | 'sideBarInitializing' | 'api', parent?: HTMLElement | null): void {
    this.openedPanelId = key;
    this.comp?.openToolPanel(key, source, parent);
  }

  public getToolPanelInstance(key: string): IToolPanel | undefined {
    return this.comp?.getToolPanelInstance(key);
  }

  public close(source?: 'sideBarButtonClicked' | 'sideBarInitializing' | 'api'): void {
    this.openedPanelId = null;
    this.comp?.close(source);
  }

  public openedItem(): string | null {
    return this.openedPanelId;
  }

  public isDisplayed(): boolean {
    return this.displayed;
  }

  public getDef(): SideBarDef | undefined {
    return this.def;
  }

  public getState(): SideBarState {
    return {
      visible: this.displayed,
      position: this.position,
      openToolPanel: this.openedPanelId,
      toolPanels: {},
    };
  }

  public setState(state?: SideBarState): void {
    if (!state) return;
    this.displayed = state.visible;
    this.position = state.position;
    this.openedPanelId = state.openToolPanel;
    this.comp?.setState(state);
  }

  // Public API for tool panel registration

  /** Register a tool panel definition. Called by feature packages. */
  public registerToolPanel(def: ToolPanelDef): void {
    this.panelDefs.set(def.id, def);
  }

  /** Get all registered tool panel definitions. */
  public getToolPanelDefs(): ToolPanelDef[] {
    const configured = (this.def?.toolPanels ?? []).filter(
      (panel): panel is ToolPanelDef => typeof panel !== 'string',
    );
    const panels = new Map(configured.map((panel) => [panel.id, panel]));
    for (const panel of this.panelDefs.values()) {
      panels.set(panel.id, panel);
    }
    return [...panels.values()];
  }

  /** Get the current position. */
  public getPosition(): 'left' | 'right' {
    return this.position;
  }

  /** Get the currently opened panel ID. */
  public getOpenedPanelId(): string | null {
    return this.openedPanelId;
  }
}
