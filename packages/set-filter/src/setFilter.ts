import { AgPromise } from 'ag-grid-community';
import type {
  IDoesFilterPassParams,
  IAfterGuiAttachedParams,
  IFilterParams,
  ISetFilter,
  SetFilterModel,
  SetFilterModelValue,
  SetFilterParams,
} from 'ag-grid-community';

interface ValueEntry {
  key: string | null;
  value: unknown;
  label: string;
}

interface TreeGroup {
  key: string;
  label: string;
  level: number;
  children: TreeGroup[];
  leaves: ValueEntry[];
}

/**
 * Framework-neutral, virtualised implementation of the Set Filter UI.
 *
 * The applied model is deliberately independent from the visible rows: this
 * lets values be unloaded, refreshed, or virtualised without losing a model
 * that Phase 9 can serialise to a datasource.
 *
 * @feature Set Filter
 */
export class SetFilter implements ISetFilter {
  public readonly filterType = 'set' as const;

  private readonly gui = document.createElement('section');
  private params: SetFilterParams | undefined;
  private values: ValueEntry[] = [];
  private displayed: ValueEntry[] = [];
  private appliedKeys: Set<string | null> | undefined;
  private uiKeys: Set<string | null> | undefined;
  private miniFilter: string | null = null;
  private list: HTMLDivElement | undefined;
  private listContent: HTMLDivElement | undefined;
  private miniFilterTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly expandedTreeGroups = new Set<string>();
  private hidePopup: (() => void) | undefined;
  private destroyed = false;
  private valuesRequest = 0;

  public constructor() {
    this.gui.className = 'lgr-set-filter';
    this.gui.setAttribute('aria-label', 'Set filter');
  }

  public init(params: SetFilterParams): void {
    this.destroyed = false;
    this.params = params;
    this.appliedKeys = params.defaultToNothingSelected && !params.excelMode ? new Set() : undefined;
    this.uiKeys = this.cloneKeys(this.appliedKeys);
    this.loadValues();
  }

  public getGui(): HTMLElement {
    return this.gui;
  }

  public destroy(): void {
    this.destroyed = true;
    this.valuesRequest++;
    if (this.miniFilterTimer) clearTimeout(this.miniFilterTimer);
    this.gui.replaceChildren();
  }

  public isFilterActive(): boolean {
    return this.appliedKeys !== undefined;
  }

  public doesFilterPass(params: IDoesFilterPassParams): boolean {
    if (!this.appliedKeys) return true;
    const value = this.params?.getValue(params.node);
    return this.appliedKeys.has(this.keyFor(value));
  }

  public getModel(): SetFilterModel | null {
    return this.modelFromKeys(this.appliedKeys);
  }

  public getModelFromUi(): SetFilterModel | null {
    return this.modelFromKeys(this.uiKeys);
  }

  public setModel(model: SetFilterModel | null): AgPromise<void> {
    this.appliedKeys = model ? new Set(model.values) : undefined;
    this.uiKeys = this.cloneKeys(this.appliedKeys);
    this.render();
    return AgPromise.resolve();
  }

  public applyModel(_source: 'api' | 'ui' | 'rowDataUpdated' = 'api'): boolean {
    const before = this.getModel();
    this.appliedKeys = this.cloneKeys(this.uiKeys);
    return JSON.stringify(before) !== JSON.stringify(this.getModel());
  }

  public getFilterKeys(): SetFilterModelValue {
    return this.values.map((entry) => entry.key);
  }

  public getFilterValues(): (string | null)[] {
    // Keep the original values instead of rebuilding them from their keys. In
    // particular, `null` and `undefined` are different values in row data.
    return this.values.map((entry) => entry.value as string | null);
  }

  public setFilterValues(values: (string | null)[]): void {
    this.setValues(values);
  }

  public refreshFilterValues(): void {
    this.loadValues();
  }

  public resetFilterValues(): void {
    if (this.params) delete this.params.values;
    this.loadValues();
  }

  public getMiniFilter(): string | null {
    return this.miniFilter;
  }

  public setMiniFilter(newMiniFilter: string | null): void {
    this.miniFilter = newMiniFilter || null;
    this.updateDisplayedValues();
    this.renderList();
    this.params?.filterModifiedCallback({ miniFilterValue: this.miniFilter });
    if (this.params?.applyMiniFilterWhileTyping) this.applyUi('ui');
  }

  public afterGuiAttached(params?: IAfterGuiAttachedParams): void {
    this.hidePopup = params?.hidePopup;
    if (this.params?.refreshValuesOnOpen) this.refreshFilterValues();
  }

  public onNewRowsLoaded(): void {
    if (!this.params?.values) this.loadValues();
  }

  public refresh(params: IFilterParams): boolean {
    this.params = params as SetFilterParams;
    this.loadValues();
    return true;
  }

  private loadValues(): void {
    const request = ++this.valuesRequest;
    const source = this.params?.values;
    if (Array.isArray(source)) {
      this.setValues(source);
      return;
    }
    if (typeof source === 'function' && this.params) {
      source({
        api: this.params.api,
        context: this.params.context,
        colDef: this.params.colDef,
        column: this.params.column,
        success: (values) => {
          if (!this.destroyed && request === this.valuesRequest) this.setValues(values);
        },
      });
      return;
    }
    const values: unknown[] = [];
    this.params?.api.forEachLeafNode((node) => values.push(this.params?.getValue(node)));
    if (!this.destroyed && request === this.valuesRequest) this.setValues(values);
  }

  private setValues(values: readonly unknown[]): void {
    const unique = new Map<string | null, ValueEntry>();
    for (const value of values) {
      const key = this.keyFor(value);
      if (!unique.has(key)) unique.set(key, { key, value, label: this.labelFor(value) });
    }
    this.values = [...unique.values()];
    if (!this.params?.suppressSorting) {
      const comparator = this.params?.comparator;
      this.values.sort((left, right) =>
        comparator
          ? comparator(left.value as string | null, right.value as string | null)
          : left.label.localeCompare(right.label),
      );
    }
    if (!this.params?.suppressClearModelOnRefreshValues && this.appliedKeys && this.values.every((value) => this.appliedKeys?.has(value.key))) {
      this.appliedKeys = undefined;
      this.uiKeys = undefined;
    }
    this.updateDisplayedValues();
    this.render();
  }

  private updateDisplayedValues(): void {
    const needle = this.formatText(this.miniFilter ?? '');
    this.displayed = needle
      ? this.values.filter((entry) => this.formatText(entry.label).includes(needle))
      : this.values;
  }

  private render(): void {
    this.gui.replaceChildren();
    if (!this.params) return;
    if (!this.params.suppressMiniFilter) this.appendMiniFilter();
    if (!this.params.suppressSelectAll) this.appendSelectAll();
    this.list = document.createElement('div');
    this.list.className = 'lgr-set-filter-list';
    this.list.style.maxHeight = '240px';
    this.list.style.overflow = 'auto';
    this.list.setAttribute('role', 'group');
    this.list.setAttribute('aria-label', 'Filter values');
    this.list.addEventListener('scroll', () => this.renderList());
    this.listContent = document.createElement('div');
    this.list.appendChild(this.listContent);
    this.gui.appendChild(this.list);
    this.renderList();
    this.appendActions();
  }

  private appendMiniFilter(): void {
    const input = document.createElement('input');
    input.type = 'search';
    input.value = this.miniFilter ?? '';
    input.placeholder = 'Search values';
    input.setAttribute('aria-label', 'Search filter values');
    input.addEventListener('input', () => {
      if (this.miniFilterTimer) clearTimeout(this.miniFilterTimer);
      const delay = this.params?.debounceMs ?? 0;
      this.miniFilterTimer = setTimeout(() => this.setMiniFilter(input.value), delay);
    });
    this.gui.appendChild(input);
  }

  private appendSelectAll(): void {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.areAllDisplayedSelected();
    checkbox.indeterminate = !checkbox.checked && this.displayed.some((entry) => this.isSelected(entry.key));
    checkbox.setAttribute('aria-label', 'Select all filtered values');
    checkbox.disabled = this.params?.readOnly ?? false;
    checkbox.addEventListener('change', () => this.setDisplayedSelected(checkbox.checked));
    const label = document.createElement('label');
    label.append(checkbox, document.createTextNode('Select all'));
    this.gui.appendChild(label);
  }

  private renderList(): void {
    const list = this.list;
    const content = this.listContent;
    if (!list || !content) return;
    if (this.params?.treeList) {
      this.renderTreeList(content);
      return;
    }
    const rowHeight = this.params?.cellHeight ?? 32;
    const start = Math.max(0, Math.floor(list.scrollTop / rowHeight) - 3);
    const end = Math.min(this.displayed.length, start + Math.ceil(240 / rowHeight) + 6);
    content.replaceChildren();
    content.style.height = `${this.displayed.length * rowHeight}px`;
    const window = document.createElement('div');
    window.style.transform = `translateY(${start * rowHeight}px)`;
    for (const entry of this.displayed.slice(start, end)) window.appendChild(this.createValueRow(entry, rowHeight));
    content.appendChild(window);
  }

  private renderTreeList(content: HTMLDivElement): void {
    content.replaceChildren();
    content.style.height = '';
    const roots = this.createTreeGroups();
    for (const group of roots) this.appendTreeGroup(content, group, []);
  }

  private createTreeGroups(): TreeGroup[] {
    const roots: TreeGroup[] = [];
    const groups = new Map<string, TreeGroup>();
    for (const entry of this.displayed) {
      const path = this.treePathFor(entry);
      let siblings = roots;
      const parentPath: string[] = [];
      for (const [level, pathKey] of path.entries()) {
        const identity = [...parentPath, pathKey].join('\u0000');
        let group = groups.get(identity);
        if (!group) {
          group = {
            key: identity,
            label: this.params?.treeListFormatter?.(pathKey, level, parentPath) ?? pathKey,
            level,
            children: [],
            leaves: [],
          };
          groups.set(identity, group);
          siblings.push(group);
          this.expandedTreeGroups.add(identity);
        }
        parentPath.push(pathKey);
        siblings = group.children;
        if (level === path.length - 1) group.leaves.push(entry);
      }
    }
    return roots;
  }

  private treePathFor(entry: ValueEntry): string[] {
    const pathGetter = this.params?.treeListPathGetter as ((value: unknown) => string[] | null) | undefined;
    const path = pathGetter?.(entry.value);
    if (path?.length) return path.map(String);
    if (entry.value instanceof Date) {
      return [String(entry.value.getFullYear()), String(entry.value.getMonth() + 1), String(entry.value.getDate())];
    }
    return [entry.label];
  }

  private appendTreeGroup(parent: HTMLElement, group: TreeGroup, parentPath: string[]): void {
    const row = document.createElement('div');
    row.className = 'lgr-set-filter-tree-group';
    row.style.paddingInlineStart = `${group.level * 16}px`;
    const expanded = this.expandedTreeGroups.has(group.key);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = expanded ? '▾' : '▸';
    toggle.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} ${group.label}`);
    toggle.addEventListener('click', () => {
      if (expanded) this.expandedTreeGroups.delete(group.key);
      else this.expandedTreeGroups.add(group.key);
      this.renderList();
    });
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const leaves = this.collectTreeLeaves(group);
    checkbox.checked = leaves.every((entry) => this.isSelected(entry.key));
    checkbox.indeterminate = !checkbox.checked && leaves.some((entry) => this.isSelected(entry.key));
    checkbox.disabled = this.params?.readOnly ?? false;
    checkbox.setAttribute('aria-label', `Select ${group.label}`);
    checkbox.addEventListener('change', () => this.setEntriesSelected(leaves, checkbox.checked));
    const label = document.createElement('span');
    label.textContent = group.label;
    row.append(toggle, checkbox, label);
    parent.appendChild(row);
    if (!expanded) return;
    for (const child of group.children) this.appendTreeGroup(parent, child, [...parentPath, group.label]);
    for (const entry of group.leaves) {
      const leaf = this.createValueRow(entry, this.params?.cellHeight ?? 32);
      leaf.style.paddingInlineStart = `${(group.level + 1) * 16}px`;
      parent.appendChild(leaf);
    }
  }

  private collectTreeLeaves(group: TreeGroup): ValueEntry[] {
    return [...group.leaves, ...group.children.flatMap((child) => this.collectTreeLeaves(child))];
  }

  private createValueRow(entry: ValueEntry, rowHeight: number): HTMLElement {
    const label = document.createElement('label');
    label.className = 'lgr-set-filter-value';
    label.style.height = `${rowHeight}px`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.isSelected(entry.key);
    checkbox.disabled = this.params?.readOnly ?? false;
    checkbox.addEventListener('change', () => this.setKeySelected(entry.key, checkbox.checked));
    const rendered = this.renderValue(entry);
    if (this.params?.showTooltips) rendered.title = entry.label;
    label.append(checkbox, rendered);
    return label;
  }

  private appendActions(): void {
    const buttons = this.actionButtons();
    if (!buttons?.length || this.params?.readOnly) return;
    const actions = document.createElement('div');
    actions.className = 'lgr-set-filter-actions';
    for (const action of buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action[0]!.toUpperCase() + action.slice(1);
      button.addEventListener('click', () => this.handleAction(action));
      actions.appendChild(button);
    }
    this.gui.appendChild(actions);
  }

  private handleAction(action: 'apply' | 'clear' | 'reset' | 'cancel'): void {
    if (action === 'apply') this.applyUi('ui');
    if (action === 'clear') this.uiKeys = new Set();
    if (action === 'reset') {
      this.uiKeys = undefined;
      this.appliedKeys = undefined;
      this.params?.filterChangedCallback();
    }
    if (action === 'cancel') this.uiKeys = this.cloneKeys(this.appliedKeys);
    this.render();
    if (this.params?.closeOnApply && (action === 'apply' || action === 'cancel' || (action === 'reset' && this.actionButtons()?.includes('apply')))) this.hidePopup?.();
  }

  private setDisplayedSelected(selected: boolean): void {
    this.setEntriesSelected(this.displayed, selected);
  }

  private setEntriesSelected(entries: readonly ValueEntry[], selected: boolean): void {
    const keys = this.materialiseUiKeys();
    for (const entry of entries) {
      if (selected) keys.add(entry.key);
      else keys.delete(entry.key);
    }
    this.uiKeys = keys.size === this.values.length ? undefined : keys;
    this.onUiSelectionChanged();
  }

  private setKeySelected(key: string | null, selected: boolean): void {
    const keys = this.materialiseUiKeys();
    if (selected) keys.add(key);
    else keys.delete(key);
    this.uiKeys = keys.size === this.values.length ? undefined : keys;
    this.onUiSelectionChanged();
  }

  private onUiSelectionChanged(): void {
    this.params?.filterModifiedCallback();
    if (!this.actionButtons()?.includes('apply')) this.applyUi('ui');
    this.render();
  }

  private applyUi(source: 'api' | 'ui'): void {
    if (this.applyModel(source)) this.params?.filterChangedCallback();
  }

  private materialiseUiKeys(): Set<string | null> {
    return this.uiKeys ? new Set(this.uiKeys) : new Set(this.values.map((entry) => entry.key));
  }

  private areAllDisplayedSelected(): boolean {
    return this.displayed.every((entry) => this.isSelected(entry.key));
  }

  private isSelected(key: string | null): boolean {
    return this.uiKeys?.has(key) ?? true;
  }

  private modelFromKeys(keys: Set<string | null> | undefined): SetFilterModel | null {
    return keys ? { filterType: 'set', values: [...keys] } : null;
  }

  private cloneKeys(keys: Set<string | null> | undefined): Set<string | null> | undefined {
    return keys ? new Set(keys) : undefined;
  }

  private keyFor(value: unknown): string | null {
    if (value === null) return null;
    // The Set Filter model can only contain string and null values. Reserve a
    // stable string key for undefined so it does not collapse into blanks.
    if (value === undefined) return '__libregrid_undefined__';
    const keyCreator = this.params?.keyCreator ?? this.params?.colDef.keyCreator;
    if (keyCreator && this.params) {
      return keyCreator({
        value,
        api: this.params.api,
        context: this.params.context,
        colDef: this.params.colDef,
        column: this.params.column,
        node: undefined as never,
        data: undefined as never,
      } as never);
    }
    return String(value);
  }

  private labelFor(value: unknown): string {
    if (value === null) return '(Blanks)';
    if (value === undefined) return '(Undefined)';
    const valueFormatter = this.params?.valueFormatter ?? this.params?.colDef.valueFormatter;
    if (typeof valueFormatter === 'function' && this.params) {
      return valueFormatter({
        value,
        data: undefined,
        node: null,
        api: this.params.api,
        context: this.params.context,
        colDef: this.params.colDef,
        column: this.params.column,
      });
    }
    return String(value);
  }

  private renderValue(entry: ValueEntry): HTMLElement {
    const renderer = this.params?.cellRenderer;
    if (typeof renderer === 'function') {
      const result = renderer({ value: entry.value, valueFormatted: entry.label, api: this.params?.api, context: this.params?.context, colDef: this.params?.colDef, column: this.params?.column });
      if (result instanceof HTMLElement) return result;
      const rendered = document.createElement('span');
      rendered.textContent = String(result);
      return rendered;
    }
    const text = document.createElement('span');
    text.textContent = entry.label;
    return text;
  }

  private formatText(value: string): string {
    const formatted = this.params?.textFormatter?.(value) ?? value;
    return this.params?.caseSensitive ? formatted : formatted.toLocaleLowerCase();
  }

  private actionButtons(): SetFilterParams['buttons'] | undefined {
    if (this.params?.buttons) return this.params.buttons;
    // Excel modes use an explicit confirmation boundary. Windows and macOS
    // differ in popup conventions, but both retain a staged filter model.
    return this.params?.excelMode ? ['apply', 'cancel'] : undefined;
  }
}
