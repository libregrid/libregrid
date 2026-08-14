/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { SetFilter } from './setFilter';
import { SetFilterModule } from './setFilterModule';

interface Row {
  country: string;
}

let api: GridApi<Row> | undefined;

afterEach(() => {
  api?.destroy();
  api = undefined;
});

describe('SetFilterModule', () => {
  it('filters grid rows and round-trips a set model', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, SetFilterModule]);
    const element = document.createElement('div');
    document.body.appendChild(element);
    api = createGrid(element, {
      enableFilterHandlers: false,
      columnDefs: [{ field: 'country', filter: 'agSetColumnFilter', filterParams: { values: ['UK', 'US', 'DE'] } }],
      rowData: [{ country: 'UK' }, { country: 'US' }, { country: 'DE' }],
    });

    api.setFilterModel({ country: { filterType: 'set', values: ['US'] } });
    api.onFilterChanged();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    expect(api.getDisplayedRowAtIndex(0)?.data).toEqual({ country: 'US' });

    expect(api.getFilterModel()).toEqual({ country: { filterType: 'set', values: ['US'] } });
    api.setFilterModel(null);
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
  });

  it('filters through the registered handler when filter handlers are enabled', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, SetFilterModule]);
    const element = document.createElement('div');
    document.body.appendChild(element);
    api = createGrid(element, {
      enableFilterHandlers: true,
      columnDefs: [{ field: 'country', filter: 'agSetColumnFilter' }],
      rowData: [{ country: 'UK' }, { country: 'US' }],
    });

    api.setFilterModel({ country: { filterType: 'set', values: ['UK'] } });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    expect(api.getFilterModel()).toEqual({ country: { filterType: 'set', values: ['UK'] } });
  });

  it('virtualises large value lists and applies a mini filter case-insensitively', () => {
    const filter = new SetFilter();
    const values = Array.from({ length: 50_000 }, (_, index) => `Value ${index}`);
    const events = { changed: 0, modified: 0 };
    filter.init({
      values,
      api: { forEachLeafNode: () => undefined },
      context: undefined,
      colDef: {},
      column: {} as never,
      getValue: () => null,
      doesRowPassOtherFilter: () => true,
      rowModel: {} as never,
      filterChangedCallback: () => events.changed++,
      filterModifiedCallback: () => events.modified++,
    });

    filter.setMiniFilter('value 49999');
    expect(filter.getGui().querySelectorAll('.lgr-set-filter-value')).toHaveLength(1);
    expect(filter.getGui().textContent).toContain('Value 49999');
    expect(events).toEqual({ changed: 0, modified: 1 });
    filter.setModel({ filterType: 'set', values: ['Value 49999'] });
    expect(filter.getModel()).toEqual({ filterType: 'set', values: ['Value 49999'] });
    filter.setModel(null);
    expect(filter.getModel()).toBeNull();
  });

  it('selects only mini-filtered values and keeps blank values distinct from undefined', () => {
    const filter = new SetFilter();
    const events = { changed: 0, modified: 0 };
    filter.init({
      values: ['UK', 'US', null, undefined] as never,
      api: { forEachLeafNode: () => undefined },
      context: undefined,
      colDef: {},
      column: {} as never,
      getValue: () => null,
      doesRowPassOtherFilter: () => true,
      rowModel: {} as never,
      filterChangedCallback: () => events.changed++,
      filterModifiedCallback: () => events.modified++,
    });

    const selectAll = () => filter.getGui().querySelector<HTMLInputElement>('[aria-label="Select all filtered values"]');
    expect(selectAll()).toBeTruthy();
    selectAll()!.checked = false;
    selectAll()!.dispatchEvent(new Event('change'));
    filter.setMiniFilter('UK');
    selectAll()!.checked = true;
    selectAll()!.dispatchEvent(new Event('change'));

    expect(filter.getModel()).toEqual({ filterType: 'set', values: ['UK'] });
    expect(filter.getFilterKeys()).toEqual([null, '__libregrid_undefined__', 'UK', 'US']);
    expect(filter.getFilterValues()).toEqual([null, undefined, 'UK', 'US']);
    expect(events).toEqual({ changed: 2, modified: 3 });
  });

  it('renders tree-list paths and allows a branch to be selected as a unit', () => {
    const filter = new SetFilter();
    filter.init({
      values: ['Europe/UK', 'Europe/DE', 'Americas/US'],
      treeList: true,
      treeListPathGetter: (value) => value?.split('/') ?? null,
      api: { forEachLeafNode: () => undefined },
      context: undefined,
      colDef: {},
      column: {} as never,
      getValue: () => null,
      doesRowPassOtherFilter: () => true,
      rowModel: {} as never,
      filterChangedCallback: () => undefined,
      filterModifiedCallback: () => undefined,
    });

    expect(filter.getGui().textContent).toContain('Europe');
    const europe = filter.getGui().querySelector<HTMLInputElement>('[aria-label="Select Europe"]');
    europe!.checked = false;
    europe!.dispatchEvent(new Event('change'));
    expect(filter.getModel()).toEqual({ filterType: 'set', values: ['Americas/US'] });
  });

  it('uses key and value formatters without changing the persisted model key', () => {
    const filter = new SetFilter();
    filter.init({
      values: [{ code: 'UK', label: 'United Kingdom' }],
      keyCreator: ({ value }) => (value as { code: string }).code,
      valueFormatter: ({ value }) => (value as { label: string }).label,
      api: { forEachLeafNode: () => undefined },
      context: undefined,
      colDef: {},
      column: {} as never,
      getValue: () => null,
      doesRowPassOtherFilter: () => true,
      rowModel: {} as never,
      filterChangedCallback: () => undefined,
      filterModifiedCallback: () => undefined,
    } as never);

    expect(filter.getFilterKeys()).toEqual(['UK']);
    expect(filter.getGui().textContent).toContain('United Kingdom');
  });

  it('honours parameter controls, custom rendering, and closes after an applied action', () => {
    const filter = new SetFilter();
    const hidePopup = vi.fn();
    filter.init({
      values: ['B', 'A'],
      suppressSorting: true,
      suppressMiniFilter: true,
      suppressSelectAll: true,
      cellHeight: 44,
      cellRenderer: ({ value }: { value: string }) => `Rendered ${value}`,
      buttons: ['apply', 'clear', 'cancel'],
      closeOnApply: true,
      api: { forEachLeafNode: () => undefined }, context: undefined, colDef: {}, column: {} as never,
      getValue: () => null, doesRowPassOtherFilter: () => true, rowModel: {} as never,
      filterChangedCallback: () => undefined, filterModifiedCallback: () => undefined,
    } as never);
    filter.afterGuiAttached({ hidePopup });
    expect(filter.getGui().querySelector('[aria-label="Search filter values"]')).toBeNull();
    expect(filter.getGui().querySelector('[aria-label="Select all filtered values"]')).toBeNull();
    expect(filter.getGui().textContent).toContain('Rendered B');
    expect(filter.getGui().querySelector<HTMLElement>('.lgr-set-filter-value')?.style.height).toBe('44px');
    filter.getGui().querySelector<HTMLButtonElement>('button')!.click();
    expect(hidePopup).toHaveBeenCalledOnce();
  });

  it('keeps the active model on refresh when requested and ignores values resolving after destruction', () => {
    let resolveValues: ((values: string[]) => void) | undefined;
    const filter = new SetFilter();
    filter.init({
      values: ({ success }: { success: (values: string[]) => void }) => { resolveValues = success; },
      suppressClearModelOnRefreshValues: true,
      api: { forEachLeafNode: () => undefined }, context: undefined, colDef: {}, column: {} as never,
      getValue: () => null, doesRowPassOtherFilter: () => true, rowModel: {} as never,
      filterChangedCallback: () => undefined, filterModifiedCallback: () => undefined,
    } as never);
    filter.setModel({ filterType: 'set', values: ['UK'] });
    filter.refreshFilterValues();
    resolveValues?.(['UK']);
    expect(filter.getModel()).toEqual({ filterType: 'set', values: ['UK'] });
    filter.destroy();
    resolveValues?.(['US']);
    expect(filter.getGui().childElementCount).toBe(0);
  });

  it('applies case sensitivity and fires one changed event for one bulk selection', () => {
    const filter = new SetFilter();
    const changed = vi.fn();
    filter.init({
      values: ['UK', 'us'], caseSensitive: true,
      api: { forEachLeafNode: () => undefined }, context: undefined, colDef: {}, column: {} as never,
      getValue: () => null, doesRowPassOtherFilter: () => true, rowModel: {} as never,
      filterChangedCallback: changed, filterModifiedCallback: () => undefined,
    });
    filter.setMiniFilter('u');
    expect(filter.getGui().querySelectorAll('.lgr-set-filter-value')).toHaveLength(1);
    const selectAll = filter.getGui().querySelector<HTMLInputElement>('[aria-label="Select all filtered values"]')!;
    selectAll.checked = false;
    selectAll.dispatchEvent(new Event('change'));
    expect(changed).toHaveBeenCalledOnce();
  });

  it('honours comparator, default selection, and Excel staged actions', () => {
    const filter = new SetFilter();
    filter.init({
      values: ['B', 'A'], defaultToNothingSelected: true, comparator: (a, b) => String(b).localeCompare(String(a)),
      api: { forEachLeafNode: () => undefined }, context: undefined, colDef: {}, column: {} as never,
      getValue: () => null, doesRowPassOtherFilter: () => true, rowModel: {} as never,
      filterChangedCallback: () => undefined, filterModifiedCallback: () => undefined,
    });
    expect(filter.getModel()).toEqual({ filterType: 'set', values: [] });
    expect([...filter.getGui().querySelectorAll('.lgr-set-filter-value span')].map((item) => item.textContent)).toEqual(['B', 'A']);

    const excel = new SetFilter();
    excel.init({
      values: ['UK'], defaultToNothingSelected: true, excelMode: 'windows',
      api: { forEachLeafNode: () => undefined }, context: undefined, colDef: {}, column: {} as never,
      getValue: () => null, doesRowPassOtherFilter: () => true, rowModel: {} as never,
      filterChangedCallback: () => undefined, filterModifiedCallback: () => undefined,
    });
    expect(excel.getModel()).toBeNull();
    expect(excel.getGui().textContent).toContain('Apply');
    expect(excel.getGui().textContent).toContain('Cancel');
  });
});
