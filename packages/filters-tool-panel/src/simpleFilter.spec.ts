/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { SimpleFilter, textConditionMatches, textModelMatches } from './simpleFilter';

function initFilter(
  changed: () => void = () => {},
  getValue?: (node: unknown) => unknown,
): SimpleFilter {
  const filter = new SimpleFilter();
  filter.init({ filterChangedCallback: changed, getValue });
  return filter;
}

function setInput(filter: SimpleFilter, label: string, value: string): void {
  const input = filter
    .getGui()
    .querySelector<HTMLInputElement>('input[aria-label="' + label + '"]')!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setOperator(filter: SimpleFilter, label: string, value: string): void {
  const select = filter
    .getGui()
    .querySelector<HTMLSelectElement>('select[aria-label="' + label + '"]')!;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('SimpleFilter', () => {
  it('starts inactive and builds a single text model from the primary condition', () => {
    const changed = vi.fn();
    const filter = initFilter(changed);
    expect(filter.isFilterActive()).toBe(false);
    expect(filter.getModel()).toBeNull();

    setOperator(filter, 'Primary filtering operator', 'equals');
    setInput(filter, 'Filter Value', 'Widget');
    expect(changed).toHaveBeenCalled();
    expect(filter.getModel()).toEqual({ filterType: 'text', type: 'equals', filter: 'Widget' });
  });

  it('joins a secondary condition with the selected boolean operator', () => {
    const filter = initFilter();
    setInput(filter, 'Filter Value', 'Widget');
    setOperator(filter, 'Secondary filtering operator', 'endsWith');
    setInput(filter, 'Filter to Value', 'et');
    expect(filter.getModel()).toEqual({
      filterType: 'text',
      operator: 'AND',
      conditions: [
        { type: 'contains', filter: 'Widget' },
        { type: 'endsWith', filter: 'et' },
      ],
    });

    const or = filter.getGui().querySelector<HTMLInputElement>('input[aria-label="OR"]')!;
    or.checked = true;
    or.dispatchEvent(new Event('change', { bubbles: true }));
    expect(filter.getModel()).toMatchObject({ operator: 'OR' });
  });

  it('treats blank/not-blank operators as input-free conditions', () => {
    const filter = initFilter();
    setOperator(filter, 'Primary filtering operator', 'notBlank');
    expect(
      filter.getGui().querySelector<HTMLInputElement>('input[aria-label="Filter Value"]')?.hidden,
    ).toBe(true);
    expect(filter.getModel()).toEqual({ filterType: 'text', type: 'notBlank', filter: null });
  });

  it('round-trips a combined model through setModel', () => {
    const filter = initFilter();
    filter.setModel({
      filterType: 'text',
      operator: 'OR',
      conditions: [
        { type: 'equals', filter: 'A' },
        { type: 'startsWith', filter: 'B' },
      ],
    });
    expect(filter.getModel()).toEqual({
      filterType: 'text',
      operator: 'OR',
      conditions: [
        { type: 'equals', filter: 'A' },
        { type: 'startsWith', filter: 'B' },
      ],
    });
    expect(
      filter
        .getGui()
        .querySelector<HTMLSelectElement>('select[aria-label="Primary filtering operator"]')?.value,
    ).toBe('equals');
  });

  it('matches rows through doesFilterPass', () => {
    const filter = initFilter(
      () => {},
      (node) => (node as { value: string }).value,
    );
    filter.setModel({ filterType: 'text', type: 'contains', filter: 'get' });
    expect(filter.doesFilterPass({ node: { value: 'Widget' }, data: {} } as never)).toBe(true);
    expect(filter.doesFilterPass({ node: { value: 'Doohickey' }, data: {} } as never)).toBe(false);
    filter.setModel(null);
    expect(filter.doesFilterPass({ node: { value: 'Widget' }, data: {} } as never)).toBe(true);
  });

  it('shares text matching helpers used by the selectable filter handler', () => {
    expect(textConditionMatches('equals', 'UK', 'uk', false)).toBe(true);
    expect(textConditionMatches('startsWith', 'Ger', 'Germany', false)).toBe(true);
    expect(textConditionMatches('blank', null, '   ', false)).toBe(true);
    expect(
      textModelMatches(
        {
          filterType: 'text',
          operator: 'OR',
          conditions: [
            { type: 'equals', filter: 'UK' },
            { type: 'equals', filter: 'US' },
          ],
        },
        'US',
      ),
    ).toBe(true);
    expect(
      textModelMatches({ filterType: 'text', type: 'contains', filter: 'get' }, 'Widget'),
    ).toBe(true);
  });

  it('reveals the join and secondary condition only once the primary has a value', () => {
    const filter = initFilter();
    const primary = filter
      .getGui()
      .querySelector<HTMLInputElement>('input[aria-label="Filter Value"]')!;
    const secondary = filter
      .getGui()
      .querySelector<HTMLInputElement>('input[aria-label="Filter to Value"]')!;

    expect(filter.getGui().querySelector<HTMLElement>('.lgr-simple-filter-join')?.hidden).toBe(
      true,
    );
    expect(secondary.closest('.lgr-simple-filter-condition')?.hidden).toBe(true);

    document.body.appendChild(filter.getGui());
    primary.focus();
    primary.value = 'Widget';
    primary.dispatchEvent(new Event('input', { bubbles: true }));

    // Typing must not re-render the control (the same input keeps focus).
    expect(document.activeElement).toBe(primary);
    expect(filter.getGui().querySelector<HTMLElement>('.lgr-simple-filter-join')?.hidden).toBe(
      false,
    );
    expect(secondary.closest('.lgr-simple-filter-condition')?.hidden).toBe(false);
    filter.getGui().remove();
  });
});

describe('text matching helpers', () => {
  it('covers every operator, including case-sensitive and blank handling', () => {
    // case-sensitive path keeps both sides unlowercased
    expect(textConditionMatches('equals', 'UK', 'UK', true)).toBe(true);
    expect(textConditionMatches('equals', 'UK', 'uk', true)).toBe(false);

    expect(textConditionMatches('notEqual', 'uk', 'us', false)).toBe(true);
    expect(textConditionMatches('notEqual', 'uk', 'uk', false)).toBe(false);
    expect(textConditionMatches('notContains', 'wid', 'Widget', false)).toBe(false);
    expect(textConditionMatches('notContains', 'xyz', 'Widget', false)).toBe(true);
    expect(textConditionMatches('endsWith', 'get', 'Widget', false)).toBe(true);
    expect(textConditionMatches('endsWith', 'wid', 'Widget', false)).toBe(false);
    expect(textConditionMatches('notBlank', null, 'Widget', false)).toBe(true);
    expect(textConditionMatches('notBlank', null, '   ', false)).toBe(false);
    expect(textConditionMatches('blank', null, 'Widget', false)).toBe(false);
  });

  it('handles null models, null values, empty conditions, and AND joins', () => {
    expect(textModelMatches(null, 'anything')).toBe(true);
    expect(textModelMatches({ filterType: 'text', type: 'blank', filter: null }, null)).toBe(true);
    expect(
      textModelMatches(
        { filterType: 'text', operator: 'AND', conditions: [{ type: 'equals', filter: '' }] },
        'Widget',
      ),
    ).toBe(true);
    expect(
      textModelMatches(
        {
          filterType: 'text',
          operator: 'AND',
          conditions: [
            { type: 'equals', filter: 'Widget' },
            { type: 'endsWith', filter: 'et' },
          ],
        },
        'Widget',
      ),
    ).toBe(true);
    expect(
      textModelMatches(
        {
          filterType: 'text',
          operator: 'AND',
          conditions: [
            { type: 'equals', filter: 'Widget' },
            { type: 'equals', filter: 'Doohickey' },
          ],
        },
        'Widget',
      ),
    ).toBe(false);
    // a missing type/filter falls back to 'contains'/''
    expect(textModelMatches({ filterType: 'text' }, 'Widget')).toBe(true);
  });
});

describe('SimpleFilter model hydration', () => {
  it('rehydrates single-condition and empty models without throwing', () => {
    const filter = initFilter();

    filter.setModel({ filterType: 'text', type: 'equals', filter: 'A' });
    expect(filter.getModel()).toEqual({ filterType: 'text', type: 'equals', filter: 'A' });

    filter.setModel({ filterType: 'text', operator: 'AND', conditions: [] });
    expect(filter.getModel()).toBeNull();

    filter.setModel({
      filterType: 'text',
      operator: 'AND',
      conditions: [{ type: 'equals', filter: null }],
    });
    expect(filter.getModel()).toBeNull();

    filter.setModel({ filterType: 'text' });
    expect(filter.getModel()).toBeNull();
  });

  it('matches when no getValue is supplied, coercing the cell value to empty', () => {
    const filter = new SimpleFilter();
    filter.init({});
    filter.setModel({ filterType: 'text', type: 'blank', filter: null });
    expect(filter.doesFilterPass({ node: {}, data: {} } as never)).toBe(true);
  });
});
