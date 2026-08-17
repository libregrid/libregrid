/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { registerToolbarItem } from './toolbarRegistry';
import { ToolbarService } from './toolbarService';

function fakeApi() {
  return {
    getGridOption: (key: string) => (key === 'quickFilterText' ? 'pre' : key === 'findSearchValue' ? '' : undefined),
    setGridOption: vi.fn(),
    findNext: vi.fn(),
    findPrevious: vi.fn(),
    getFindTotalMatches: () => 3,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe('ToolbarService', () => {
  it('builds provided, action, separator, and registered items with alignment', () => {
    const registered = vi.fn(() => {
      const gui = document.createElement('span');
      gui.textContent = 'registered';
      return { gui, instance: gui };
    });
    registerToolbarItem('agCustomItem', registered);

    const { bean } = makeBeanHarness(ToolbarService, {
      gridOptions: {
        toolbar: {
          alignment: 'left',
          items: [
            'agQuickFilterToolbarItem',
            'agFindToolbarItem',
            'separator',
            { label: 'Export', icon: 'excelExport', action: vi.fn() },
            { toolbarItem: 'agCustomItem', key: 'custom', alignment: 'right' },
          ],
        },
      },
      beans: { gridApi: fakeApi() },
    });

    const entries = bean.getEntries();
    expect(entries.map((entry) => entry.align)).toEqual(['left', 'left', 'left', 'left', 'right']);
    expect(entries[2]?.gui.className).toBe('lgr-toolbar-separator');
    expect(entries[3]?.gui.textContent).toBe('Export');
    expect(bean.getToolbarItemInstance('custom')).toBeTruthy();
    expect(registered).toHaveBeenCalledOnce();
  });

  it('reconfigures when the toolbar option changes and destroys prior items', () => {
    const destroy = vi.fn();
    registerToolbarItem('agDestroyableItem', () => ({
      gui: document.createElement('span'),
      destroy,
    }));
    const gosStore: Record<string, unknown> = { toolbar: { items: ['agDestroyableItem'] } };
    const { bean, gos } = makeBeanHarness(ToolbarService, {
      gridOptions: gosStore,
      beans: { gridApi: fakeApi() },
    });
    expect(bean.getEntries()).toHaveLength(1);
    gosStore['toolbar'] = { items: ['agQuickFilterToolbarItem'] };
    gos.set('toolbar', gosStore['toolbar']);
    expect(bean.getEntries()).toHaveLength(1);
    expect(destroy).toHaveBeenCalledOnce();
    expect(bean.getEntries()[0]?.gui.querySelector('input')).toBeTruthy();
  });

  it('renders nothing without a toolbar option', () => {
    const { bean } = makeBeanHarness(ToolbarService, {
      gridOptions: {},
      beans: { gridApi: fakeApi() },
    });
    expect(bean.getEntries()).toHaveLength(0);
  });
});
