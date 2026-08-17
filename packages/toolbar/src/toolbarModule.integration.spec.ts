/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { FindModule } from '@libregrid/find';
import { ToolbarModule } from './toolbarModule';

let api: GridApi | undefined;
afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

describe('ToolbarModule', () => {
  it('renders the toolbar shell with quick filter, find, and action items', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ToolbarModule, FindModule]);
    const host = document.createElement('div');
    document.body.appendChild(host);
    api = createGrid(host, {
      columnDefs: [{ field: 'country' }, { field: 'sales' }],
      rowData: [
        { country: 'United Kingdom', sales: 120 },
        { country: 'United States', sales: 240 },
      ],
      toolbar: {
        items: [
          'agQuickFilterToolbarItem',
          'agFindToolbarItem',
          'separator',
          { label: 'Reset', action: () => api?.setGridOption('quickFilterText', undefined) },
        ],
      },
    } as never);

    const shell = host.querySelector('.lgr-toolbar');
    await vi.waitFor(() => expect(shell).not.toBeNull());
    expect(shell?.getAttribute('role')).toBe('toolbar');
    expect(shell?.querySelectorAll('.lgr-toolbar-item').length).toBe(4);
    expect(shell?.querySelectorAll('.lgr-toolbar-separator').length).toBe(1);

    // Find item searches cell values and navigates matches.
    const findInput = shell?.querySelector<HTMLInputElement>('input[aria-label="Find in grid"]');
    expect(findInput).toBeTruthy();
    expect(typeof api!.findNext).toBe('function');
    findInput!.value = 'nited';
    findInput!.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect((api as { findGetTotalMatches?: () => number }).findGetTotalMatches?.()).toBe(2));
    api!.findNext();
    expect((api as { findGetActiveMatch?: () => unknown }).findGetActiveMatch?.()).toBeTruthy();

    // Quick filter filters rows.
    const quickInput = shell?.querySelector<HTMLInputElement>('input[aria-label="Quick filter"]');
    expect(quickInput).toBeTruthy();
    quickInput!.value = 'kingdom';
    quickInput!.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(api!.getDisplayedRowCount()).toBe(1));
  });

  it('hides the shell when no toolbar option is set', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ToolbarModule]);
    const host = document.createElement('div');
    document.body.appendChild(host);
    api = createGrid(host, {
      columnDefs: [{ field: 'country' }],
      rowData: [{ country: 'United Kingdom' }],
    } as never);
    await vi.waitFor(() => expect(host.querySelector('.lgr-toolbar')).not.toBeNull());
    const shell = host.querySelector('.lgr-toolbar');
    expect(shell?.classList.contains('ag-hidden')).toBe(true);
  });
});
