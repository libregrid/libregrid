/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { StatusBarModule } from './statusBarModule';
let api: GridApi | undefined;
afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});
describe('StatusBarModule', () =>
  it('creates configured provided and custom panels through the public API', async () => {
    class CustomPanel {
      public initialized = false;
      public agInit() {
        this.initialized = true;
      }
    }
    ModuleRegistry.registerModules([AllCommunityModule, StatusBarModule]);
    const host = document.createElement('div');
    document.body.appendChild(host);
    api = createGrid(host, {
      columnDefs: [{ field: 'value' }],
      rowData: [{ value: 1 }],
      statusBar: {
        statusPanels: [
          { statusPanel: 'agTotalRowCountComponent', key: 'total' },
          { statusPanel: CustomPanel, key: 'custom' },
        ],
      },
    } as never);
    expect(typeof api.getStatusPanel).toBe('function');
    await vi.waitFor(() =>
      expect(api?.getStatusPanel<{ getGui(): HTMLElement }>('total')?.getGui().textContent).toBe(
        'Total Rows: 1',
      ),
    );
    expect(api.getStatusPanel<CustomPanel>('custom')?.initialized).toBe(true);
    expect(api.getStatusPanel('missing')).toBeUndefined();
  }));
