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
