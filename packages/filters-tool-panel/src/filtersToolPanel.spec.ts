/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { FiltersToolPanel } from './filtersToolPanel';

describe('FiltersToolPanel', () => {
  it('honours search, expansion APIs, layout, and new filter-panel state', () => {
    const updated = vi.fn();
    const panel = new FiltersToolPanel();
    panel.init({
      api: { getColumnDefs: () => [{ field: 'country', filter: 'agSetColumnFilter' }, { field: 'age', filter: 'agNumberColumnFilter' }, { field: 'hidden', filter: true, suppressFiltersToolPanel: true }] },
      onStateUpdated: updated,
    });
    expect(panel.getGui().textContent).toContain('country');
    expect(panel.getGui().textContent).not.toContain('hidden');
    panel.expandFilters(['country']);
    expect(panel.getState().expandedColIds).toEqual(['country']);
    expect(panel.getState().filters).toEqual(expect.arrayContaining([{ colId: 'country', expanded: true }]));
    panel.setFilterLayout([{ field: 'age', filter: 'agNumberColumnFilter' }]);
    expect(panel.getGui().textContent).not.toContain('country');
    expect(updated).toHaveBeenCalled();
  });

  it('defers global clear until Apply and restores the applied model on Cancel', () => {
    const setFilterModel = vi.fn();
    const onFilterChanged = vi.fn();
    const panel = new FiltersToolPanel();
    panel.init({ api: { getColumnDefs: () => [{ field: 'country', filter: 'agSetColumnFilter' }], setFilterModel, onFilterChanged }, onStateUpdated: () => undefined, buttons: ['clear', 'apply', 'cancel', 'reset'] });
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Clear"]')!.click();
    expect(setFilterModel).not.toHaveBeenCalled();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Apply"]')!.click();
    expect(setFilterModel).toHaveBeenCalledWith(null);
    expect(onFilterChanged).toHaveBeenCalledOnce();
  });

  it('offers Simple, Selection, and Combo filter configuration choices', () => {
    const panel = new FiltersToolPanel();
    panel.init({ api: { getColumnDefs: () => [{ field: 'name', filter: 'agTextColumnFilter' }, { field: 'country', filter: 'agSetColumnFilter' }, { field: 'mixed', filter: 'agMultiColumnFilter' }] }, onStateUpdated: () => undefined });
    expect(panel.getGui().querySelector<HTMLSelectElement>('[aria-label="name filter type"]')?.value).toBe('simple');
    expect(panel.getGui().querySelector<HTMLSelectElement>('[aria-label="country filter type"]')?.value).toBe('selection');
    expect(panel.getGui().querySelector<HTMLSelectElement>('[aria-label="mixed filter type"]')?.value).toBe('combo');
  });
});
