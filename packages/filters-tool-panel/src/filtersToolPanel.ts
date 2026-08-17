import type {
  ColDef,
  FilterAction,
  FiltersToolPanelState,
  GridApi,
  INewFiltersToolPanel,
  IFiltersToolPanel,
  IToolPanelFiltersCompParams,
  IToolPanelNewFiltersCompParams,
  IToolPanelParams,
  NewFiltersToolPanelState,
  SelectableFilterDef,
  SelectableFilterParams,
} from 'ag-grid-community';
import { iconSvg } from '@libregrid/core';
import { SelectableFilter, type SelectableFilterModel } from './selectableFilter';

type FilterApi = Partial<
  Pick<
    GridApi,
    | 'getColumnDefs'
    | 'getFilterModel'
    | 'setFilterModel'
    | 'onFilterChanged'
    | 'addEventListener'
    | 'removeEventListener'
    | 'getColumn'
  >
> & {
  getValue?: (colKey: string, node: unknown) => unknown;
};
type PanelParams = IToolPanelParams &
  Partial<IToolPanelFiltersCompParams & IToolPanelNewFiltersCompParams> & { api: FilterApi };
type GridEventName = 'newColumnsLoaded' | 'columnEverythingChanged' | 'filterChanged';

/** The UI component the grid returns from getColumnFilterInstance. */
interface FilterInstance {
  getGui(): HTMLElement;
  setModel?(model: unknown): void | { then(resolve: () => void): unknown };
  destroy?(): void;
}

let panelUid = 0;

/** Convert a camelCase field name to the grid's default header label. */
function camelCaseToHuman(value: string): string {
  const words = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z])([a-z])/g, '$1 $2$3')
    .replace(/\./g, ' ')
    .split(' ');
  return words
    .map((word) => word.substring(0, 1).toUpperCase() + (word.length > 1 ? word.substring(1) : ''))
    .join(' ');
}

/**
 * The v34+ card-based New Filters Tool Panel.
 *
 * Unlike the legacy panel it does not pre-list every filterable column.
 * The panel opens empty; an Add Filter type-ahead at the foot of the card
 * list offers the remaining filterable columns, and picking one drops in a
 * card. Cards render the column's real filter UI (community text/number/multi
 * filters through getColumnFilterInstance, LibreGrid's Set Filter directly),
 * float in a scrollable container above the type-ahead, and a pinned
 * Cancel/Apply row sits at the bottom of the panel.
 *
 * The legacy IFiltersToolPanel surface is retained as a compatibility
 * layer: expansion APIs target the cards that are currently present and
 * setFilterLayout feeds the type-ahead's column list.
 * @feature Filters Tool Panel
 */
export class FiltersToolPanel implements IFiltersToolPanel, INewFiltersToolPanel {
  private readonly gui = document.createElement('div');
  private readonly uid = ++panelUid;
  private params: PanelParams | undefined;
  private layout: ColDef[] | undefined;
  /** Columns with a card, in the order they were added. */
  private cardIds: string[] = [];
  private readonly expanded = new Set<string>();
  private addOpen = false;
  private addSearch = '';
  private addActive = 0;
  private activeIds: Set<string> = new Set();
  private readonly filterInstances = new Map<string, FilterInstance>();
  private readonly eventListeners = new Map<GridEventName, () => void>();

  public constructor() {
    this.gui.className = 'lgr-filter-panel';
    this.gui.setAttribute('aria-label', 'Filters tool panel');
  }

  public init(params: PanelParams): void {
    this.removeApiListeners();
    this.params = params;
    this.syncActiveIds();
    this.applyInitialState();
    this.addApiListeners();
    this.render();
    // The panel can be created before the host has bound the grid's column
    // defs (Angular inputs land after grid creation). If nothing rendered,
    // repaint once the columns are in — events cover later changes.
    if (this.columnDefs().length === 0 && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.render());
    }
  }

  public getGui(): HTMLElement {
    return this.gui;
  }

  public destroy(): void {
    this.removeApiListeners();
    for (const filter of this.filterInstances.values()) filter.destroy?.();
    this.filterInstances.clear();
    this.gui.replaceChildren();
  }

  public refresh(params: IToolPanelParams): boolean {
    this.params = { ...this.params, ...params } as PanelParams;
    for (const filter of this.filterInstances.values()) filter.destroy?.();
    this.filterInstances.clear();
    this.syncActiveIds();
    this.render();
    return true;
  }

  public setFilterLayout(colDefs: ColDef[]): void {
    this.layout = colDefs;
    this.render();
  }
  public syncLayoutWithGrid(): void {
    if (!this.params?.suppressSyncLayoutWithGrid) this.layout = undefined;
    this.render();
  }
  public expandFilterGroups(groupIds?: string[]): void {
    this.setExpanded(groupIds, true);
  }
  public collapseFilterGroups(groupIds?: string[]): void {
    this.setExpanded(groupIds, false);
  }
  public expandFilters(colIds?: string[]): void {
    this.setExpanded(colIds, true);
  }
  public collapseFilters(colIds?: string[]): void {
    this.setExpanded(colIds, false);
  }

  public getState(): FiltersToolPanelState & NewFiltersToolPanelState {
    return {
      expandedGroupIds: [],
      expandedColIds: this.cardIds.filter((id) => this.expanded.has(id)),
      filters: this.cardIds.map((colId) => ({ colId, expanded: this.expanded.has(colId) })),
    };
  }

  private render(): void {
    this.gui.replaceChildren();
    const container = document.createElement('div');
    container.className = 'lgr-filter-panel-container';
    for (const id of this.cardIds) {
      const def = this.resolveDef(id);
      if (def) this.appendCard(def, container);
    }
    this.appendAddFilter(container);
    this.gui.appendChild(container);
    this.appendButtons();
  }

  private appendCard(def: ColDef, container: HTMLElement): void {
    const id = this.id(def);
    const name = this.title(def);
    const active = this.activeIds.has(id);
    const expanded = this.expanded.has(id);
    const bodyId = 'lgr-filter-' + this.uid + '-' + id + '-body';

    const card = document.createElement('div');
    card.className = 'lgr-filter-card';
    card.dataset['filterId'] = id;
    card.classList.toggle('lgr-filter-card-expanded', expanded);
    card.classList.toggle('lgr-filter-card-active', active);

    // Header: an expand button (title + chevron) and an icon-only delete.
    const header = document.createElement('div');
    header.className = 'lgr-filter-card-header';
    header.setAttribute('role', 'presentation');
    const heading = document.createElement('div');
    heading.className = 'lgr-filter-card-heading';
    heading.setAttribute('role', 'heading');
    heading.setAttribute('aria-level', '2');
    const expand = document.createElement('button');
    expand.type = 'button';
    expand.className = 'lgr-filter-card-expand';
    expand.setAttribute('aria-expanded', String(expanded));
    expand.setAttribute('aria-controls', bodyId);
    const title = document.createElement('span');
    title.className = 'lgr-filter-card-title';
    const dot = document.createElement('span');
    dot.className = 'lgr-filter-card-active-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.hidden = !active;
    title.appendChild(dot);
    title.append(document.createTextNode(name));
    const chevron = document.createElement('span');
    chevron.className = 'lgr-filter-card-expand-icon';
    chevron.innerHTML = iconSvg(expanded ? 'filterCardCollapse' : 'filterCardExpand') ?? '';
    expand.append(title, chevron);
    expand.addEventListener('click', () => this.toggleExpanded(id));
    heading.appendChild(expand);
    const remove = this.createIconButton('Delete ' + name + ' filter', () => this.deleteFilter(id));
    remove.classList.add('lgr-filter-card-delete');
    header.append(heading, remove);
    card.appendChild(header);

    // Body carries the real filter UI; it stays in the DOM when collapsed.
    const body = document.createElement('div');
    body.className = 'lgr-filter-card-body';
    body.id = bodyId;
    body.hidden = !expanded;
    if (expanded) {
      const host = document.createElement('div');
      host.className = 'lgr-filter-card-filter';
      body.appendChild(host);
      this.attachFilter(id, def, host);
    }
    card.appendChild(body);
    container.appendChild(card);
  }

  /**
   * Mount the column's real filter component into the card body. Instances
   * are created once and cached; re-renders re-attach the same GUI so filter
   * state (search text, selections) survives.
   */
  private attachFilter(id: string, def: ColDef, host: HTMLElement): void {
    const existing = this.filterInstances.get(id);
    if (existing) {
      host.appendChild(existing.getGui());
      return;
    }
    this.attachSelectableFilter(id, def, host);
  }

  /**
   * Every filterable column renders one card version: the selectable filter
   * with a Simple Filter / Selection Filter mode selector, defaulting to
   * Simple Filter. Its model (active mode + inner model) is committed through
   * the grid's filter manager.
   */
  private attachSelectableFilter(id: string, def: ColDef, host: HTMLElement): void {
    const api = this.params?.api;
    const column = api?.getColumn?.(id);
    if (!api || !column) return;
    const filter = new SelectableFilter();
    filter.init({
      api: api as never,
      colDef: column.getColDef(),
      column,
      getValue: (node: unknown) => api.getValue?.(id, node) as never,
      filterChangedCallback: () => {
        const model = filter.getModel();
        this.applyGridModel(id, model);
      },
      filters: this.selectableDefs(def),
      defaultFilterIndex: 0,
    } as never);
    this.filterInstances.set(id, {
      getGui: () => filter.getGui(),
      setModel: (model) => filter.setModel(model as SelectableFilterModel | null),
      destroy: () => filter.destroy(),
    });
    host.appendChild(filter.getGui());
  }

  /** The card's two-mode filter definitions for a column. */
  private selectableDefs(def: ColDef): SelectableFilterDef[] {
    const configured = (def.filterParams as SelectableFilterParams | undefined)?.filters;
    if (configured?.length) return configured;
    return [
      { name: 'Simple Filter', filter: 'agTextColumnFilter' },
      {
        name: 'Selection Filter',
        filter: 'agSetColumnFilter',
        filterParams: def.filterParams as Record<string, unknown>,
      },
    ];
  }

  /** Merge one column's model into the grid and re-apply the filter. */
  private applyGridModel(id: string, model: unknown): void {
    const api = this.params?.api;
    const current = { ...(api?.getFilterModel?.() ?? {}) };
    if (model === null || model === undefined) delete current[id];
    else current[id] = model;
    api?.setFilterModel?.(current);
    api?.onFilterChanged?.();
  }

  private deleteFilter(id: string): void {
    const api = this.params?.api;
    const current = { ...(api?.getFilterModel?.() ?? {}) };
    delete current[id];
    api?.setFilterModel?.(current);
    api?.onFilterChanged?.();
    // Reset the cached instance so its UI matches the cleared model, and
    // drop the card itself.
    this.filterInstances.get(id)?.setModel?.(null as never);
    this.cardIds = this.cardIds.filter((colId) => colId !== id);
    this.expanded.delete(id);
    this.syncActiveIds();
    this.render();
  }

  private toggleExpanded(id: string): void {
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
    this.params?.onStateUpdated();
    this.render();
  }

  // --- Add Filter type-ahead --------------------------------------------

  private appendAddFilter(container: HTMLElement): void {
    const card = document.createElement('div');
    card.className = 'lgr-filter-card lgr-filter-card-add';
    if (this.addOpen) {
      this.appendAddSelect(card);
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lgr-filter-add-button';
      const icon = document.createElement('span');
      icon.className = 'lgr-filter-add-button-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = iconSvg('filterAdd') ?? '';
      const label = document.createElement('span');
      label.className = 'lgr-filter-add-button-label';
      label.textContent = 'Add Filter';
      button.append(icon, label);
      button.addEventListener('click', () => this.openAdd());
      card.appendChild(button);
    }
    container.appendChild(card);
  }

  private openAdd(): void {
    this.addOpen = true;
    this.addSearch = '';
    this.addActive = 0;
    this.render();
    this.gui.querySelector<HTMLInputElement>('.lgr-filter-add-input')?.focus();
  }

  private closeAdd(): void {
    this.addOpen = false;
    this.addSearch = '';
    this.addActive = 0;
    this.render();
  }

  private appendAddSelect(card: HTMLElement): void {
    const columns = this.filteredAddColumns();
    const select = document.createElement('div');
    select.className = 'lgr-filter-add-select';

    const search = document.createElement('div');
    search.className = 'lgr-search';
    const icon = document.createElement('span');
    icon.className = 'lgr-search-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = iconSvg('search') ?? '';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'lgr-input lgr-filter-add-input';
    input.placeholder = 'Search...';
    input.setAttribute('aria-label', 'Search filter columns');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', this.addListId());
    input.value = this.addSearch;
    input.addEventListener('input', () => this.onAddSearch(input));
    input.addEventListener('keydown', (event) => this.onAddKeydown(event));
    search.append(icon, input);
    select.appendChild(search);

    const list = document.createElement('div');
    list.className = 'lgr-filter-add-list';
    list.id = this.addListId();
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Filter columns');
    if (columns.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lgr-filter-add-empty';
      empty.textContent = this.addSearch ? 'No matching columns' : 'No filterable columns';
      list.appendChild(empty);
    }
    columns.forEach((def, index) => {
      const option = document.createElement('div');
      option.className = 'lgr-filter-add-option';
      option.classList.toggle('lgr-filter-add-active', index === this.addActive);
      option.id = this.addOptionId(index);
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(index === this.addActive));
      option.textContent = this.title(def);
      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        this.addColumn(this.id(def));
      });
      list.appendChild(option);
    });
    if (this.addActive >= 0 && columns[this.addActive]) {
      input.setAttribute('aria-activedescendant', this.addOptionId(this.addActive));
    }
    select.append(search, list);
    card.appendChild(select);
  }

  private onAddSearch(input: HTMLInputElement): void {
    const caret = input.selectionStart;
    this.addSearch = input.value;
    this.addActive = 0;
    this.render();
    const next = this.gui.querySelector<HTMLInputElement>('.lgr-filter-add-input');
    next?.focus();
    if (caret !== null) next?.setSelectionRange(caret, caret);
  }

  private onAddKeydown(event: KeyboardEvent): void {
    const columns = this.filteredAddColumns();
    if (event.key === 'ArrowDown') {
      this.addActive = Math.min(columns.length - 1, this.addActive + 1);
      event.preventDefault();
      this.render();
      this.refocusAddInput();
      this.revealAddActive();
    } else if (event.key === 'ArrowUp') {
      this.addActive = Math.max(0, this.addActive - 1);
      event.preventDefault();
      this.render();
      this.refocusAddInput();
      this.revealAddActive();
    } else if (event.key === 'Enter') {
      const column = columns[this.addActive];
      if (column) this.addColumn(this.id(column));
      event.preventDefault();
    } else if (event.key === 'Escape') {
      this.closeAdd();
      event.preventDefault();
    }
  }

  private refocusAddInput(): void {
    this.gui.querySelector<HTMLInputElement>('.lgr-filter-add-input')?.focus();
  }

  private revealAddActive(): void {
    this.gui
      .querySelector<HTMLElement>('.lgr-filter-add-option.lgr-filter-add-active')
      ?.scrollIntoView({ block: 'nearest' });
  }

  private addColumn(id: string): void {
    if (this.cardIds.includes(id)) {
      this.closeAdd();
      return;
    }
    this.cardIds.push(id);
    this.expanded.add(id);
    this.addOpen = false;
    this.addSearch = '';
    this.addActive = 0;
    this.params?.onStateUpdated();
    this.render();
  }

  private addListId(): string {
    return 'lgr-filter-add-list-' + this.uid;
  }
  private addOptionId(index: number): string {
    return 'lgr-filter-add-option-' + this.uid + '-' + index;
  }

  private filteredAddColumns(): ColDef[] {
    const available = this.availableColumns();
    const term = this.addSearch.trim().toLocaleLowerCase();
    if (!term) return available;
    return available.filter((def) => this.title(def).toLocaleLowerCase().includes(term));
  }

  private availableColumns(): ColDef[] {
    const added = new Set(this.cardIds);
    return this.columnDefs().filter((def) => {
      if (def.suppressFiltersToolPanel || !def.filter) return false;
      return !added.has(this.id(def));
    });
  }

  // --- Bottom buttons ----------------------------------------------------

  private appendButtons(): void {
    const actions = this.actions();
    if (!actions.length) return;
    const buttons = document.createElement('div');
    buttons.className = 'lgr-filter-panel-buttons';
    for (const action of actions) {
      const button = this.button(this.actionLabel(action), () => this.doAction(action));
      button.classList.add('lgr-filter-panel-buttons-button');
      if (action === 'apply') {
        button.classList.add('lgr-filter-panel-buttons-apply-button');
        button.disabled = this.cardIds.length === 0;
      }
      buttons.appendChild(button);
    }
    this.gui.appendChild(buttons);
  }

  private actions(): FilterAction[] {
    return this.params?.buttons ?? ['cancel', 'apply'];
  }

  private doAction(action: FilterAction): void {
    const api = this.params?.api;
    if (action === 'clear' || action === 'reset') {
      api?.setFilterModel?.(null);
      api?.onFilterChanged?.();
      for (const filter of this.filterInstances.values()) filter.setModel?.(null as never);
    }
    if (action === 'apply') {
      api?.onFilterChanged?.();
    }
    if (action === 'cancel') {
      // Re-sync every embedded filter with the applied grid model.
      const model = api?.getFilterModel?.() ?? {};
      for (const [id, filter] of this.filterInstances) {
        filter.setModel?.((model[id] as never) ?? null);
      }
    }
    this.syncActiveIds();
    this.render();
  }

  private actionLabel(action: FilterAction): string {
    return action[0]!.toUpperCase() + action.slice(1);
  }

  private button(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lgr-button';
    button.textContent = label;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', action);
    return button;
  }

  private createIconButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lgr-icon-button';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = iconSvg('close') ?? '';
    button.addEventListener('click', onClick);
    return button;
  }

  // --- Column resolution -------------------------------------------------

  private columnDefs(): ColDef[] {
    return this.layout ?? this.params?.api.getColumnDefs?.() ?? [];
  }
  private resolveDef(id: string): ColDef | undefined {
    return this.columnDefs().find((def) => this.id(def) === id);
  }
  private id(def: ColDef): string {
    return def.colId ?? def.field ?? def.headerName ?? 'column';
  }
  /** Column display name — mirrors the grid header (camelCase fields become "Some Field"). */
  private title(def: ColDef): string {
    if (typeof def.headerName === 'string' && def.headerName !== '') return def.headerName;
    if (def.field) return camelCaseToHuman(def.field);
    return this.id(def);
  }
  private syncActiveIds(): void {
    this.activeIds = new Set(Object.keys(this.params?.api.getFilterModel?.() ?? {}));
  }

  /** Reflect the applied model in card titles without rebuilding the DOM. */
  private updateCardActiveStates(): void {
    for (const card of this.gui.querySelectorAll<HTMLElement>(
      '.lgr-filter-card:not(.lgr-filter-card-add)',
    )) {
      const id = card.dataset['filterId'];
      const active = id !== undefined && this.activeIds.has(id);
      card.classList.toggle('lgr-filter-card-active', active);
      const dot = card.querySelector<HTMLElement>('.lgr-filter-card-active-dot');
      if (dot) dot.hidden = !active;
    }
  }

  private applyInitialState(): void {
    const state = this.params?.initialState as NewFiltersToolPanelState | undefined;
    if (!state?.filters?.length) return;
    this.cardIds = [];
    this.expanded.clear();
    for (const entry of state.filters) {
      const id = entry.colId;
      if (this.cardIds.includes(id) || !this.resolveDef(id)) continue;
      this.cardIds.push(id);
      if (entry.expanded) this.expanded.add(id);
    }
  }

  private setExpanded(ids: string[] | undefined, expanded: boolean): void {
    const targets = ids ?? [...this.cardIds];
    for (const id of targets) {
      if (!this.cardIds.includes(id)) continue;
      if (expanded) this.expanded.add(id);
      else this.expanded.delete(id);
    }
    this.params?.onStateUpdated();
    this.render();
  }

  private addApiListeners(): void {
    const api = this.params?.api;
    if (!api?.addEventListener) return;
    for (const event of ['newColumnsLoaded', 'columnEverythingChanged'] as const) {
      const listener = () => this.render();
      api.addEventListener(event, listener as never);
      this.eventListeners.set(event, listener);
    }
    const onFilterChanged = () => {
      this.syncActiveIds();
      this.updateCardActiveStates();
    };
    api.addEventListener('filterChanged', onFilterChanged as never);
    this.eventListeners.set('filterChanged', onFilterChanged);
  }

  private removeApiListeners(): void {
    const api = this.params?.api;
    if (!api?.removeEventListener) return;
    for (const [event, listener] of this.eventListeners)
      api.removeEventListener(event, listener as never);
    this.eventListeners.clear();
  }
}
