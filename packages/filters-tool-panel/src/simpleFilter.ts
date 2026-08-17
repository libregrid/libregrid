import type { IDoesFilterPassParams } from 'ag-grid-community';

/** Operators supported by the Simple Filter (AG Grid's text filter set). */
export type SimpleFilterType =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'notEqual'
  | 'startsWith'
  | 'endsWith'
  | 'blank'
  | 'notBlank';

export interface SimpleFilterCondition {
  type: SimpleFilterType;
  filter: string | null;
}

/** Text-style simple filter model — single condition or two joined conditions. */
export interface SimpleFilterModel {
  filterType: 'text';
  type?: SimpleFilterType;
  filter?: string | null;
  operator?: 'AND' | 'OR';
  conditions?: SimpleFilterCondition[];
}

export interface SimpleFilterFilterParams {
  defaultJoinOperator?: 'AND' | 'OR';
  filterPlaceholder?: string;
}

export interface SimpleFilterParams {
  filterChangedCallback?: () => void;
  getValue?: (node: unknown) => unknown;
  filterParams?: SimpleFilterFilterParams;
}

interface OperatorDef {
  value: SimpleFilterType;
  label: string;
  inputs: 0 | 1;
}

const OPERATORS: OperatorDef[] = [
  { value: 'contains', label: 'Contains', inputs: 1 },
  { value: 'notContains', label: 'Does not contain', inputs: 1 },
  { value: 'equals', label: 'Equals', inputs: 1 },
  { value: 'notEqual', label: 'Does not equal', inputs: 1 },
  { value: 'startsWith', label: 'Begins with', inputs: 1 },
  { value: 'endsWith', label: 'Ends with', inputs: 1 },
  { value: 'blank', label: 'Blank', inputs: 0 },
  { value: 'notBlank', label: 'Not blank', inputs: 0 },
];

/** True when one text condition matches a cell value. */
export function textConditionMatches(
  type: SimpleFilterType,
  filter: string | null,
  actual: string,
  caseSensitive: boolean,
): boolean {
  const value = caseSensitive ? actual : actual.toLocaleLowerCase();
  const expected = caseSensitive ? (filter ?? '') : (filter ?? '').toLocaleLowerCase();
  switch (type) {
    case 'equals':
      return value === expected;
    case 'notEqual':
      return value !== expected;
    case 'contains':
      return value.includes(expected);
    case 'notContains':
      return !value.includes(expected);
    case 'startsWith':
      return value.startsWith(expected);
    case 'endsWith':
      return value.endsWith(expected);
    case 'blank':
      return actual.trim() === '';
    case 'notBlank':
      return actual.trim() !== '';
    default:
      return true;
  }
}

/** True when a simple filter model matches a cell value. */
export function textModelMatches(model: SimpleFilterModel | null, value: unknown): boolean {
  if (!model) return true;
  const actual = String(value ?? '');
  if (model.operator && model.conditions) {
    const conditions = model.conditions.filter(
      (condition) => condition.filter !== null && condition.filter !== '',
    );
    if (!conditions.length) return true;
    const results = conditions.map((condition) =>
      textConditionMatches(condition.type, condition.filter, actual, false),
    );
    return model.operator === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }
  return textConditionMatches(model.type ?? 'contains', model.filter ?? '', actual, false);
}

/**
 * The rule-based Simple Filter (AG Grid's text filter look): a primary
 * operator + input, an AND/OR join, and one secondary condition. The join and
 * secondary condition stay hidden until the primary input has a value.
 * @feature Filters Tool Panel
 */
export class SimpleFilter {
  private readonly gui = document.createElement('div');
  private params: SimpleFilterParams | undefined;
  private primaryType: SimpleFilterType = 'contains';
  private primaryValue = '';
  private secondaryType: SimpleFilterType = 'contains';
  private secondaryValue = '';
  private join: 'AND' | 'OR' = 'AND';

  public constructor() {
    this.gui.className = 'lgr-simple-filter';
    this.gui.setAttribute('aria-label', 'Simple filter');
  }

  public init(params: SimpleFilterParams): void {
    this.params = params;
    this.join = params.filterParams?.defaultJoinOperator ?? 'AND';
    this.render();
  }

  public getGui(): HTMLElement {
    return this.gui;
  }

  public isFilterActive(): boolean {
    return this.getModel() !== null;
  }

  public getModel(): SimpleFilterModel | null {
    const primary = this.condition(this.primaryType, this.primaryValue);
    if (!primary) return null;
    const secondary = this.condition(this.secondaryType, this.secondaryValue);
    if (!secondary) return { filterType: 'text', type: primary.type, filter: primary.filter };
    return { filterType: 'text', operator: this.join, conditions: [primary, secondary] };
  }

  public setModel(model: SimpleFilterModel | null): void {
    this.primaryType = 'contains';
    this.primaryValue = '';
    this.secondaryType = 'contains';
    this.secondaryValue = '';
    this.join = 'AND';
    if (!model) {
      this.render();
      return;
    }
    this.join = model.operator ?? 'AND';
    if (model.conditions) {
      const first = model.conditions[0];
      const second = model.conditions[1];
      if (first) {
        this.primaryType = first.type;
        this.primaryValue = first.filter ?? '';
      }
      if (second) {
        this.secondaryType = second.type;
        this.secondaryValue = second.filter ?? '';
      }
    } else {
      this.primaryType = model.type ?? 'contains';
      this.primaryValue = model.filter ?? '';
    }
    this.render();
  }

  public doesFilterPass(params: IDoesFilterPassParams): boolean {
    const model = this.getModel();
    if (!model) return true;
    const value = this.params?.getValue?.(params.node);
    return textModelMatches(model, value);
  }

  public destroy(): void {
    this.gui.replaceChildren();
  }

  private condition(type: SimpleFilterType, value: string): SimpleFilterCondition | null {
    if (type === 'blank' || type === 'notBlank') return { type, filter: null };
    return value.trim() === '' ? null : { type, filter: value };
  }

  private hasPrimaryValue(): boolean {
    return this.condition(this.primaryType, this.primaryValue) !== null;
  }

  private render(): void {
    this.gui.replaceChildren();
    this.gui.appendChild(
      this.renderCondition(
        'Primary',
        'Filter Value',
        this.primaryType,
        this.primaryValue,
        (type) => {
          this.primaryType = type;
          this.primaryValue = '';
          this.render();
          this.notify();
        },
        (value) => {
          // Toggle the join + secondary visibility without re-rendering so
          // the primary input keeps focus while typing.
          this.primaryValue = value;
          this.syncVisibility();
          this.notify();
        },
      ),
    );
    this.gui.appendChild(this.renderJoin());
    this.gui.appendChild(
      this.renderCondition(
        'Secondary',
        'Filter to Value',
        this.secondaryType,
        this.secondaryValue,
        (type) => {
          this.secondaryType = type;
          this.secondaryValue = '';
          this.render();
          this.notify();
        },
        (value) => {
          this.secondaryValue = value;
          this.notify();
        },
      ),
    );
    this.syncVisibility();
  }

  private syncVisibility(): void {
    const hasPrimary = this.hasPrimaryValue();
    const join = this.gui.querySelector<HTMLElement>('.lgr-simple-filter-join');
    const secondary = this.gui.querySelectorAll<HTMLElement>('.lgr-simple-filter-condition')[1];
    if (join) join.hidden = !hasPrimary;
    if (secondary) secondary.hidden = !hasPrimary;
  }

  private renderCondition(
    prefix: string,
    inputLabel: string,
    type: SimpleFilterType,
    value: string,
    onOperator: (type: SimpleFilterType) => void,
    onInput: (value: string) => void,
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'lgr-simple-filter-condition';

    const select = document.createElement('select');
    select.className = 'lgr-select';
    select.setAttribute('aria-label', prefix + ' filtering operator');
    for (const operator of OPERATORS) {
      const option = document.createElement('option');
      option.value = operator.value;
      option.textContent = operator.label;
      option.selected = operator.value === type;
      select.appendChild(option);
    }
    select.addEventListener('change', () => onOperator(select.value as SimpleFilterType));
    wrapper.appendChild(select);

    const operator = OPERATORS.find((candidate) => candidate.value === type);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'lgr-input lgr-simple-filter-input';
    input.placeholder = this.params?.filterParams?.filterPlaceholder ?? 'Filter...';
    input.setAttribute('aria-label', inputLabel);
    input.value = value;
    input.hidden = operator?.inputs === 0;
    input.addEventListener('input', () => onInput(input.value));
    wrapper.appendChild(input);
    return wrapper;
  }

  private renderJoin(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'lgr-simple-filter-join';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', 'Filter condition join');
    for (const join of ['AND', 'OR'] as const) {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'lgr-simple-filter-join';
      radio.value = join;
      radio.checked = join === this.join;
      radio.setAttribute('aria-label', join);
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.join = join;
          this.notify();
        }
      });
      label.append(radio, document.createTextNode(join));
      group.appendChild(label);
    }
    return group;
  }

  private notify(): void {
    this.params?.filterChangedCallback?.();
  }
}
