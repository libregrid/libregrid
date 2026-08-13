/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi, type GridOptions } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { RowGroupingPanelModule } from './rowGroupingPanelModule';

let api: GridApi | undefined;

ModuleRegistry.registerModules([AllCommunityModule, EnterpriseCoreModule, RowGroupingModule, RowGroupingPanelModule]);

afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

describe('RowGroupingPanelModule', () => {
  it('renders the header drop zone, updates onlyWhenGrouping visibility, and removes groups', async () => {
    const host = document.createElement('div');
    host.style.width = '800px';
    host.style.height = '500px';
    document.body.appendChild(host);
    api = createGrid(host, {
      rowGroupPanelShow: 'always',
      columnDefs: [{ field: 'country', rowGroup: true }],
      rowData: [{ country: 'France' }],
    } as GridOptions);

    const zone = host.querySelector<HTMLElement>('.lgr-row-group-drop-zone');
    expect(zone).not.toBeNull();
    expect(zone?.closest<HTMLElement>('.lgr-header-drop-zones')?.style.display).not.toBe('none');

    api.setGridOption('rowGroupPanelShow', 'onlyWhenGrouping');
    expect(zone?.closest<HTMLElement>('.lgr-header-drop-zones')?.getAttribute('aria-hidden')).not.toBe('true');
    api.removeRowGroupColumns(['country']);
    expect(zone?.closest<HTMLElement>('.lgr-header-drop-zones')?.getAttribute('aria-hidden')).toBe('true');
    api.addRowGroupColumns(['country']);
    await vi.waitFor(() => expect(zone?.closest<HTMLElement>('.lgr-header-drop-zones')?.getAttribute('aria-hidden')).not.toBe('true'));

    let remove: HTMLButtonElement | null = null;
    await vi.waitFor(() => {
      remove = host.querySelector<HTMLButtonElement>('[aria-label="Remove country from row groups"]');
      expect(remove).not.toBeNull();
    });
    remove!.click();
    await vi.waitFor(() => expect(api.getRowGroupColumns()).toEqual([]));
    api.setGridOption('rowGroupPanelShow', 'never');
    expect(zone?.closest<HTMLElement>('.lgr-header-drop-zones')?.getAttribute('aria-hidden')).toBe('true');
  });
});
