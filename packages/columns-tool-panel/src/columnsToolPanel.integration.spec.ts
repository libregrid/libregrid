/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { SideBarModule } from '@libregrid/side-bar';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { ColumnsToolPanelModule } from './columnsToolPanelModule';
import { ColumnsToolPanel } from './columnsToolPanel';

let api: GridApi | undefined;

beforeAll(() => {
  ModuleRegistry.registerModules([AllCommunityModule, EnterpriseCoreModule, SideBarModule, RowGroupingModule, ColumnsToolPanelModule]);
});

afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

describe('ColumnsToolPanelModule', () => {
  it('resolves sideBar columns and drives visibility plus grouping and values through public APIs', () => {
    const host = document.createElement('div');
    host.style.width = '800px';
    host.style.height = '500px';
    document.body.appendChild(host);
    api = createGrid(host, {
      sideBar: 'columns',
      columnDefs: [
        { field: 'country', enableRowGroup: true },
        { field: 'gold', enableValue: true },
      ],
      rowData: [{ country: 'France', gold: 1 }],
    });

    api.openToolPanel('columns');
    const panel = api.getToolPanelInstance('columns') as ColumnsToolPanel | undefined;
    expect(panel).toBeInstanceOf(ColumnsToolPanel);
    const countryCheckbox = panel?.getGui().querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(countryCheckbox).not.toBeNull();
    countryCheckbox!.checked = false;
    countryCheckbox!.dispatchEvent(new Event('change'));
    expect(api.getColumn('country')?.isVisible()).toBe(false);

    Array.from(panel?.getGui().querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button) => button.textContent?.startsWith('Group by'))?.click();
    Array.from(panel?.getGui().querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button) => button.textContent?.startsWith('Add value'))?.click();
    expect(api.getRowGroupColumns().map((column) => column.getColId())).toContain('country');
    expect(api.getValueColumns().map((column) => column.getColId())).toContain('gold');
  });
});
