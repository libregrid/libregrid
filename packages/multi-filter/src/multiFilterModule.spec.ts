/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { MultiFilter } from './multiFilter';
import { MultiFilterModule } from './multiFilterModule';

interface Row {
  country: string;
}

let api: GridApi<Row> | undefined;

afterEach(() => {
  api?.destroy();
  api = undefined;
});

describe('MultiFilterModule', () => {
  it('applies each child model with AND semantics through the registered handler', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, MultiFilterModule]);
    const element = document.createElement('div');
    document.body.appendChild(element);
    api = createGrid(element, {
      enableFilterHandlers: true,
      columnDefs: [{ field: 'country', filter: 'agMultiColumnFilter' }],
      rowData: [{ country: 'United Kingdom' }, { country: 'United States' }, { country: 'Germany' }],
    });

    api.setFilterModel({
      country: {
        filterType: 'multi',
        filterModels: [
          { filterType: 'text', type: 'contains', filter: 'United' },
          { filterType: 'set', values: ['United Kingdom'] },
        ],
      },
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    expect(api.getDisplayedRowAtIndex(0)?.data).toEqual({ country: 'United Kingdom' });
  });

  it('renders inline, accordion, and sub-menu child presentations', () => {
    const filter = new MultiFilter();
    filter.init({
      filters: [
        { title: 'Inline', display: 'inline', filter: 'agTextColumnFilter' },
        { title: 'Accordion', display: 'accordion', filter: 'agTextColumnFilter' },
        { title: 'Set values', display: 'subMenu', filter: 'agSetColumnFilter', filterParams: { values: ['UK'] } },
      ],
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

    expect(filter.getGui().querySelector('.lgr-multi-filter-inline')).toBeTruthy();
    expect(filter.getGui().querySelector('details.lgr-multi-filter-accordion summary')?.textContent).toBe('Accordion');
    expect(filter.getGui().querySelector('.lgr-multi-filter-subMenu button')?.getAttribute('aria-haspopup')).toBe('menu');
    expect(filter.getChildFilterInstance(2)).toBeTruthy();
  });

  it('round-trips nested child models without losing inactive children', () => {
    const filter = new MultiFilter();
    filter.init({
      filters: [{ filter: 'agTextColumnFilter' }, { filter: 'agTextColumnFilter' }],
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
    filter.setModel({ filterType: 'multi', filterModels: [null, { filterType: 'text', type: 'equals', filter: 'UK' }] });
    expect(filter.getModel()).toEqual({
      filterType: 'multi',
      filterModels: [null, { filterType: 'text', type: 'equals', filter: 'UK' }],
    });
  });
});
