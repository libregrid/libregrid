import type { ColDef, FilterAction, FiltersToolPanelState, GridApi, INewFiltersToolPanel, IFiltersToolPanel, IToolPanelFiltersCompParams, IToolPanelNewFiltersCompParams, IToolPanelParams, NewFiltersToolPanelState } from 'ag-grid-community';

type FilterApi = Partial<Pick<GridApi, 'getColumnDefs' | 'getFilterModel' | 'setFilterModel' | 'onFilterChanged'>>;
type PanelParams = IToolPanelParams & Partial<IToolPanelFiltersCompParams & IToolPanelNewFiltersCompParams> & { api: FilterApi };
type FilterModel = Record<string, unknown>;
type FilterMode = 'simple' | 'selection' | 'combo';

/**
 * The v34 card-based Filters Tool Panel, retaining the legacy panel API.
 *
 * Cards preserve their chosen configuration and their expansion state while
 * global actions operate on an explicit pending model. @feature Filters Tool Panel
 */
export class FiltersToolPanel implements IFiltersToolPanel, INewFiltersToolPanel {
  private readonly gui = document.createElement('section');
  private params: PanelParams | undefined;
  private layout: ColDef[] | undefined;
  private readonly expanded = new Set<string>();
  private readonly modes = new Map<string, FilterMode>();
  private search = '';
  private appliedModel: FilterModel = {};
  private pendingModel: FilterModel = {};

  public constructor() {
    this.gui.className = 'lgr-filters-tool-panel';
    this.gui.setAttribute('aria-label', 'Filters tool panel');
  }

  public init(params: PanelParams): void {
    this.params = params;
    this.appliedModel = { ...(params.api.getFilterModel?.() ?? {}) };
    this.pendingModel = { ...this.appliedModel };
    this.render();
  }

  public getGui(): HTMLElement { return this.gui; }
  public destroy(): void { this.gui.replaceChildren(); }

  public refresh(params: IToolPanelParams): boolean {
    this.params = { ...this.params, ...params } as PanelParams;
    this.appliedModel = { ...(this.params.api.getFilterModel?.() ?? {}) };
    this.pendingModel = { ...this.appliedModel };
    this.render();
    return true;
  }

  public setFilterLayout(colDefs: ColDef[]): void { this.layout = colDefs; this.render(); }
  public syncLayoutWithGrid(): void { if (!this.params?.suppressSyncLayoutWithGrid) this.layout = undefined; this.render(); }
  public expandFilterGroups(groupIds?: string[]): void { this.setExpanded(groupIds, true); }
  public collapseFilterGroups(groupIds?: string[]): void { this.setExpanded(groupIds, false); }
  public expandFilters(colIds?: string[]): void { this.setExpanded(colIds, true); }
  public collapseFilters(colIds?: string[]): void { this.setExpanded(colIds, false); }

  public getState(): FiltersToolPanelState & NewFiltersToolPanelState {
    const ids = this.columnDefs().map((def) => this.id(def));
    return {
      expandedGroupIds: [],
      expandedColIds: ids.filter((id) => this.expanded.has(id)),
      filters: ids.map((colId) => ({ colId, expanded: this.expanded.has(colId) })),
    };
  }

  private render(): void {
    this.gui.replaceChildren();
    const heading = document.createElement('h2');
    heading.textContent = 'Filters';
    this.gui.appendChild(heading);
    if (!this.params?.suppressFilterSearch) this.appendSearch();
    if (!this.params?.suppressExpandAll) this.appendExpansionControls();
    for (const def of this.columnDefs()) this.appendCard(def);
    if (this.params?.buttons?.length) this.appendActions();
  }

  private appendSearch(): void {
    const input = document.createElement('input');
    input.type = 'search'; input.placeholder = 'Search filters'; input.setAttribute('aria-label', 'Search filters'); input.value = this.search;
    input.addEventListener('input', () => { this.search = input.value; this.render(); });
    this.gui.appendChild(input);
  }

  private appendExpansionControls(): void {
    const toolbar = document.createElement('div');
    toolbar.append(this.button('Expand all filters', () => this.expandFilters()), this.button('Collapse all filters', () => this.collapseFilters()));
    this.gui.appendChild(toolbar);
  }

  private appendCard(def: ColDef): void {
    const id = this.id(def);
    const name = def.headerName ?? def.field ?? id;
    if (this.search && !name.toLocaleLowerCase().includes(this.search.toLocaleLowerCase())) return;
    if (def.suppressFiltersToolPanel || !def.filter) return;
    const card = document.createElement('details');
    card.className = 'lgr-filter-card'; card.open = this.expanded.has(id); card.setAttribute('role', 'group'); card.setAttribute('aria-label', `${name} filter`);
    card.addEventListener('toggle', () => {
      if (card.open) this.expanded.add(id);
      else this.expanded.delete(id);
      this.params?.onStateUpdated();
    });
    const summary = document.createElement('summary'); summary.textContent = name; summary.setAttribute('aria-expanded', String(card.open)); card.appendChild(summary);
    card.appendChild(this.createModeSelect(id, name));
    const detail = document.createElement('p'); detail.textContent = this.pendingModel[id] ? 'Filter active' : 'No active filter'; card.appendChild(detail);
    this.gui.appendChild(card);
  }

  private createModeSelect(id: string, name: string): HTMLSelectElement {
    const select = document.createElement('select');
    select.setAttribute('aria-label', `${name} filter type`);
    const mode = this.modes.get(id) ?? this.defaultMode(this.columnDefs().find((def) => this.id(def) === id));
    for (const [value, label] of [['simple', 'Simple'], ['selection', 'Selection'], ['combo', 'Combo']] as const) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; option.selected = value === mode; select.appendChild(option);
    }
    select.addEventListener('change', () => { this.modes.set(id, select.value as FilterMode); this.params?.onStateUpdated(); });
    return select;
  }

  private appendActions(): void {
    const actions = document.createElement('div'); actions.className = 'lgr-filters-tool-panel-actions';
    for (const action of this.params?.buttons ?? []) actions.appendChild(this.button(this.actionLabel(action), () => this.doAction(action)));
    this.gui.appendChild(actions);
  }

  private doAction(action: FilterAction): void {
    if (action === 'clear') this.pendingModel = {};
    if (action === 'reset') this.pendingModel = {};
    if (action === 'cancel') this.pendingModel = { ...this.appliedModel };
    if (action === 'apply') {
      this.params?.api.setFilterModel(Object.keys(this.pendingModel).length ? this.pendingModel : null);
      this.params?.api.onFilterChanged();
      this.appliedModel = { ...this.pendingModel };
    }
    this.render();
  }

  private actionLabel(action: FilterAction): string { return action[0]!.toUpperCase() + action.slice(1); }
  private button(label: string, action: () => void): HTMLButtonElement { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.setAttribute('aria-label', label); button.addEventListener('click', action); return button; }
  private columnDefs(): ColDef[] { return this.layout ?? this.params?.api.getColumnDefs?.() ?? []; }
  private id(def: ColDef): string { return def.colId ?? def.field ?? def.headerName ?? 'column'; }
  private defaultMode(def: ColDef | undefined): FilterMode { return def?.filter === 'agSetColumnFilter' ? 'selection' : def?.filter === 'agMultiColumnFilter' ? 'combo' : 'simple'; }
  private setExpanded(ids: string[] | undefined, expanded: boolean): void {
    for (const id of ids ?? this.columnDefs().map((def) => this.id(def))) {
      if (expanded) this.expanded.add(id);
      else this.expanded.delete(id);
    }
    this.params?.onStateUpdated();
    this.render();
  }
}
