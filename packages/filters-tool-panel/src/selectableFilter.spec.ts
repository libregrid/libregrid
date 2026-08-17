/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { SelectableFilter, innerModelPasses } from './selectableFilter';

const DEFS = [
  { name: 'Simple Filter', filter: 'agTextColumnFilter' },
  {
    name: 'Selection Filter',
    filter: 'agSetColumnFilter',
    filterParams: { values: ['France', 'Germany'] },
  },
];

function initFilter(changed: () => void = () => {}, defaultIndex?: number): SelectableFilter {
  const filter = new SelectableFilter();
  filter.init({
    filters: DEFS,
    defaultFilterIndex: defaultIndex,
    filterChangedCallback: changed,
    getValue: (node: unknown) => (node as { value: unknown }).value,
  } as never);
  return filter;
}

describe('SelectableFilter', () => {
  it('defaults to the Simple Filter mode', () => {
    const filter = initFilter();
    const select = filter
      .getGui()
      .querySelector<HTMLSelectElement>('select[aria-label="Filter type"]')!;
    expect(select.value).toBe('0');
    expect([...select.options].map((option) => option.textContent)).toEqual([
      'Simple Filter',
      'Selection Filter',
    ]);
    expect(filter.getGui().querySelector('.lgr-simple-filter')).not.toBeNull();
    expect(filter.getGui().querySelector('.lgr-set-filter')).toBeNull();
  });

  it('switches to the Selection Filter and reports the active index', () => {
    const changed = vi.fn();
    const filter = initFilter(changed);
    const select = filter
      .getGui()
      .querySelector<HTMLSelectElement>('select[aria-label="Filter type"]')!;
    select.value = '1';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(changed).toHaveBeenCalled();
    expect(filter.getGui().querySelector('.lgr-set-filter')).not.toBeNull();
    // The active mode is selected in the UI; the model stays null until a value is chosen.
    expect(select.value).toBe('1');
    expect(filter.getModel()).toBeNull();
  });

  it('wraps the inner model and round-trips through setModel', () => {
    const filter = initFilter();
    filter.setModel({
      filterType: 'selectable',
      type: 0,
      filter: { filterType: 'text', type: 'contains', filter: 'Fra' },
    });
    expect(filter.getModel()).toEqual({
      filterType: 'selectable',
      type: 0,
      filter: { filterType: 'text', type: 'contains', filter: 'Fra' },
    });

    // Switching the active type and rehydrating a set model.
    filter.setModel({
      filterType: 'selectable',
      type: 1,
      filter: { filterType: 'set', values: ['France'] },
    });
    expect(filter.getModel()).toEqual({
      filterType: 'selectable',
      type: 1,
      filter: { filterType: 'set', values: ['France'] },
    });
    expect(filter.getGui().querySelector('.lgr-set-filter')).not.toBeNull();
  });

  it('delegates doesFilterPass to the active inner filter', () => {
    const filter = initFilter();
    filter.setModel({
      filterType: 'selectable',
      type: 0,
      filter: { filterType: 'text', type: 'equals', filter: 'France' },
    });
    expect(filter.doesFilterPass({ node: { value: 'France' }, data: {} } as never)).toBe(true);
    expect(filter.doesFilterPass({ node: { value: 'Germany' }, data: {} } as never)).toBe(false);

    filter.setModel({
      filterType: 'selectable',
      type: 1,
      filter: { filterType: 'set', values: ['Germany'] },
    });
    expect(filter.doesFilterPass({ node: { value: 'Germany' }, data: {} } as never)).toBe(true);
    expect(filter.doesFilterPass({ node: { value: 'France' }, data: {} } as never)).toBe(false);
  });

  it('matches inner models across text, set, and number types', () => {
    expect(
      innerModelPasses({ filterType: 'text', type: 'contains', filter: 'get' }, 'Widget'),
    ).toBe(true);
    expect(innerModelPasses({ filterType: 'set', values: ['France'] }, 'France')).toBe(true);
    expect(innerModelPasses({ filterType: 'set', values: ['France'] }, 'Germany')).toBe(false);
    expect(innerModelPasses({ filterType: 'number', type: 'greaterThan', filter: 5 }, 10)).toBe(
      true,
    );
    expect(innerModelPasses({ filterType: 'number', type: 'lessThan', filter: 5 }, 10)).toBe(false);
    expect(innerModelPasses(null, 'anything')).toBe(true);
  });
});

describe('innerModelPasses edge cases', () => {
  it('coerces set-filter null and undefined values', () => {
    expect(innerModelPasses({ filterType: 'set', values: [null] }, null)).toBe(true);
    expect(
      innerModelPasses({ filterType: 'set', values: ['__libregrid_undefined__'] }, undefined),
    ).toBe(true);
  });

  it('covers number blank/notBlank across null, undefined, empty, and real values', () => {
    expect(innerModelPasses({ filterType: 'number', type: 'blank' }, null)).toBe(true);
    expect(innerModelPasses({ filterType: 'number', type: 'blank' }, undefined)).toBe(true);
    expect(innerModelPasses({ filterType: 'number', type: 'blank' }, '')).toBe(true);
    expect(innerModelPasses({ filterType: 'number', type: 'blank' }, 'x')).toBe(false);
    expect(innerModelPasses({ filterType: 'number', type: 'notBlank' }, null)).toBe(false);
    expect(innerModelPasses({ filterType: 'number', type: 'notBlank' }, undefined)).toBe(false);
    expect(innerModelPasses({ filterType: 'number', type: 'notBlank' }, '')).toBe(false);
    expect(innerModelPasses({ filterType: 'number', type: 'notBlank' }, 'x')).toBe(true);
  });

  it('covers NaN guards, inRange, ordering operators, and the default branch', () => {
    expect(innerModelPasses({ filterType: 'number', type: 'equals', filter: 5 }, 'abc')).toBe(false);
    expect(innerModelPasses({ filterType: 'number', type: 'equals', filter: 'abc' }, 5)).toBe(false);

    expect(
      innerModelPasses({ filterType: 'number', type: 'inRange', filter: 5, filterTo: 10 }, 7),
    ).toBe(true);
    expect(
      innerModelPasses({ filterType: 'number', type: 'inRange', filter: 5, filterTo: 10 }, 20),
    ).toBe(false);
    expect(
      innerModelPasses({ filterType: 'number', type: 'inRange', filter: 5, filterTo: 'x' }, 7),
    ).toBe(false);

    expect(innerModelPasses({ filterType: 'number', type: 'equals', filter: 5 }, 5)).toBe(true);
    expect(innerModelPasses({ filterType: 'number', type: 'notEqual', filter: 5 }, 6)).toBe(true);
    expect(innerModelPasses({ filterType: 'number', type: 'notEqual', filter: 5 }, 5)).toBe(false);
    expect(innerModelPasses({ filterType: 'number', type: 'lessThanOrEqual', filter: 5 }, 5)).toBe(
      true,
    );
    expect(innerModelPasses({ filterType: 'number', type: 'lessThanOrEqual', filter: 5 }, 6)).toBe(
      false,
    );
    expect(
      innerModelPasses({ filterType: 'number', type: 'greaterThanOrEqual', filter: 5 }, 5),
    ).toBe(true);
    expect(
      innerModelPasses({ filterType: 'number', type: 'greaterThanOrEqual', filter: 5 }, 4),
    ).toBe(false);

    // missing type defaults to 'equals'; date/bigint route through the number path
    expect(innerModelPasses({ filterType: 'number', filter: 5 }, 5)).toBe(true);
    expect(innerModelPasses({ filterType: 'date', type: 'equals', filter: 5 }, 5)).toBe(true);
    expect(innerModelPasses({ filterType: 'bigint', type: 'equals', filter: 5 }, 5)).toBe(true);

    // falsy or non-object models always pass
    expect(innerModelPasses('text', 'x')).toBe(true);
    expect(innerModelPasses(0, 'x')).toBe(true);
  });
});

describe('SelectableFilter defaults and null model', () => {
  it('falls back to text + set defs when no filters are supplied', () => {
    const filter = new SelectableFilter();
    filter.init({} as never);
    const select = filter
      .getGui()
      .querySelector<HTMLSelectElement>('select[aria-label="Filter type"]')!;
    expect([...select.options].map((option) => option.textContent)).toEqual([
      'Simple Filter',
      'Selection Filter',
    ]);
  });

  it('clears and deactivates when given a null model', () => {
    const filter = initFilter();
    filter.setModel(null);
    expect(filter.getModel()).toBeNull();
    expect(filter.isFilterActive()).toBe(false);
  });
});
