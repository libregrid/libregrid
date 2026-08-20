import type { AdvancedFilterModel, ColumnAdvancedFilterModel } from 'ag-grid-community';
import {
  parseAdvancedFilterExpression,
  serialiseAdvancedFilterModel,
  type ColumnKind,
  type ExpressionColumn,
} from './expression';

type JoinType = 'AND' | 'OR';
type JoinModel = AdvancedFilterModel & {
  filterType: 'join';
  type: JoinType;
  conditions: AdvancedFilterModel[];
};

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
  /** Element whose resolved AG Grid theme variables should style the modal. */
  themeSource?: HTMLElement;
  onApply: (model: AdvancedFilterModel | null) => void;
  onReset: () => void;
  onClose: () => void;
}

/** Framework-neutral guided rule composer for the public Advanced Filter model. */
export class AdvancedFilterBuilder {
  private readonly gui = document.createElement('div');
  private readonly dialog = document.createElement('section');
  private readonly rules = document.createElement('div');
  private readonly expression = document.createElement('input');
  private readonly error = document.createElement('div');
  private readonly applyButton = document.createElement('button');
  private readonly restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  private staged: AdvancedFilterModel | null;
  private rootJoin: JoinType;
  private expressionDraft: string;
  private destroyed = false;
  private draggedPath: number[] | null = null;

  public constructor(private readonly params: AdvancedFilterBuilderParams) {
    this.staged = cloneModel(params.model);
    this.rootJoin = this.staged?.filterType === 'join' ? this.staged.type : 'AND';
    this.expressionDraft = serialiseAdvancedFilterModel(this.staged);
    this.build();
    this.renderRules();
    copyAgThemeVariables(params.themeSource ?? document.documentElement, this.gui);
    queueMicrotask(() => {
      if (this.gui.isConnected) this.dialog.querySelector<HTMLElement>(
        '.lgr-advanced-filter-condition-column, .lgr-advanced-filter-builder-add',
      )?.focus();
    });
  }

  public getGui(): HTMLElement {
    return this.gui;
  }

  /** Refreshes the staged UI without discarding edits. */
  public refresh(): void {
    this.renderRules();
    this.syncExpression();
  }

  /** Removes modal UI and returns focus to the control that opened it. */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.gui.remove();
    if (this.restoreFocus?.isConnected) this.restoreFocus.focus();
  }

  private build(): void {
    this.gui.className = 'lgr-advanced-filter-builder-overlay';
    this.gui.addEventListener('mousedown', (event) => {
      if (event.target === this.gui) this.close();
    });

    this.dialog.className = 'lgr-advanced-filter-builder';
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    if (this.params.options?.minWidth) {
      this.dialog.style.setProperty('--lgr-advanced-filter-builder-min-width', `${this.params.options.minWidth}px`);
    }
    const headingId = uniqueId('title');
    const descriptionId = uniqueId('description');
    this.dialog.setAttribute('aria-labelledby', headingId);
    this.dialog.setAttribute('aria-describedby', descriptionId);
    this.dialog.addEventListener('keydown', (event) => this.onDialogKeydown(event));

    const header = document.createElement('div');
    header.className = 'lgr-advanced-filter-builder-header';
    const heading = document.createElement('div');
    heading.className = 'lgr-advanced-filter-builder-heading';
    const title = document.createElement('h2');
    title.id = headingId;
    title.textContent = 'Advanced Filter';
    const description = document.createElement('p');
    description.id = descriptionId;
    description.textContent = 'Build readable conditions. Changes are staged until you apply.';
    heading.append(title, description);
    const close = iconButton('Close advanced filter builder', '×', () => this.close());
    close.classList.add('lgr-advanced-filter-builder-close');
    header.append(heading, close);

    const body = document.createElement('div');
    body.className = 'lgr-advanced-filter-builder-body';
    this.rules.className = 'lgr-advanced-filter-rules';
    const expressionBlock = document.createElement('div');
    expressionBlock.className = 'lgr-advanced-filter-expression-block';
    const expressionLabel = document.createElement('label');
    expressionLabel.className = 'lgr-advanced-filter-section-label';
    expressionLabel.htmlFor = uniqueId('expression');
    expressionLabel.textContent = 'Filter expression';
    this.expression.id = expressionLabel.htmlFor;
    this.expression.className = 'lgr-advanced-filter-builder-expression';
    this.expression.spellcheck = false;
    this.expression.value = this.expressionDraft;
    this.expression.placeholder = '[country] CONTAINS "United" AND [sales] > 100';
    this.expression.setAttribute('aria-describedby', descriptionId);
    this.expression.addEventListener('input', () => this.onExpressionInput());
    this.error.className = 'lgr-advanced-filter-builder-error';
    this.error.setAttribute('role', 'alert');
    this.error.hidden = true;
    const expressionHelp = document.createElement('p');
    expressionHelp.className = 'lgr-advanced-filter-expression-help';
    expressionHelp.textContent = 'The visual rules and expression stay synchronized. You can edit either view.';
    expressionBlock.append(expressionLabel, this.expression, expressionHelp, this.error);
    body.append(this.rules, expressionBlock);

    const footer = document.createElement('div');
    footer.className = 'lgr-advanced-filter-actions';
    const configured = this.params.buttons ?? ['apply', 'cancel'];
    for (const action of configured) {
      if (action === 'clear') {
        footer.append(button('Clear', () => {
          this.staged = null;
          this.modelChanged();
        }, 'lgr-advanced-filter-builder-quiet'));
      } else if (action === 'reset') {
        footer.append(button('Reset', () => this.params.onReset(), 'lgr-advanced-filter-builder-quiet'));
      } else if (action === 'cancel') {
        footer.append(button('Cancel', () => this.close(), 'lgr-advanced-filter-builder-quiet'));
      } else if (action === 'apply') {
        this.applyButton.type = 'button';
        this.applyButton.className = 'lgr-advanced-filter-builder-primary';
        this.applyButton.textContent = 'Apply';
        this.applyButton.addEventListener('click', () => this.apply());
        footer.append(this.applyButton);
      }
    }

    this.dialog.append(header, body, footer);
    this.gui.append(this.dialog);
  }

  private renderRules(): void {
    const root = this.rootModel();
    this.rules.replaceChildren(this.group(root, [], true));
  }

  private group(model: JoinModel, path: number[], root: boolean): HTMLElement {
    const section = document.createElement('section');
    section.className = `lgr-advanced-filter-rule-group${root ? ' lgr-advanced-filter-rule-group-root' : ''}`;
    section.setAttribute('aria-label', root ? 'Filter conditions' : 'Nested filter group');

    const toolbar = document.createElement('div');
    toolbar.className = 'lgr-advanced-filter-group-toolbar';
    const logic = document.createElement('div');
    const label = document.createElement('span');
    label.className = 'lgr-advanced-filter-section-label';
    label.textContent = root ? 'Match rows when' : 'Nested group matches';
    const choices = document.createElement('div');
    choices.className = 'lgr-advanced-filter-logic-choice';
    choices.setAttribute('role', 'radiogroup');
    choices.setAttribute('aria-label', root ? 'Root condition logic' : 'Nested condition logic');
    choices.append(
      this.logicButton('All conditions', 'AND', model.type, path),
      this.logicButton('Any condition', 'OR', model.type, path),
    );
    logic.append(label, choices);
    toolbar.append(logic);
    if (root) {
      toolbar.append(button('Clear all', () => {
        this.staged = null;
        this.modelChanged();
      }, 'lgr-advanced-filter-builder-quiet'));
    } else {
      toolbar.append(iconButton('Remove group', '×', () => this.remove(path)));
    }

    const content = document.createElement('div');
    content.className = 'lgr-advanced-filter-group-content';
    const rail = document.createElement('div');
    rail.className = 'lgr-advanced-filter-rule-rail';
    const railLabel = document.createElement('span');
    railLabel.textContent = model.type;
    rail.append(railLabel);
    const rows = document.createElement('div');
    rows.className = 'lgr-advanced-filter-rule-rows';
    if (model.conditions.length === 0) rows.append(this.emptyState());
    model.conditions.forEach((condition, index) => {
      const childPath = [...path, index];
      rows.append(condition.filterType === 'join'
        ? this.group(condition as JoinModel, childPath, false)
        : this.condition(condition as ColumnAdvancedFilterModel, childPath, index));
    });
    content.append(rail, rows);

    const actions = document.createElement('div');
    actions.className = 'lgr-advanced-filter-group-actions';
    const addCondition = button('Add condition', () => this.addCondition(path), 'lgr-advanced-filter-builder-add');
    if (this.params.options?.addSelectWidth) addCondition.style.minWidth = `${this.params.options.addSelectWidth}px`;
    actions.append(addCondition, button('Add group', () => this.addGroup(path), 'lgr-advanced-filter-builder-quiet'));
    section.append(toolbar, content, actions);
    return section;
  }

  private logicButton(label: string, value: JoinType, selected: JoinType, path: number[]): HTMLButtonElement {
    const control = button(label, () => this.setJoin(path, value));
    control.className = 'lgr-advanced-filter-logic-button';
    control.classList.toggle('lgr-advanced-filter-logic-button-active', value === selected);
    control.setAttribute('role', 'radio');
    control.setAttribute('aria-checked', String(value === selected));
    return control;
  }

  private condition(condition: ColumnAdvancedFilterModel, path: number[], index: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'lgr-advanced-filter-condition-row';
    row.dataset.path = path.join('.');
    const number = index + 1;
    const move = iconButton(`Move condition ${number}. Use Arrow Up or Arrow Down.`, '⠿', () => undefined);
    move.classList.add('lgr-advanced-filter-move-handle');
    if (this.params.options?.showMoveButtons) {
      move.draggable = true;
      move.addEventListener('dragstart', (event) => {
        this.draggedPath = path;
        row.classList.add('lgr-advanced-filter-condition-dragging');
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      });
      move.addEventListener('dragend', () => {
        this.draggedPath = null;
        row.classList.remove('lgr-advanced-filter-condition-dragging');
      });
      move.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        this.move(path, event.key === 'ArrowUp' ? -1 : 1);
      });
      row.addEventListener('dragover', (event) => {
        if (this.draggedPath && sameParent(this.draggedPath, path)) event.preventDefault();
      });
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        if (this.draggedPath) this.moveTo(this.draggedPath, path.at(-1) ?? 0);
      });
    } else {
      move.hidden = true;
    }

    const column = document.createElement('select');
    column.className = 'lgr-advanced-filter-condition-control lgr-advanced-filter-condition-column';
    column.setAttribute('aria-label', `Condition ${number} column`);
    this.params.columns.forEach((candidate) => {
      const option = document.createElement('option');
      option.value = candidate.id;
      option.textContent = humanise(candidate.id);
      option.selected = candidate.id === condition.colId;
      column.append(option);
    });

    const operator = document.createElement('select');
    operator.className = 'lgr-advanced-filter-condition-control lgr-advanced-filter-condition-operator';
    operator.setAttribute('aria-label', `Condition ${number} operator`);
    operatorOptions(condition.filterType as ColumnKind).forEach((candidate) => {
      const option = document.createElement('option');
      option.value = candidate;
      option.textContent = operatorLabel(candidate);
      option.selected = candidate === condition.type;
      operator.append(option);
    });

    const valueHost = document.createElement('div');
    valueHost.className = 'lgr-advanced-filter-condition-value-host';
    valueHost.append(this.valueControl(condition, path, number));
    this.applySelectWidths(column, operator);
    column.addEventListener('change', () => this.changeColumn(path, column.value));
    operator.addEventListener('change', () => this.changeOperator(path, operator.value));
    row.append(move, column, operator, valueHost, iconButton(`Remove condition ${number}`, '×', () => this.remove(path)));
    return row;
  }

  private valueControl(condition: ColumnAdvancedFilterModel, path: number[], number: number): HTMLElement {
    if (condition.filterType === 'boolean' || condition.type === 'blank' || condition.type === 'notBlank') {
      const empty = document.createElement('span');
      empty.className = 'lgr-advanced-filter-condition-no-value';
      empty.textContent = 'No value needed';
      return empty;
    }
    const input = document.createElement('input');
    input.className = 'lgr-advanced-filter-condition-control lgr-advanced-filter-condition-value';
    input.setAttribute('aria-label', `Condition ${number} value`);
    input.value = 'filter' in condition && condition.filter != null ? String(condition.filter) : '';
    if (condition.filterType === 'number' || condition.filterType === 'bigint') {
      input.type = 'number';
      input.step = 'any';
    } else if (condition.filterType === 'date' || condition.filterType === 'dateString') {
      input.type = 'date';
    } else if (condition.filterType === 'dateTime' || condition.filterType === 'dateTimeString') {
      input.type = 'datetime-local';
    }
    input.addEventListener('change', () => this.changeValue(path, input.value));
    return input;
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

  private applySelectWidths(...selects: HTMLSelectElement[]): void {
    const settings = this.params.options;
    for (const select of selects) {
      if (settings?.pillSelectMinWidth) select.style.minWidth = `${settings.pillSelectMinWidth}px`;
      if (settings?.pillSelectMaxWidth) select.style.maxWidth = `${settings.pillSelectMaxWidth}px`;
    }
  }

  private rootModel(): JoinModel {
    return this.staged?.filterType === 'join'
      ? cloneModel(this.staged) as JoinModel
      : joinModel(this.rootJoin, this.staged ? [cloneModel(this.staged)!] : []);
  }

  private setRoot(root: JoinModel): void {
    this.rootJoin = root.type;
    this.staged = root.conditions.length === 0
      ? null
      : root.conditions.length === 1
        ? root.conditions[0]!
        : root;
  }

  private setJoin(path: number[], value: JoinType): void {
    const root = this.rootModel();
    this.groupAt(root, path).type = value;
    this.setRoot(root);
    this.modelChanged();
  }

  private addCondition(path: number[]): void {
    const condition = this.defaultCondition();
    if (!condition) return;
    const root = this.rootModel();
    this.groupAt(root, path).conditions.push(condition);
    this.setRoot(root);
    this.modelChanged();
  }

  private addGroup(path: number[]): void {
    const condition = this.defaultCondition();
    if (!condition) return;
    const root = this.rootModel();
    this.groupAt(root, path).conditions.push(joinModel('AND', [condition]));
    this.setRoot(root);
    this.modelChanged();
  }

  private remove(path: number[]): void {
    const root = this.rootModel();
    const parent = this.groupAt(root, path.slice(0, -1));
    parent.conditions.splice(path.at(-1) ?? 0, 1);
    this.removeEmptyGroups(root);
    this.setRoot(root);
    this.modelChanged();
  }

  private move(path: number[], delta: number): void {
    this.moveTo(path, (path.at(-1) ?? 0) + delta);
  }

  private moveTo(path: number[], targetIndex: number): void {
    const root = this.rootModel();
    const parent = this.groupAt(root, path.slice(0, -1));
    const index = path.at(-1) ?? 0;
    if (targetIndex < 0 || targetIndex >= parent.conditions.length || targetIndex === index) return;
    const [condition] = parent.conditions.splice(index, 1);
    if (!condition) return;
    parent.conditions.splice(targetIndex, 0, condition);
    this.setRoot(root);
    this.modelChanged();
  }

  private changeColumn(path: number[], columnId: string): void {
    const root = this.rootModel();
    const current = this.itemAt(root, path);
    if (current.filterType === 'join') return;
    const selected = this.params.columns.find((candidate) => candidate.id === columnId) ?? this.params.columns[0];
    if (!selected) return;
    const kind = selected.kind ?? 'text';
    const operators = operatorOptions(kind);
    const type = operators.includes(current.type) ? current.type : operators[0]!;
    this.replaceAt(root, path, columnModel(selected.id, kind, type, 'filter' in current ? current.filter : ''));
    this.setRoot(root);
    this.modelChanged();
  }

  private changeOperator(path: number[], type: string): void {
    const root = this.rootModel();
    const current = this.itemAt(root, path);
    if (current.filterType === 'join') return;
    this.replaceAt(root, path, columnModel(current.colId, current.filterType as ColumnKind, type, 'filter' in current ? current.filter : ''));
    this.setRoot(root);
    this.modelChanged();
  }

  private changeValue(path: number[], value: string): void {
    const root = this.rootModel();
    const current = this.itemAt(root, path);
    if (current.filterType === 'join') return;
    const filter = current.filterType === 'number' || current.filterType === 'bigint' ? Number(value) : value;
    this.replaceAt(root, path, { ...current, filter } as AdvancedFilterModel);
    this.setRoot(root);
    this.modelChanged();
  }

  private defaultCondition(): AdvancedFilterModel | null {
    const column = this.params.columns[0];
    if (!column) return null;
    const kind = column.kind ?? 'text';
    return columnModel(column.id, kind, kind === 'boolean' ? 'true' : kind === 'text' ? 'contains' : 'equals', '');
  }

  private groupAt(root: JoinModel, path: number[]): JoinModel {
    let group = root;
    for (const index of path) {
      const item = group.conditions[index];
      if (!item || item.filterType !== 'join') throw new Error('Invalid advanced filter group path');
      group = item as JoinModel;
    }
    return group;
  }

  private itemAt(root: JoinModel, path: number[]): AdvancedFilterModel {
    const parent = this.groupAt(root, path.slice(0, -1));
    const item = parent.conditions[path.at(-1) ?? 0];
    if (!item) throw new Error('Invalid advanced filter condition path');
    return item;
  }

  private replaceAt(root: JoinModel, path: number[], value: AdvancedFilterModel): void {
    const parent = this.groupAt(root, path.slice(0, -1));
    parent.conditions[path.at(-1) ?? 0] = value;
  }

  private removeEmptyGroups(group: JoinModel): void {
    group.conditions = group.conditions.filter((condition) => {
      if (condition.filterType !== 'join') return true;
      this.removeEmptyGroups(condition as JoinModel);
      return condition.conditions.length > 0;
    });
  }

  private modelChanged(): void {
    this.expressionDraft = serialiseAdvancedFilterModel(this.staged);
    this.renderRules();
    this.syncExpression();
  }

  private syncExpression(): void {
    this.expression.value = this.expressionDraft;
    this.showError(null);
  }

  private onExpressionInput(): void {
    this.expressionDraft = this.expression.value;
    if (this.expressionDraft.trim() === '') {
      this.staged = null;
      this.renderRules();
      this.showError(null);
      return;
    }
    const result = parseAdvancedFilterExpression(this.expressionDraft, this.params.columns);
    if (result.error) {
      this.showError(`${result.error.message} (at ${result.error.position + 1})`);
      return;
    }
    this.staged = result.model;
    if (result.model.filterType === 'join') this.rootJoin = result.model.type;
    this.renderRules();
    this.showError(null);
  }

  private showError(message: string | null): void {
    this.error.textContent = message ?? '';
    this.error.hidden = !message;
    this.expression.setAttribute('aria-invalid', String(!!message));
    this.applyButton.disabled = !!message;
  }

  private apply(): void {
    if (!this.error.hidden) return;
    this.params.onApply(cloneModel(this.staged));
  }

  private close(): void {
    if (this.destroyed) return;
    this.params.onClose();
  }

  private onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(this.dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hidden && !element.closest('[hidden]'));
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

function cloneModel(model: AdvancedFilterModel | null): AdvancedFilterModel | null {
  return model ? structuredClone(model) : null;
}

function joinModel(type: JoinType, conditions: AdvancedFilterModel[]): JoinModel {
  return { filterType: 'join', type, conditions } as JoinModel;
}

function columnModel(colId: string, kind: ColumnKind, type: string, value: unknown): AdvancedFilterModel {
  if (kind === 'boolean') return { filterType: 'boolean', colId, type } as AdvancedFilterModel;
  if (type === 'blank' || type === 'notBlank') return { filterType: kind, colId, type } as AdvancedFilterModel;
  return { filterType: kind, colId, type, filter: kind === 'number' || kind === 'bigint' ? Number(value) : value } as AdvancedFilterModel;
}

function button(label: string, handler: () => void, className?: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  if (className) element.className = className;
  element.addEventListener('click', handler);
  return element;
}

function iconButton(label: string, symbol: string, handler: () => void): HTMLButtonElement {
  const element = button(symbol, handler, 'lgr-advanced-filter-icon-button');
  element.setAttribute('aria-label', label);
  element.title = label;
  return element;
}

function operatorOptions(kind: ColumnKind): string[] {
  return kind === 'boolean'
    ? ['true', 'false']
    : kind === 'number' || kind === 'date' || kind === 'dateString' || kind === 'dateTime' || kind === 'dateTimeString' || kind === 'bigint'
      ? ['equals', 'notEqual', 'lessThan', 'lessThanOrEqual', 'greaterThan', 'greaterThanOrEqual', 'blank', 'notBlank']
      : ['equals', 'notEqual', 'contains', 'notContains', 'startsWith', 'endsWith', 'blank', 'notBlank'];
}

function operatorLabel(value: string): string {
  return ({
    equals: 'equals', notEqual: 'does not equal', lessThan: 'less than', lessThanOrEqual: 'at most',
    greaterThan: 'greater than', greaterThanOrEqual: 'at least', contains: 'contains',
    notContains: 'does not contain', startsWith: 'starts with', endsWith: 'ends with',
    blank: 'is blank', notBlank: 'is not blank', true: 'is true', false: 'is false',
  } as Record<string, string>)[value] ?? value;
}

function humanise(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.length ? spaced[0]!.toUpperCase() + spaced.slice(1) : value;
}

function sameParent(first: number[], second: number[]): boolean {
  return first.length === second.length && first.slice(0, -1).every((value, index) => value === second[index]);
}

function uniqueId(suffix: string): string {
  return `lgr-advanced-filter-builder-${suffix}-${Math.random().toString(36).slice(2)}`;
}

function copyAgThemeVariables(source: HTMLElement, target: HTMLElement): void {
  const computed = getComputedStyle(source);
  for (let index = 0; index < computed.length; index++) {
    const name = computed.item(index);
    if (name.startsWith('--ag-')) target.style.setProperty(name, computed.getPropertyValue(name));
  }
}
