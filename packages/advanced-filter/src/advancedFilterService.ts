import { BeanStub, type AdvancedFilterModel, type IAdvancedFilterCtrl, type IAdvancedFilterService, type IPinnedSectionCompHost, type NamedBean, type RowNode } from 'ag-grid-community';
import { evaluateAdvancedFilterModel, parseAdvancedFilterExpression, serialiseAdvancedFilterModel, type ColumnKind, type ExpressionColumn } from './expression';
import type { AdvancedFilterExpressionService } from './advancedFilterExpressionService';
import { AdvancedFilterBuilder, type AdvancedFilterBuilderOptions } from './advancedFilterBuilder';

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
  public builderButtons(): readonly string[] { return (this.gos.get('advancedFilterBuilderParams') as { buttons?: string[] } | undefined)?.buttons ?? ['cancel', 'apply']; }
  public builderOptions(): AdvancedFilterBuilderOptions { return (this.gos.get('advancedFilterBuilderParams') as AdvancedFilterBuilderOptions | undefined) ?? {}; }
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
  private spacer: HTMLElement | undefined;
  private host: IPinnedSectionCompHost | undefined;
  private builder: AdvancedFilterBuilder | undefined;
  public constructor(private readonly service: AdvancedFilterService) {}
  public mountTopSectionComp(host: IPinnedSectionCompHost): void {
    if (!this.service.isEnabled()) return;
    this.header?.remove();
    if (this.host && this.spacer) this.host.unmountComp(this.spacer);
    this.host = host;
    this.header = this.createHeader();
    // Community mounts the panel into the pinned-top section INSIDE the
    // grid's role=grid viewport, where axe's aria-required-children rejects
    // any non-row content. Reserve the layout space with an invisible spacer
    // and render the panel itself into the grid root, positioned over that
    // space — outside the role=grid element.
    const spacer = document.createElement('div');
    spacer.className = 'lgr-advanced-filter-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.height = `${this.getHeaderHeight()}px`;
    this.spacer = spacer;
    host.mountComp(spacer);
    // `mountComp` attaches on the next render turn. Keep a harmless fallback
    // for synchronous harnesses, then move the header into its own grid root
    // before the browser paints. Calculating `closest()` immediately used to
    // miss that root and position every advanced-filter header at page (0, 0).
    document.body.append(this.header);
    const attachHeader = (): void => {
      const header = this.header;
      const root = spacer.closest<HTMLElement>('.ag-root-wrapper');
      if (!header || !root || !spacer.isConnected) return;
      root.append(header);
      const spacerTop = spacer.getBoundingClientRect().top;
      const rootTop = root.getBoundingClientRect().top;
      Object.assign(header.style, {
        position: 'absolute',
        top: `${spacerTop - rootTop}px`,
        left: '0',
        right: '0',
        zIndex: '3',
      });
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(attachHeader);
    else queueMicrotask(attachHeader);
  }
  public focusHeaderComp(): boolean { const input = this.header?.querySelector<HTMLInputElement>('input'); input?.focus(); return !!input; }
  public getHeaderHeight(): number { return 42; }
  public toggleFilterBuilder(params: { source: 'api' | 'ui'; force?: boolean }): void {
    const visible = !!this.builder?.getGui().isConnected;
    if (params.force === false || (params.force === undefined && visible)) this.hide(params.source); else this.show(params.source);
  }
  public destroy(): void { if (this.host && this.spacer) this.host.unmountComp(this.spacer); this.header?.remove(); this.builder?.destroy(); }
  public sync(): void { if (!this.header) return; const input = this.header.querySelector<HTMLInputElement>('input'); if (input && document.activeElement !== input) input.value = this.service.text(); if (this.builder?.getGui().isConnected) this.builder.refresh(); }
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
    root.append(input, suggestions, ...this.service.headerButtons().map((action) => actions.get(action)!).filter(Boolean));
    if (!this.service.isBuilderSuppressed()) root.append(builder);
    root.append(error);
    return root;
  }
  private show(source: 'api' | 'ui'): void {
    if (this.builder?.getGui().isConnected) return;
    const builderParent = this.service.getBuilderParent();
    this.builder = new AdvancedFilterBuilder({
      columns: this.service.columns(),
      model: this.service.getModel(),
      buttons: this.service.builderButtons(),
      options: this.service.builderOptions(),
      themeSource: this.header?.closest<HTMLElement>('.ag-root-wrapper') ?? builderParent ?? document.documentElement,
      onApply: (model) => {
        this.service.setModel(model);
        this.service.filterChanged();
        this.hide('ui');
      },
      onReset: () => {
        this.service.setModel(null);
        this.service.filterChanged();
        this.hide('ui');
      },
      onClose: () => this.hide('ui'),
    });
    document.body.append(this.builder.getGui());
    this.emitVisible(true, source);
  }
  private hide(source: 'api' | 'ui'): void { if (!this.builder) return; this.builder.destroy(); this.builder = undefined; this.emitVisible(false, source); }
  private emitVisible(visible: boolean, source: 'api' | 'ui'): void { this.service.emitBuilderVisibility(visible, source); }
}

function button(label: string, handler: () => void): HTMLButtonElement { const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.addEventListener('click', handler); return element; }
function kindFor(value: unknown): ColumnKind { return value === 'number' || value === 'boolean' || value === 'date' || value === 'dateString' || value === 'dateTime' || value === 'dateTimeString' || value === 'bigint' || value === 'object' ? value : 'text'; }
function capitalise(value: string): string { return value.length ? value[0]!.toUpperCase() + value.slice(1) : value; }
