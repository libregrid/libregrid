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

type StatusPanel = {
  agInit?(params: IStatusPanelParams): void;
  refresh?(params: IStatusPanelParams): boolean | void;
  destroy?(): void;
};
type StatusBarConfig = { statusPanels?: StatusPanelDef[] };

/** Creates, refreshes, and exposes configured provided or custom status panels. @feature Status Bar */
export class StatusBarService extends BeanStub implements NamedBean {
  public beanName = 'statusBarSvc' as const;
  private readonly panels = new Map<string, StatusPanel>();

  public postConstruct(): void {
    this.configure((this.gos.get('statusBar') as StatusBarConfig | undefined)?.statusPanels ?? []);
    this.addManagedEventListeners({
      modelUpdated: () => this.refresh(),
      filterChanged: () => this.refresh(),
      selectionChanged: () => this.refresh(),
      rangeSelectionChanged: () => this.refresh(),
      cellValueChanged: () => this.refresh(),
    });
  }
  public register(key: string, panel: StatusPanel): void {
    this.panels.get(key)?.destroy?.();
    this.panels.set(key, panel);
  }
  public getStatusPanel<T>(key: string): T | undefined {
    return this.panels.get(key) as T | undefined;
  }
  public refresh(): void {
    this.panels.forEach((panel, key) => panel.refresh?.(this.params(key)));
  }
  public override destroy(): void {
    this.panels.forEach((panel) => panel.destroy?.());
    this.panels.clear();
    super.destroy();
  }

  private configure(definitions: StatusPanelDef[]): void {
    definitions.forEach((definition, index) => {
      const key = definition.key ?? `status-${index}`;
      const panel = this.create(definition.statusPanel);
      if (!panel) return;
      const params = {
        ...this.params(key),
        ...(definition.statusPanelParams ?? {}),
      } as IStatusPanelParams;
      panel.agInit?.(params);
      this.register(key, panel);
    });
  }
  private create(component: unknown): StatusPanel | undefined {
    const provided: Record<string, new () => StatusPanel> = {
      agTotalRowCountComponent: TotalRowCountPanel,
      agTotalAndFilteredRowCountComponent: TotalAndFilteredRowCountPanel,
      agFilteredRowCountComponent: FilteredRowCountPanel,
      agSelectedRowCountComponent: SelectedRowCountPanel,
      agAggregationComponent: AggregationPanel,
    };
    const Type = typeof component === 'string' ? provided[component] : component;
    return typeof Type === 'function' ? new (Type as new () => StatusPanel)() : undefined;
  }
  private params(key: string): IStatusPanelParams {
    return { api: this.beans.gridApi as never, context: this.gos.get('context'), key };
  }
}
