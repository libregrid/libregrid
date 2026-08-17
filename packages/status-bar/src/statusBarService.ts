import {
  BeanStub,
  type IStatusPanelParams,
  type NamedBean,
  type StatusPanelDef,
} from 'ag-grid-community';
import {
  AggregationPanel,
  FilteredRowCountPanel,
  SelectedRowCountPanel,
  TotalAndFilteredRowCountPanel,
  TotalRowCountPanel,
} from './statusPanels';
import type { StatusBarComponent } from './statusBarComponent';

type StatusPanel = {
  agInit?(params: IStatusPanelParams): void;
  refresh?(params: IStatusPanelParams): boolean | void;
  getGui?(): HTMLElement;
  visible?(): boolean;
  destroy?(): void;
};

export interface StatusPanelEntry {
  key: string;
  def: StatusPanelDef;
  panel: StatusPanel;
  align: 'left' | 'center' | 'right';
}

/**
 * Creates, refreshes, renders, and exposes configured provided or custom
 * status panels. @feature Status Bar
 */
export class StatusBarService extends BeanStub implements NamedBean {
  public beanName = 'statusBarSvc' as const;

  /** The UI shell component — set by the status bar component. */
  public comp!: StatusBarComponent;

  private entries: StatusPanelEntry[] = [];

  public postConstruct(): void {
    this.configure(this.readConfig());
    this.addManagedPropertyListener('statusBar', () => {
      this.configure(this.readConfig());
    });
    this.addManagedEventListeners({
      modelUpdated: () => this.refresh(),
      filterChanged: () => this.refresh(),
      selectionChanged: () => this.refresh(),
      rangeSelectionChanged: () => this.refresh(),
      cellValueChanged: () => this.refresh(),
    });
  }

  public getEntries(): StatusPanelEntry[] {
    return this.entries;
  }

  public getStatusPanel<T>(key: string): T | undefined {
    return this.entries.find((entry) => entry.key === key)?.panel as T | undefined;
  }

  public refresh(): void {
    for (const entry of this.entries) {
      const result = entry.panel.refresh?.(this.params(entry.key));
      // Per the IStatusPanel contract: absent or false refresh means the grid
      // destroys and recreates the panel with the same definition.
      if (result === false || result === undefined) {
        const previous = this.entries.indexOf(entry);
        if (previous < 0) continue;
        entry.panel.destroy?.();
        const replacement = this.createFromDef(entry.def);
        if (!replacement) {
          this.entries.splice(previous, 1);
          continue;
        }
        replacement.agInit?.(this.mergedParams(entry.def));
        this.entries[previous] = { ...entry, panel: replacement };
      }
    }
    this.comp?.refresh();
  }

  public override destroy(): void {
    this.destroyEntries();
    super.destroy();
  }

  private readConfig(): { statusPanels?: StatusPanelDef[] } | undefined {
    return this.gos.get('statusBar') as { statusPanels?: StatusPanelDef[] } | undefined;
  }

  private configure(config: { statusPanels?: StatusPanelDef[] } | undefined): void {
    this.destroyEntries();
    this.entries = [];
    for (const def of config?.statusPanels ?? []) {
      const panel = this.createFromDef(def);
      if (!panel) continue;
      panel.agInit?.(this.mergedParams(def));
      const align = def.align === 'left' || def.align === 'center' ? def.align : 'right';
      this.entries.push({ key: this.keyOf(def), def, panel, align });
    }
    this.comp?.refresh();
  }

  private createFromDef(def: StatusPanelDef): StatusPanel | undefined {
    const provided: Record<string, new () => StatusPanel> = {
      agTotalRowCountComponent: TotalRowCountPanel,
      agTotalAndFilteredRowCountComponent: TotalAndFilteredRowCountPanel,
      agFilteredRowCountComponent: FilteredRowCountPanel,
      agSelectedRowCountComponent: SelectedRowCountPanel,
      agAggregationComponent: AggregationPanel,
    };
    const Type = typeof def.statusPanel === 'string' ? provided[def.statusPanel] : def.statusPanel;
    return typeof Type === 'function' ? new (Type as new () => StatusPanel)() : undefined;
  }

  private keyOf(def: StatusPanelDef): string {
    return def.key ?? 'status-' + this.entries.length;
  }

  private params(key: string): IStatusPanelParams {
    return { api: this.beans.gridApi as never, context: this.gos.get('context'), key };
  }

  private mergedParams(def: StatusPanelDef): IStatusPanelParams {
    return {
      ...this.params(this.keyOf(def)),
      ...(def.statusPanelParams ?? {}),
    } as IStatusPanelParams;
  }

  private destroyEntries(): void {
    for (const entry of this.entries) {
      entry.panel.destroy?.();
    }
    this.entries = [];
  }
}
