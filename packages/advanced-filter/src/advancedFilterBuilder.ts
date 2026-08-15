import type { AdvancedFilterModel } from 'ag-grid-community';
import type { ColumnKind, ExpressionColumn } from './expression';

/** Display controls shared by every Advanced Filter Builder host. */
export interface AdvancedFilterBuilderOptions {
  addSelectWidth?: number;
  minWidth?: number;
  pillSelectMaxWidth?: number;
  pillSelectMinWidth?: number;
  showMoveButtons?: boolean;
  suppressFullScreenButton?: boolean;
}

/**
 * Small host-facing interface for the reusable Advanced Filter Builder.
 *
 * The builder owns its staged model and all editing UI. A host only provides
 * the available columns, the initial model, and callbacks for completed
 * actions, keeping the grid integration separate from presentation.
 */
export interface AdvancedFilterBuilderParams {
  columns: readonly ExpressionColumn[];
  model: AdvancedFilterModel | null;
  buttons?: readonly string[];
  options?: AdvancedFilterBuilderOptions;
  onApply: (model: AdvancedFilterModel | null) => void;
  onReset: () => void;
  onClose: () => void;
}

export class AdvancedFilterBuilder {
  private readonly gui = document.createElement('section');
  private staged: AdvancedFilterModel | null;

  public constructor(private readonly params: AdvancedFilterBuilderParams) {
    this.staged = cloneModel(params.model);
    this.gui.className = 'lgr-advanced-filter-builder';
    this.gui.setAttribute('role', 'dialog');
    this.gui.setAttribute('aria-label', 'Advanced filter builder');
    if (params.options?.minWidth) this.gui.style.setProperty('--lgr-advanced-filter-builder-min-width', `${params.options.minWidth}px`);
    this.render();
  }

  public getGui(): HTMLElement {
    return this.gui;
  }

  /** Refreshes the current staged UI without discarding the user's edits. */
  public refresh(): void {
    this.render();
  }

  private render(): void {
    const heading = document.createElement('div');
    heading.className = 'lgr-advanced-filter-builder-heading';
    const title = document.createElement('strong');
    title.textContent = 'Advanced Filter Builder';
    const description = document.createElement('span');
    description.textContent = 'Combine one or more conditions, then apply the staged rule.';
    heading.append(title, description);
    const pills = document.createElement('div');
    pills.className = 'lgr-advanced-filter-pills';
    const conditions = this.conditions();
    if (conditions.length === 0) pills.append(this.emptyState());
    else conditions.forEach((condition, index) => pills.append(this.pill(condition, index)));

    const actions = document.createElement('div');
    actions.className = 'lgr-advanced-filter-actions';
    actions.append(this.addConditionButton(), ...this.actionButtons());
    this.gui.replaceChildren(heading, pills, actions);
  }

  private addConditionButton(): HTMLButtonElement {
    const add = button('Add condition', () => {
      const column = this.params.columns[0];
      if (!column) return;
      const condition: AdvancedFilterModel = {
        filterType: column.kind ?? 'text',
        colId: column.id,
        type: column.kind === 'boolean' ? 'true' : 'contains',
        ...(column.kind === 'boolean' ? {} : { filter: '' }),
      } as AdvancedFilterModel;
      this.staged = joinLike(this.staged, condition);
      this.render();
    });
    if (this.params.options?.addSelectWidth) add.style.minWidth = `${this.params.options.addSelectWidth}px`;
    add.className = 'lgr-advanced-filter-builder-add';
    return add;
  }

  private emptyState(): HTMLElement {
    const empty = document.createElement('div');
    empty.className = 'lgr-advanced-filter-builder-empty';
    const title = document.createElement('strong');
    title.textContent = 'Start with a condition';
    const description = document.createElement('span');
    description.textContent = 'Choose a column, operator, and value to define the first rule.';
    empty.append(title, description);
    return empty;
  }

  private actionButtons(): HTMLButtonElement[] {
    const actions: Record<string, HTMLButtonElement> = {
      apply: button('Apply', () => this.params.onApply(cloneModel(this.staged)), 'lgr-advanced-filter-builder-primary'),
      clear: button('Clear', () => {
        this.staged = null;
        this.render();
      }),
      reset: button('Reset', () => this.params.onReset()),
      cancel: button('Cancel', () => this.params.onClose()),
    };
    return (this.params.buttons ?? ['apply', 'cancel']).flatMap((action) => actions[action] ? [actions[action]] : []);
  }

  private pill(condition: AdvancedFilterModel, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'lgr-advanced-filter-pill';
    item.tabIndex = 0;
    if (condition.filterType === 'join') return item;

    const column = document.createElement('select');
    column.setAttribute('aria-label', `Condition ${index + 1} column`);
    this.params.columns.forEach((candidate) => {
      const option = document.createElement('option');
      option.value = candidate.id;
      option.textContent = candidate.id;
      option.selected = candidate.id === condition.colId;
      column.append(option);
    });
    const operator = document.createElement('select');
    operator.setAttribute('aria-label', `Condition ${index + 1} operator`);
    operatorOptions(condition.filterType).forEach((candidate) => {
      const option = document.createElement('option');
      option.value = candidate;
      option.textContent = operatorLabel(candidate);
      option.selected = candidate === condition.type;
      operator.append(option);
    });
    const value = document.createElement('input');
    value.setAttribute('aria-label', `Condition ${index + 1} value`);
    value.value = 'filter' in condition && condition.filter != null ? String(condition.filter) : '';
    value.disabled = condition.type === 'blank' || condition.type === 'notBlank' || condition.filterType === 'boolean';
    const settings = this.params.options;
    for (const select of [column, operator]) {
      if (settings?.pillSelectMinWidth) select.style.minWidth = `${settings.pillSelectMinWidth}px`;
      if (settings?.pillSelectMaxWidth) select.style.maxWidth = `${settings.pillSelectMaxWidth}px`;
    }
    const update = (): void => {
      const selected = this.params.columns.find((candidate) => candidate.id === column.value) ?? this.params.columns[0];
      if (!selected) return;
      const available = operatorOptions(selected.kind ?? 'text');
      const type = available.includes(operator.value) ? operator.value : available[0]!;
      const next = {
        ...condition,
        filterType: selected.kind ?? 'text',
        colId: selected.id,
        type,
        ...(value.disabled ? {} : { filter: selected.kind === 'number' ? Number(value.value) : value.value }),
      } as AdvancedFilterModel;
      this.replace(index, next);
    };
    column.addEventListener('change', update);
    operator.addEventListener('change', () => {
      value.disabled = operator.value === 'blank' || operator.value === 'notBlank';
      update();
    });
    value.addEventListener('change', update);
    const remove = button('Remove', () => {
      const copy = this.conditions().filter((_, current) => current !== index);
      this.staged = copy.length === 0 ? null : copy.length === 1 ? copy[0]! : { filterType: 'join', type: 'AND', conditions: copy };
      this.render();
    });
    item.append(column, operator, value);
    if (settings?.showMoveButtons) {
      item.append(button('Move up', () => this.move(index, -1)), button('Move down', () => this.move(index, 1)));
    }
    item.append(remove);
    return item;
  }

  private conditions(): AdvancedFilterModel[] {
    return this.staged ? flatten(this.staged) : [];
  }

  private replace(index: number, condition: AdvancedFilterModel): void {
    const conditions = this.conditions();
    conditions[index] = condition;
    this.staged = conditions.length === 1 ? conditions[0]! : { filterType: 'join', type: 'AND', conditions };
    this.render();
  }

  private move(index: number, delta: number): void {
    const conditions = this.conditions();
    const next = index + delta;
    if (next < 0 || next >= conditions.length) return;
    [conditions[index], conditions[next]] = [conditions[next]!, conditions[index]!];
    this.staged = conditions.length === 1 ? conditions[0]! : { filterType: 'join', type: 'AND', conditions };
    this.render();
  }
}

function cloneModel(model: AdvancedFilterModel | null): AdvancedFilterModel | null {
  return model ? structuredClone(model) : null;
}

function button(label: string, handler: () => void, className?: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  if (className) element.className = className;
  element.addEventListener('click', handler);
  return element;
}

function flatten(model: AdvancedFilterModel): AdvancedFilterModel[] {
  return model.filterType === 'join' && model.type === 'AND' ? model.conditions : [model];
}

function joinLike(before: AdvancedFilterModel | null, condition: AdvancedFilterModel): AdvancedFilterModel {
  return !before ? condition : before.filterType === 'join' && before.type === 'AND'
    ? { ...before, conditions: [...before.conditions, condition] }
    : { filterType: 'join', type: 'AND', conditions: [before, condition] };
}

function operatorOptions(kind: ColumnKind): string[] {
  return kind === 'boolean'
    ? ['true', 'false']
    : kind === 'number' || kind === 'date' || kind === 'dateString' || kind === 'dateTime' || kind === 'dateTimeString' || kind === 'bigint'
      ? ['equals', 'notEqual', 'lessThan', 'lessThanOrEqual', 'greaterThan', 'greaterThanOrEqual', 'blank', 'notBlank']
      : ['equals', 'notEqual', 'contains', 'notContains', 'startsWith', 'endsWith', 'blank', 'notBlank'];
}

function operatorLabel(value: string): string {
  return ({ equals: '=', notEqual: '≠', lessThan: '<', lessThanOrEqual: '≤', greaterThan: '>', greaterThanOrEqual: '≥', contains: 'contains', notContains: 'does not contain', startsWith: 'starts with', endsWith: 'ends with', blank: 'is blank', notBlank: 'is not blank', true: 'is true', false: 'is false' } as Record<string, string>)[value] ?? value;
}
