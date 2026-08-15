// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { _readGlobalStore } from './menuItemRegistry';
import { openColumnFilterPopup } from './filterPopup';
// Import for the module-scope registration side effect of default items.
import './defaultItems';

describe('columnFilter menu item', () => {
  it('contributes a Filter item only for columns with a filter', () => {
    const contribution = _readGlobalStore().get('columnFilter');
    expect(contribution).toBeDefined();
    const column = {
      getColDef: () => ({ filter: true }),
      getColId: () => 'country',
    };
    const item = contribution!.factory({ column, node: null, value: null, api: {} } as never);
    expect(item?.name).toBe('Filter');
    const noFilter = contribution!.factory({
      column: { getColDef: () => ({}), getColId: () => 'country' },
      node: null,
      value: null,
      api: {},
    } as never);
    expect(noFilter).toBeNull();
  });

  it('opens the filter gui in a labelled dialog popup and closes on Esc and outside click', async () => {
    const gui = document.createElement('div');
    gui.className = 'ag-set-filter';
    const afterGuiAttached = vi.fn();
    const afterGuiDetached = vi.fn();
    const header = document.createElement('div');
    header.className = 'ag-header-cell';
    header.setAttribute('col-id', 'country');
    document.body.append(header);
    const api = {
      getColumnFilterInstance: vi.fn(() =>
        Promise.resolve({ getGui: () => gui, afterGuiAttached, afterGuiDetached }),
      ),
    } as never;

    openColumnFilterPopup(api, 'country');
    await vi.waitFor(() => expect(document.body.querySelector('.lgr-column-filter-popup')).not.toBeNull());
    const popup = document.body.querySelector<HTMLElement>('.lgr-column-filter-popup')!;
    expect(popup.getAttribute('role')).toBe('dialog');
    expect(popup.getAttribute('aria-label')).toBe('Filter country');
    expect(popup.contains(gui)).toBe(true);
    expect(afterGuiAttached).toHaveBeenCalledWith({ container: 'columnFilter' });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.body.contains(popup)).toBe(false);
    expect(afterGuiDetached).toHaveBeenCalled();
  });

  it('closes when clicking outside the popup', async () => {
    const gui = document.createElement('div');
    const api = {
      getColumnFilterInstance: vi.fn(() => Promise.resolve({ getGui: () => gui })),
    } as never;
    openColumnFilterPopup(api, 'country');
    await vi.waitFor(() => expect(document.body.querySelector('.lgr-column-filter-popup')).not.toBeNull());
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await vi.waitFor(() => expect(document.body.querySelector('.lgr-column-filter-popup')).toBeNull());
  });
});
