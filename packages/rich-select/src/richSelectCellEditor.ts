import type { ICellEditor, RichCellEditorParams } from 'ag-grid-community';

type Params<TData = unknown, TValue = unknown> = RichCellEditorParams<TData, TValue> & {
  value?: TValue | TValue[] | null;
  stopEditing?(suppressNavigateAfterEdit?: boolean, event?: KeyboardEvent): void;
};

/**
 * A DOM-native Material-compatible autocomplete editor. Only viewport rows are
 * rendered, so large static and paged data sources remain bounded in the DOM.
 */
export class RichSelectCellEditor<TData = unknown, TValue = unknown> implements ICellEditor<TValue | TValue[]> {
  private readonly gui = document.createElement('div');
  private readonly input = document.createElement('input');
  private readonly list = document.createElement('div');
  private readonly spacer = document.createElement('div');
  private params!: Params<TData, TValue>;
  private values: TValue[] = [];
  private filtered: TValue[] = [];
  private selected = new Set<TValue>();
  private active = 0;
  private rowHeight = 32;
  private cursor: string | null | undefined;
  private lastRow: number | undefined;
  private loading = false;
  private generation = 0;

  public init(params: Params<TData, TValue>): void {
    this.params = params; this.rowHeight = params.cellHeight ?? 32;
    this.gui.className = 'lgr-rich-select'; this.gui.setAttribute('role', 'dialog'); this.gui.setAttribute('aria-label', 'Rich select');
    this.input.type = 'text'; this.input.placeholder = params.valuePlaceholder ?? 'Search'; this.input.value = params.allowTyping ? this.label(params.value as TValue) : '';
    this.list.className = 'lgr-rich-select-list'; this.list.tabIndex = 0; this.list.setAttribute('role', 'listbox'); this.list.setAttribute('aria-multiselectable', String(params.multiSelect === true)); this.list.append(this.spacer);
    this.gui.append(this.input, this.list);
    for (const value of Array.isArray(params.value) ? params.value : params.value == null ? [] : [params.value]) this.selected.add(value);
    this.input.addEventListener('input', () => this.onSearch()); this.input.addEventListener('keydown', (event) => this.keydown(event)); this.list.addEventListener('keydown', (event) => this.keydown(event)); this.list.addEventListener('scroll', () => { this.render(); this.loadNextPage(); });
    this.load();
  }
  public getGui(): HTMLElement { return this.gui; }
  public afterGuiAttached(): void { (this.params.allowTyping ? this.input : this.list).focus(); }
  public isPopup(): boolean { return true; }
  public getPopupPosition(): 'under' { return 'under'; }
  public getValue(): TValue | TValue[] | null | undefined {
    const value = this.params.multiSelect ? [...this.selected] : this.selected.values().next().value as TValue | undefined;
    return this.params.parseValue ? this.params.parseValue(value) as TValue | TValue[] | null | undefined : value;
  }
  public destroy(): void { this.generation++; this.gui.replaceChildren(); }
  private async load(search = ''): Promise<void> {
    const generation = ++this.generation; this.loading = true;
    try {
      if (this.params.valuesPage) {
        const initial = this.params.valuesPageInitialStartRow;
        const startRow = typeof initial === 'function' ? initial(this.params.value) : initial ?? 0;
        const page = await this.params.valuesPage({ ...this.params, search, startRow, endRow: startRow + (this.params.valuesPageSize ?? 100) } as never);
        if (generation !== this.generation) return;
        this.values = page.values; this.cursor = page.cursor; this.lastRow = page.lastRow;
      } else {
        const source = this.params.values;
        const values = typeof source === 'function' ? await source({ ...this.params, search: this.params.filterListAsync ? search : undefined } as never) : source ?? [];
        if (generation !== this.generation) return;
        this.values = values;
      }
      this.applyFilter(search);
    } finally { if (generation === this.generation) this.loading = false; }
  }
  private async loadNextPage(): Promise<void> {
    if (!this.params.valuesPage || this.loading || this.lastRow != null && this.values.length >= this.lastRow) return;
    if (this.list.scrollTop + this.list.clientHeight < this.list.scrollHeight - this.rowHeight * (this.params.valuesPageLoadThreshold ?? 10)) return;
    this.loading = true; const generation = this.generation;
    try {
      const page = await this.params.valuesPage({ ...this.params, search: this.input.value, startRow: this.values.length, endRow: this.values.length + (this.params.valuesPageSize ?? 100), cursor: this.cursor } as never);
      if (generation !== this.generation) return;
      this.values.push(...page.values); this.cursor = page.cursor; this.lastRow = page.lastRow; this.applyFilter(this.input.value);
    } finally { if (generation === this.generation) this.loading = false; }
  }
  private onSearch(): void { this.active = 0; if (this.params.filterListAsync) void this.load(this.input.value); else this.applyFilter(this.input.value); }
  private applyFilter(search: string): void {
    if (!this.params.filterList || !search) this.filtered = [...this.values];
    else this.filtered = this.values.filter((value) => matches(this.label(value), search, this.params.searchType ?? 'fuzzy'));
    this.render();
  }
  private render(): void {
    const height = this.list.clientHeight || 208; const start = Math.max(0, Math.floor(this.list.scrollTop / this.rowHeight) - 3); const end = Math.min(this.filtered.length, Math.ceil((this.list.scrollTop + height) / this.rowHeight) + 3);
    this.spacer.style.height = `${this.filtered.length * this.rowHeight}px`;
    const options: HTMLElement[] = [this.spacer];
    for (let index = start; index < end; index++) {
      const value = this.filtered[index]!; const option = document.createElement('div'); option.className = `lgr-rich-select-option${index === this.active ? ' lgr-rich-select-active' : ''}`; option.style.transform = `translateY(${index * this.rowHeight}px)`; option.style.height = `${this.rowHeight}px`; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', String(this.selected.has(value))); this.renderValue(option, value); option.addEventListener('mousedown', (event) => { event.preventDefault(); this.choose(value); }); options.push(option);
    }
    this.list.replaceChildren(...options);
  }
  private choose(value: TValue): void { if (this.params.multiSelect) { if (this.selected.has(value)) this.selected.delete(value); else this.selected.add(value); this.render(); return; } this.selected = new Set([value]); this.params.stopEditing?.(false); }
  private keydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') { this.active = Math.min(this.filtered.length - 1, this.active + 1); this.reveal(); event.preventDefault(); }
    else if (event.key === 'ArrowUp') { this.active = Math.max(0, this.active - 1); this.reveal(); event.preventDefault(); }
    else if (event.key === 'Enter') { const value = this.filtered[this.active]; if (value !== undefined) this.choose(value); event.preventDefault(); }
    else if (event.key === 'Escape') { this.params.stopEditing?.(true, event); }
  }
  private reveal(): void { const top = this.active * this.rowHeight; if (top < this.list.scrollTop) this.list.scrollTop = top; else if (top + this.rowHeight > this.list.scrollTop + this.list.clientHeight) this.list.scrollTop = top - this.list.clientHeight + this.rowHeight; this.render(); }
  private label(value: TValue | TValue[] | null | undefined): string { if (this.params.formatValue) return this.params.formatValue(value as TValue); return value == null ? '' : String(value); }
  private renderValue(host: HTMLElement, value: TValue): void {
    const renderer = this.params.cellRenderer;
    if (typeof renderer === 'function') {
      const rendered = renderer({ value, valueFormatted: this.label(value), data: this.params.data, node: this.params.node, colDef: this.params.colDef, column: this.params.column, ...this.params.cellRendererParams });
      if (rendered instanceof HTMLElement) host.append(rendered); else host.textContent = String(rendered ?? this.label(value));
      return;
    }
    host.textContent = this.label(value);
  }
}
function matches(value: string, search: string, type: 'match' | 'matchAny' | 'fuzzy'): boolean { const lower = value.toLocaleLowerCase(); const term = search.toLocaleLowerCase(); if (type === 'match') return lower.startsWith(term); if (type === 'matchAny') return lower.includes(term); let at = 0; for (const char of term) { at = lower.indexOf(char, at); if (at < 0) return false; at++; } return true; }
