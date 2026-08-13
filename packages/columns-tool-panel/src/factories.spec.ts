/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { ColumnChooserFactory } from './columnChooserFactory';
import { ColumnsToolPanelFactory } from './columnsToolPanelFactory';
import { ColumnsToolPanelModule } from './columnsToolPanelModule';

afterEach(() => document.body.replaceChildren());

describe('columns tool panel factories', () => {
  it('registers the standard columns panel with the side bar service', () => {
    const registerToolPanel = vi.fn();
    makeBeanHarness(ColumnsToolPanelFactory, { beans: { sideBar: { registerToolPanel } } });
    expect(registerToolPanel).toHaveBeenCalledWith(expect.objectContaining({
      id: 'columns',
      labelKey: 'columns',
      width: 260,
      minWidth: 220,
      maxWidth: 380,
    }));
  });

  it('shows, replaces, and hides the shared column chooser overlay', () => {
    const { bean, destroy } = makeBeanHarness(ColumnChooserFactory, {
      beans: {
        gridApi: {
          getAllGridColumns: () => [],
          setColumnsVisible: vi.fn(),
        },
      },
    });

    bean.showColumnChooser();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    bean.showColumnChooser({ suppressColumnFilter: true, columnLayout: [] });
    expect(document.querySelectorAll('.lgr-column-chooser-overlay')).toHaveLength(1);
    bean.hideColumnChooser();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    destroy();
  });

  it('owns the column chooser GridApi functions', () => {
    const factory = { showColumnChooser: vi.fn(), hideColumnChooser: vi.fn() };
    const apiFunctions = ColumnsToolPanelModule.apiFunctions as unknown as Record<string, (...args: unknown[]) => void>;
    const params = { suppressColumnFilter: true };

    apiFunctions['showColumnChooser']!({ colChooserFactory: factory }, params);
    apiFunctions['hideColumnChooser']!({ colChooserFactory: factory });

    expect(factory.showColumnChooser).toHaveBeenCalledWith(params);
    expect(factory.hideColumnChooser).toHaveBeenCalledOnce();
  });
});
