import { BeanStub, type AdvancedFilterModel, type IAdvancedFilterCtrl, type IAdvancedFilterService, type IPinnedSectionCompHost, type NamedBean, type RowNode } from 'ag-grid-community';
import { evaluateAdvancedFilterModel, parseAdvancedFilterExpression, serialiseAdvancedFilterModel, type ColumnKind, type ExpressionColumn } from './expression';
import type { AdvancedFilterExpressionService } from './advancedFilterExpressionService';

type ColumnLike = { getId(): string; getColDef(): { field?: string; cellDataType?: unknown; hide?: boolean; headerName?: string } };
type GridBeans = { colModel?: { getCols(): ColumnLike[] }; valueSvc?: { getValue(column: ColumnLike, node: RowNode, type: string, ignoreAggData?: boolean): unknown }; eventSvc?: { dispatchEvent(event: object): void } };

/**
 * The `advancedFilter` bean consumed by Community's FilterManager.
 * It owns one canonical model; text entry and the builder only project that model.
 */
export class AdvancedFilterService extends BeanStub implements IAdvancedFilterService, NamedBean {
  public beanName = 'advancedFilter' as const;
  private model: AdvancedFilterModel | null = null;
  private valid = true;
  private readonly ctrl: AdvancedFilterController;

  public constructor() { super(); this.ctrl = new AdvancedFilterController(this); }
  public override destroy(): void { this.ctrl.destroy(); super.destroy(); }
  public isEnabled(): boolean { return this.gos.get('enableAdvancedFilter') === true; }
  public isFilterPresent(): boolean { return this.model !== null; }
  public isHeaderActive(): boolean { return this.isEnabled(); }
  public getModel(): AdvancedFilterModel | null { return this.model ? structuredClone(this.model) : null; }
  public setModel(model: AdvancedFilterModel | null): void { this.model = model ? structuredClone(model) : null; this.valid = this.validateModel(this.model); this.ctrl.sync(); }
  public getCtrl(): IAdvancedFilterCtrl { return this.ctrl; }
  public updateValidity(): boolean { const wasValid = this.valid; this.valid = this.validateModel(this.model); return wasValid !== this.valid; }
  public doesFilterPass(node: RowNode): boolean {
    return evaluateAdvancedFilterModel(this.model, (colId) => this.valueFor(node, colId));
  }
  public parse(text: string) { return (this.beans as typeof this.beans & { advFilterExpSvc?: AdvancedFilterExpressionService }).advFilterExpSvc?.parse(text, this.columns()) ?? parseAdvancedFilterExpression(text, this.columns()); }
  public text(): string { return (this.beans as typeof this.beans & { advFilterExpSvc?: AdvancedFilterExpressionService }).advFilterExpSvc?.serialise(this.model) ?? serialiseAdvancedFilterModel(this.model); }
  public applyExpression(text: string): { error?: { message: string; position: number } } {
    const result = this.parse(text);
    if (result.error) return { error: result.error };
    this.setModel(result.model);
    this.filterChanged();
    return {};
  }
  public filterChanged(): void {
    const beans = this.beans as typeof this.beans & { filterManager?: { onFilterChanged(params: { source: 'advancedFilter' }): void } };
    beans.filterManager?.onFilterChanged({ source: 'advancedFilter' });
  }
  public columns(): ExpressionColumn[] {
    const includeHidden = this.gos.get('includeHiddenColumnsInAdvancedFilter') === true;
    const columns = (this.beans as GridBeans).colModel?.getCols() ?? [];
    return columns.filter((column) => includeHidden || column.getColDef().hide !== true).map((column) => ({ id: column.getId(), kind: kindFor(column.getColDef().cellDataType) }));
  }
  public firstColumn(): ExpressionColumn | undefined { return this.columns()[0]; }
  public isBuilderSuppressed(): boolean { return (this.gos.get('advancedFilterParams') as { suppressBuilderButton?: boolean } | undefined)?.suppressBuilderButton === true; }
  public getBuilderParent(): HTMLElement | undefined { const parent = this.gos.get('advancedFilterParent'); return parent instanceof HTMLElement ? parent : undefined; }
  public emitBuilderVisibility(visible: boolean, source: 'api' | 'ui'): void { (this.beans as GridBeans).eventSvc?.dispatchEvent({ type: 'advancedFilterBuilderVisibleChanged', visible, source }); }
  public headerButtons(): readonly string[] { return (this.gos.get('advancedFilterParams') as { buttons?: string[] } | undefined)?.buttons ?? ['apply']; }
  public builderButtons(): readonly string[] { return (this.gos.get('advancedFilterBuilderParams') as { buttons?: string[] } | undefined)?.buttons ?? ['apply', 'cancel']; }
  public builderOptions(): { addSelectWidth?: number; minWidth?: number; pillSelectMaxWidth?: number; pillSelectMinWidth?: number; showMoveButtons?: boolean; suppressFullScreenButton?: boolean } { return (this.gos.get('advancedFilterBuilderParams') as { addSelectWidth?: number; minWidth?: number; pillSelectMaxWidth?: number; pillSelectMinWidth?: number; showMoveButtons?: boolean; suppressFullScreenButton?: boolean } | undefined) ?? {}; }
  private valueFor(node: RowNode, colId: string): unknown {
    const columns = (this.beans as GridBeans).colModel?.getCols() ?? [];
    const column = columns.find((candidate) => candidate.getId() === colId);
    if (!column) return undefined;
    const valueSvc = (this.beans as GridBeans).valueSvc;
    return valueSvc?.getValue(column, node, 'filter', true) ?? (node.data as Record<string, unknown> | undefined)?.[column.getColDef().field ?? colId];
  }
  private validateModel(model: AdvancedFilterModel | null): boolean {
    if (!model) return true;
    const allowed = new Set(this.columns().map((column) => column.id));
    const valid = (item: AdvancedFilterModel): boolean => item.filterType === 'join' ? item.conditions.length > 0 && item.conditions.every(valid) : allowed.has(item.colId);
    return valid(model);
  }
}

class AdvancedFilterController implements IAdvancedFilterCtrl {
  private header: HTMLElement | undefined;
  private host: IPinnedSectionCompHost | undefined;
  private builder: HTMLElement | undefined;
  private staged: AdvancedFilterModel | null = null;
  public constructor(private readonly service: AdvancedFilterService) {}
  public mountTopSectionComp(host: IPinnedSectionCompHost): void { if (!this.service.isEnabled()) return; this.host?.unmountComp(this.header!); this.host = host; this.header = this.createHeader(); host.mountComp(this.header); }
  public focusHeaderComp(): boolean { const input = this.header?.querySelector<HTMLInputElement>('input'); input?.focus(); return !!input; }
  public getHeaderHeight(): number { return 42; }
  public toggleFilterBuilder(params: { source: 'api' | 'ui'; force?: boolean }): void {
    const visible = !!this.builder?.isConnected;
    if (params.force === false || (params.force === undefined && visible)) this.hide(params.source); else this.show(params.source);
  }
  public destroy(): void { if (this.header && this.host) this.host.unmountComp(this.header); this.builder?.remove(); }
  public sync(): void { if (!this.header) return; const input = this.header.querySelector<HTMLInputElement>('input'); if (input && document.activeElement !== input) input.value = this.service.text(); if (this.builder?.isConnected) this.renderBuilder(); }
  private createHeader(): HTMLElement {
    const root = document.createElement('section'); root.className = 'lgr-advanced-filter'; root.setAttribute('aria-label', 'Advanced filter');
    const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'e.g. [country] CONTAINS "United" AND [sales] > 100'; input.value = this.service.text(); input.setAttribute('aria-label', 'Advanced filter expression');
    const suggestions = document.createElement('datalist'); const suggestionId = `lgr-advanced-filter-${Math.random().toString(36).slice(2)}`; suggestions.id = suggestionId; input.setAttribute('list', suggestionId);
    [...this.service.columns().map((column) => `[${column.id}]`), 'AND', 'OR', 'CONTAINS', 'NOT CONTAINS', 'STARTS WITH', 'ENDS WITH', 'IS BLANK'].forEach((value) => { const option = document.createElement('option'); option.value = value; suggestions.append(option); });
    const error = document.createElement('span'); error.className = 'lgr-advanced-filter-error'; error.setAttribute('role', 'status');
    const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = 'Apply';
    const builder = document.createElement('button'); builder.type = 'button'; builder.textContent = 'Builder';
    apply.addEventListener('click', () => { const result = this.service.applyExpression(input.value); error.textContent = result.error ? `${result.error.message} (at ${result.error.position + 1})` : ''; });
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') apply.click(); });
    builder.addEventListener('click', () => this.show('ui'));
    const actions = new Map<string, HTMLButtonElement>([['apply', apply]]);
    for (const action of this.service.headerButtons()) {
      if (action === 'apply') continue;
      const control = button(capitalise(action), () => { if (action === 'clear') { input.value = ''; error.textContent = ''; } else if (action === 'reset') { this.service.setModel(null); this.service.filterChanged(); input.value = ''; } else { input.value = this.service.text(); error.textContent = ''; } }); actions.set(action, control);
    }
    root.append(input, suggestions, ...this.service.headerButtons().map((action) => actions.get(action)!).filter(Boolean), error);
    if (!this.service.isBuilderSuppressed()) root.append(builder);
    return root;
  }
  private show(source: 'api' | 'ui'): void {
    if (this.builder?.isConnected) return;
    this.staged = this.service.getModel();
    this.builder = document.createElement('section'); this.builder.className = 'lgr-advanced-filter-builder'; this.builder.setAttribute('role', 'dialog'); this.builder.setAttribute('aria-label', 'Advanced filter builder');
    const options = this.service.builderOptions(); if (options.minWidth) this.builder.style.minWidth = `${options.minWidth}px`;
    (this.service.getBuilderParent() ?? document.body).append(this.builder);
    this.renderBuilder(); this.emitVisible(true, source);
  }
  private hide(source: 'api' | 'ui'): void { if (!this.builder) return; this.builder.remove(); this.builder = undefined; this.staged = null; this.emitVisible(false, source); }
  private renderBuilder(): void {
    if (!this.builder) return;
    const title = document.createElement('strong'); title.textContent = 'Advanced Filter Builder';
    const pills = document.createElement('div'); pills.className = 'lgr-advanced-filter-pills';
    const conditions = this.staged ? flatten(this.staged) : [];
    conditions.forEach((condition, index) => pills.append(this.pill(condition, index, conditions)));
    const add = document.createElement('button'); add.type = 'button'; add.textContent = 'Add condition'; if (this.service.builderOptions().addSelectWidth) add.style.minWidth = `${this.service.builderOptions().addSelectWidth}px`; add.addEventListener('click', () => {
      const column = this.service.firstColumn(); if (!column) return;
      const condition: AdvancedFilterModel = { filterType: column.kind ?? 'text', colId: column.id, type: column.kind === 'boolean' ? 'true' : 'contains', ...(column.kind === 'boolean' ? {} : { filter: '' }) } as AdvancedFilterModel;
      this.staged = joinLike(this.staged, condition); this.renderBuilder();
    });
    const actions = document.createElement('div'); actions.className = 'lgr-advanced-filter-actions';
    const actionButtons: Record<string, HTMLButtonElement> = {
      apply: button('Apply', () => { this.service.setModel(this.staged); this.service.filterChanged(); this.hide('ui'); }),
      clear: button('Clear', () => { this.staged = null; this.renderBuilder(); }),
      reset: button('Reset', () => { this.staged = null; this.service.setModel(null); this.service.filterChanged(); this.hide('ui'); }),
      cancel: button('Cancel', () => this.hide('ui')),
    };
    if (!this.service.builderOptions().suppressFullScreenButton) actions.append(button('Full screen', () => this.builder?.classList.toggle('lgr-advanced-filter-fullscreen')));
    actions.append(add, ...this.service.builderButtons().map((action) => actionButtons[action]!).filter(Boolean));
    this.builder.replaceChildren(title, pills, actions);
  }
  private pill(condition: AdvancedFilterModel, index: number, all: AdvancedFilterModel[]): HTMLElement {
    const item = document.createElement('div'); item.className = 'lgr-advanced-filter-pill'; item.tabIndex = 0;
    if (condition.filterType === 'join') return item;
    const column = document.createElement('select'); column.setAttribute('aria-label', `Condition ${index + 1} column`);
    this.service.columns().forEach((candidate) => { const option = document.createElement('option'); option.value = candidate.id; option.textContent = candidate.id; option.selected = candidate.id === condition.colId; column.append(option); });
    const operator = document.createElement('select'); operator.setAttribute('aria-label', `Condition ${index + 1} operator`);
    operatorOptions(condition.filterType).forEach((candidate) => { const option = document.createElement('option'); option.value = candidate; option.textContent = operatorLabel(candidate); option.selected = candidate === condition.type; operator.append(option); });
    const value = document.createElement('input'); value.setAttribute('aria-label', `Condition ${index + 1} value`); value.value = 'filter' in condition && condition.filter != null ? String(condition.filter) : ''; value.disabled = condition.type === 'blank' || condition.type === 'notBlank' || condition.filterType === 'boolean';
    const settings = this.service.builderOptions(); for (const select of [column, operator]) { if (settings.pillSelectMinWidth) select.style.minWidth = `${settings.pillSelectMinWidth}px`; if (settings.pillSelectMaxWidth) select.style.maxWidth = `${settings.pillSelectMaxWidth}px`; }
    const update = () => { const selected = this.service.columns().find((candidate) => candidate.id === column.value) ?? this.service.firstColumn(); if (!selected) return; const available = operatorOptions(selected.kind ?? 'text'); const type = available.includes(operator.value) ? operator.value : available[0]!; const next = { ...condition, filterType: selected.kind ?? 'text', colId: selected.id, type, ...(value.disabled ? {} : { filter: selected.kind === 'number' ? Number(value.value) : value.value }) } as AdvancedFilterModel; this.replace(index, next); };
    column.addEventListener('change', update); operator.addEventListener('change', () => { value.disabled = operator.value === 'blank' || operator.value === 'notBlank'; update(); }); value.addEventListener('change', update);
    const remove = button('Remove', () => { const copy = all.filter((_, current) => current !== index); this.staged = copy.length === 0 ? null : copy.length === 1 ? copy[0]! : { filterType: 'join', type: 'AND', conditions: copy }; this.renderBuilder(); });
    item.append(column, operator, value);
    if (this.service.builderOptions().showMoveButtons) { item.append(button('Move up', () => this.move(index, -1)), button('Move down', () => this.move(index, 1))); }
    item.append(remove); return item;
  }
  private replace(index: number, condition: AdvancedFilterModel): void { const all = this.staged ? flatten(this.staged) : []; all[index] = condition; this.staged = all.length === 1 ? all[0]! : { filterType: 'join', type: 'AND', conditions: all }; this.renderBuilder(); }
  private move(index: number, delta: number): void { const all = this.staged ? flatten(this.staged) : []; const next = index + delta; if (next < 0 || next >= all.length) return; [all[index], all[next]] = [all[next]!, all[index]!]; this.staged = all.length === 1 ? all[0]! : { filterType: 'join', type: 'AND', conditions: all }; this.renderBuilder(); }
  private emitVisible(visible: boolean, source: 'api' | 'ui'): void { this.service.emitBuilderVisibility(visible, source); }
}

function button(label: string, handler: () => void): HTMLButtonElement { const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.addEventListener('click', handler); return element; }
function flatten(model: AdvancedFilterModel): AdvancedFilterModel[] { return model.filterType === 'join' && model.type === 'AND' ? model.conditions : [model]; }
function joinLike(before: AdvancedFilterModel | null, condition: AdvancedFilterModel): AdvancedFilterModel { return !before ? condition : before.filterType === 'join' && before.type === 'AND' ? { ...before, conditions: [...before.conditions, condition] } : { filterType: 'join', type: 'AND', conditions: [before, condition] }; }
function kindFor(value: unknown): ColumnKind { return value === 'number' || value === 'boolean' || value === 'date' || value === 'dateString' || value === 'dateTime' || value === 'dateTimeString' || value === 'bigint' || value === 'object' ? value : 'text'; }
function operatorOptions(kind: ColumnKind): string[] { return kind === 'boolean' ? ['true', 'false'] : kind === 'number' || kind === 'date' || kind === 'dateString' || kind === 'dateTime' || kind === 'dateTimeString' || kind === 'bigint' ? ['equals', 'notEqual', 'lessThan', 'lessThanOrEqual', 'greaterThan', 'greaterThanOrEqual', 'blank', 'notBlank'] : ['equals', 'notEqual', 'contains', 'notContains', 'startsWith', 'endsWith', 'blank', 'notBlank']; }
function operatorLabel(value: string): string { return ({ equals: '=', notEqual: '≠', lessThan: '<', lessThanOrEqual: '≤', greaterThan: '>', greaterThanOrEqual: '≥', contains: 'contains', notContains: 'does not contain', startsWith: 'starts with', endsWith: 'ends with', blank: 'is blank', notBlank: 'is not blank', true: 'is true', false: 'is false' } as Record<string, string>)[value] ?? value; }
function capitalise(value: string): string { return value.length ? value[0]!.toUpperCase() + value.slice(1) : value; }
