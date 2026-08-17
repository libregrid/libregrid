/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import type { ColDef, IFilter } from 'ag-grid-community';
import { FiltersToolPanel } from './filtersToolPanel';

function fakeFilter(): IFilter {
  const gui = document.createElement('div');
  gui.className = 'fake-filter-gui';
  return {
    getGui: () => gui,
    setModel: vi.fn(),
    destroy: vi.fn(),
  } as unknown as IFilter;
}

const COLUMNS: ColDef[] = [
  {
    field: 'country',
    filter: 'agSetColumnFilter',
    filterParams: { values: ['France', 'Germany'] },
  },
  { field: 'age', filter: 'agNumberColumnFilter' },
  { field: 'name', filter: 'agTextColumnFilter' },
  { field: 'hidden', filter: true, suppressFiltersToolPanel: true },
];

function api(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { getColumnDefs: () => COLUMNS, ...overrides };
}

function cards(panel: FiltersToolPanel): HTMLElement[] {
  return [
    ...panel.getGui().querySelectorAll<HTMLElement>('.lgr-filter-card:not(.lgr-filter-card-add)'),
  ];
}

function openAdd(panel: FiltersToolPanel): void {
  panel.getGui().querySelector<HTMLButtonElement>('.lgr-filter-add-button')!.click();
}

function options(panel: FiltersToolPanel): (string | null)[] {
  return [...panel.getGui().querySelectorAll<HTMLElement>('.lgr-filter-add-option')].map(
    (option) => option.textContent,
  );
}

function pick(panel: FiltersToolPanel, title: string): void {
  const option = [...panel.getGui().querySelectorAll<HTMLElement>('.lgr-filter-add-option')].find(
    (candidate) => candidate.textContent === title,
  );
  option?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}

describe('FiltersToolPanel (new card panel)', () => {
  it('opens empty — no pre-added columns — with Add Filter and pinned Cancel/Apply', () => {
    const panel = new FiltersToolPanel();
    panel.init({ api: api(), onStateUpdated: vi.fn() });
    const gui = panel.getGui();

    expect(cards(panel)).toHaveLength(0);
    expect(gui.querySelector('.lgr-filter-add-button')?.textContent).toContain('Add Filter');
    expect(gui.querySelector('.lgr-filter-panel-buttons')).not.toBeNull();
    expect(gui.querySelector<HTMLButtonElement>('[aria-label="Cancel"]')).not.toBeNull();
    const apply = gui.querySelector<HTMLButtonElement>('[aria-label="Apply"]');
    expect(apply).not.toBeNull();
    expect(apply?.disabled).toBe(true);
    expect(apply?.classList.contains('lgr-filter-panel-buttons-apply-button')).toBe(true);
  });

  it('lists filterable columns in the type-ahead and drops in a card on selection', () => {
    const panel = new FiltersToolPanel();
    panel.init({ api: api(), onStateUpdated: vi.fn() });

    openAdd(panel);
    expect(options(panel)).toEqual(['Country', 'Age', 'Name']);

    pick(panel, 'Age');
    expect(cards(panel)).toHaveLength(1);
    expect(cards(panel)[0]!.textContent).toContain('Age');
    expect(cards(panel)[0]!.classList.contains('lgr-filter-card-expanded')).toBe(true);

    // The type-ahead closed back to the Add Filter button and the added
    // column no longer appears among the available options.
    expect(panel.getGui().querySelector('.lgr-filter-add-button')).not.toBeNull();
    openAdd(panel);
    expect(options(panel)).toEqual(['Country', 'Name']);
  });

  it('filters the type-ahead list and selects with Enter', () => {
    const panel = new FiltersToolPanel();
    panel.init({ api: api(), onStateUpdated: vi.fn() });

    openAdd(panel);
    const input = panel.getGui().querySelector<HTMLInputElement>('.lgr-filter-add-input')!;
    input.value = 'cou';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(options(panel)).toEqual(['Country']);

    const next = panel.getGui().querySelector<HTMLInputElement>('.lgr-filter-add-input')!;
    next.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(cards(panel)).toHaveLength(1);
    expect(cards(panel)[0]!.textContent).toContain('Country');
  });

  it('deleting a card clears its filter and returns the column to the type-ahead', () => {
    const setFilterModel = vi.fn();
    const onFilterChanged = vi.fn();
    const panel = new FiltersToolPanel();
    panel.init({
      api: api({ getFilterModel: () => ({}), setFilterModel, onFilterChanged }),
      onStateUpdated: vi.fn(),
    });

    openAdd(panel);
    pick(panel, 'Age');
    expect(cards(panel)).toHaveLength(1);
    cards(panel)[0]!.querySelector<HTMLButtonElement>('[aria-label="Delete Age filter"]')!.click();

    expect(cards(panel)).toHaveLength(0);
    expect(setFilterModel).toHaveBeenCalledWith({});
    expect(onFilterChanged).toHaveBeenCalledOnce();
    openAdd(panel);
    expect(options(panel)).toContain('Age');
  });

  it('renders the single selectable card for a text column', () => {
    const panel = new FiltersToolPanel();
    panel.init({
      api: api({
        getColumnDefs: () => [{ field: 'name', filter: 'agTextColumnFilter' }],
        getColumn: () => ({
          getColDef: () => ({ field: 'name', filter: 'agTextColumnFilter' }),
          getColId: () => 'name',
        }),
      }),
      onStateUpdated: vi.fn(),
    });

    openAdd(panel);
    pick(panel, 'Name');
    const card = cards(panel)[0]!;
    const select = card.querySelector<HTMLSelectElement>('select[aria-label="Filter type"]')!;
    expect([...select.options].map((option) => option.textContent)).toEqual([
      'Simple Filter',
      'Selection Filter',
    ]);
    expect(select.value).toBe('0');
    expect(card.querySelector('.lgr-simple-filter')).not.toBeNull();
    expect(card.querySelector('.lgr-set-filter')).toBeNull();
  });

  it('renders the single selectable card for a set column and switches to Selection', () => {
    const panel = new FiltersToolPanel();
    panel.init({
      api: api({
        getColumnDefs: () => [
          {
            field: 'country',
            filter: 'agSetColumnFilter',
            filterParams: { values: ['France', 'Germany'] },
          },
        ],
        getColumn: () => ({
          getColDef: () => ({ field: 'country', filter: 'agSetColumnFilter' }),
          getColId: () => 'country',
        }),
        forEachLeafNode: vi.fn(),
      }),
      onStateUpdated: vi.fn(),
    });

    openAdd(panel);
    pick(panel, 'Country');
    const card = cards(panel)[0]!;
    // One card version: the selectable filter, defaulting to Simple Filter.
    expect(card.querySelector('.lgr-selectable-filter')).not.toBeNull();
    expect(card.querySelector('.lgr-simple-filter')).not.toBeNull();
    expect(card.querySelector('.lgr-set-filter')).toBeNull();

    const select = card.querySelector<HTMLSelectElement>('select[aria-label="Filter type"]')!;
    select.value = '1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(card.querySelector('.lgr-set-filter')).not.toBeNull();
    expect(card.querySelector('input[aria-label="Search filter values"]')).not.toBeNull();
  });

  it('embeds the selectable filter with a Simple-Filter-first mode selector', () => {
    const panel = new FiltersToolPanel();
    panel.init({
      api: api({
        getColumnDefs: () => [
          {
            field: 'status',
            filter: 'agSelectableColumnFilter',
            filterParams: {
              filters: [
                { name: 'Simple Filter', filter: 'agTextColumnFilter' },
                {
                  name: 'Selection Filter',
                  filter: 'agSetColumnFilter',
                  filterParams: { values: ['Draft', 'Approved'] },
                },
              ],
            },
          },
        ],
        getColumn: () => ({
          getColDef: () => ({ field: 'status', filter: 'agSelectableColumnFilter' }),
          getColId: () => 'status',
        }),
      }),
      onStateUpdated: vi.fn(),
    });

    openAdd(panel);
    pick(panel, 'Status');
    const card = cards(panel)[0]!;
    const select = card.querySelector<HTMLSelectElement>('select[aria-label="Filter type"]')!;
    expect([...select.options].map((option) => option.textContent)).toEqual([
      'Simple Filter',
      'Selection Filter',
    ]);
    expect(select.value).toBe('0');
    expect(card.querySelector('.lgr-simple-filter')).not.toBeNull();

    select.value = '1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(card.querySelector('.lgr-set-filter')).not.toBeNull();
  });

  it('seeds cards from initialState and reports ordered new-panel state', () => {
    const panel = new FiltersToolPanel();
    panel.init({
      api: api({
        getColumnDefs: () => [
          { field: 'age', filter: 'agNumberColumnFilter' },
          { field: 'name', filter: 'agTextColumnFilter' },
        ],
      }),
      onStateUpdated: vi.fn(),
      initialState: {
        filters: [
          { colId: 'age', expanded: true },
          { colId: 'name', expanded: false },
        ],
      },
    });

    expect(cards(panel)).toHaveLength(2);
    expect(cards(panel)[0]!.classList.contains('lgr-filter-card-expanded')).toBe(true);
    expect(cards(panel)[1]!.classList.contains('lgr-filter-card-expanded')).toBe(false);
    expect(panel.getState().filters).toEqual([
      { colId: 'age', expanded: true },
      { colId: 'name', expanded: false },
    ]);

    panel.expandFilters(['name']);
    expect(panel.getState().expandedColIds).toEqual(['age', 'name']);
    expect(panel.getState().filters).toEqual([
      { colId: 'age', expanded: true },
      { colId: 'name', expanded: true },
    ]);
  });

  it('defaults to Cancel/Apply and stages clear/apply/cancel/reset actions when requested', () => {
    const setFilterModel = vi.fn();
    const onFilterChanged = vi.fn();
    const panel = new FiltersToolPanel();
    panel.init({
      api: api({
        getColumnDefs: () => [{ field: 'age', filter: 'agNumberColumnFilter' }],
        getColumnFilterInstance: () => Promise.resolve(fakeFilter()),
        getFilterModel: () => ({}),
        setFilterModel,
        onFilterChanged,
      }),
      onStateUpdated: vi.fn(),
      buttons: ['clear', 'apply', 'cancel', 'reset'],
    });

    for (const label of ['Clear', 'Apply', 'Cancel', 'Reset']) {
      expect(panel.getGui().querySelector('[aria-label="' + label + '"]')).not.toBeNull();
    }

    openAdd(panel);
    pick(panel, 'Age');
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Clear"]')!.click();
    expect(setFilterModel).toHaveBeenCalledWith(null);
    expect(onFilterChanged).toHaveBeenCalledOnce();

    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Apply"]')!.click();
    expect(onFilterChanged).toHaveBeenCalledTimes(2);
  });

  it('renders native card anatomy: heading, chevron, delete, hidden body, active dot', () => {
    const panel = new FiltersToolPanel();
    panel.init({
      api: api({
        getColumnDefs: () => [{ field: 'name', filter: 'agTextColumnFilter' }],
        getFilterModel: () => ({ name: { filterType: 'text' } }),
        setFilterModel: vi.fn(),
        onFilterChanged: vi.fn(),
      }),
      onStateUpdated: vi.fn(),
    });

    openAdd(panel);
    pick(panel, 'Name');
    const card = cards(panel)[0]!;
    expect(card.classList.contains('lgr-filter-card-active')).toBe(true);
    expect(card.querySelector('.lgr-filter-card-active-dot')).not.toBeNull();
    expect(card.querySelector('.lgr-filter-card-heading')?.getAttribute('role')).toBe('heading');

    const expand = card.querySelector<HTMLButtonElement>('.lgr-filter-card-expand')!;
    expect(expand.getAttribute('aria-expanded')).toBe('true');
    expect(card.querySelector('.lgr-filter-card-expand-icon svg')).not.toBeNull();
    expect(card.querySelector<HTMLElement>('.lgr-filter-card-body')?.hidden).toBe(false);

    expand.click();
    const collapsed = cards(panel)[0]!;
    expect(
      collapsed
        .querySelector<HTMLButtonElement>('.lgr-filter-card-expand')!
        .getAttribute('aria-expanded'),
    ).toBe('false');
    expect(collapsed.querySelector<HTMLElement>('.lgr-filter-card-body')?.hidden).toBe(true);

    collapsed.querySelector<HTMLButtonElement>('[aria-label="Delete Name filter"]')!.click();
    expect(cards(panel)).toHaveLength(0);
  });

  it('re-renders when the grid loads columns after the panel was created', () => {
    const listeners = new Map<string, () => void>();
    let loaded = false;
    const panel = new FiltersToolPanel();
    panel.init({
      api: {
        getColumnDefs: () => (loaded ? [{ field: 'late', filter: 'agTextColumnFilter' }] : []),
        addEventListener: vi.fn((name: string, listener: () => void) =>
          listeners.set(name, listener),
        ),
        removeEventListener: vi.fn((name: string) => listeners.delete(name)),
      },
      onStateUpdated: vi.fn(),
    });

    openAdd(panel);
    expect(options(panel)).toHaveLength(0);
    loaded = true;
    listeners.get('newColumnsLoaded')?.();
    // The open type-ahead re-renders with the newly loaded columns.
    expect(options(panel)).toEqual(['Late']);
    panel.destroy();
    expect(listeners.size).toBe(0);
  });

  it('keeps focus and caret in the type-ahead search across re-renders', () => {
    const panel = new FiltersToolPanel();
    panel.init({ api: api(), onStateUpdated: vi.fn() });
    document.body.appendChild(panel.getGui());

    openAdd(panel);
    const input = panel.getGui().querySelector<HTMLInputElement>('.lgr-filter-add-input')!;
    input.focus();
    input.value = 'cou';
    input.setSelectionRange(3, 3);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const active = document.activeElement as HTMLInputElement;
    expect(active?.getAttribute('aria-label')).toBe('Search filter columns');
    expect(active.value).toBe('cou');
    expect(active.selectionStart).toBe(3);
    panel.getGui().remove();
  });
});
