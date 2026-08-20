/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, ModuleRegistry, createGrid, type GridApi } from 'ag-grid-community';
import { ColumnMenuModule } from './columnMenuModule';

let api: GridApi | undefined;
let host: HTMLDivElement | undefined;

async function makeGrid(columnDefs: Array<Record<string, unknown>>): Promise<GridApi> {
  ModuleRegistry.registerModules([AllCommunityModule, ColumnMenuModule]);
  host = document.createElement('div');
  document.body.appendChild(host);
  api = createGrid(host, {
    columnDefs: columnDefs as never,
    rowData: [{ athlete: 'Ann', gold: 3 }],
    columnMenu: 'new',
  });
  await vi.waitFor(() => expect(host?.querySelectorAll('.ag-row').length).toBe(1));
  return api;
}

function headerCell(colId: string): HTMLElement {
  const el = host?.querySelector<HTMLElement>(`.ag-header-cell[col-id="${colId}"]`);
  if (!el) throw new Error(`header cell ${colId} not found`);
  return el;
}

function groupHeaderCell(groupId: string): HTMLElement {
  const el = host?.querySelector<HTMLElement>(`.ag-header-group-cell[col-id="${groupId}"], .ag-header-group-cell`);
  if (!el) throw new Error(`group header cell ${groupId} not found`);
  return el;
}

function rightClick(el: HTMLElement): MouseEvent {
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

describe('header context menu (integration)', () => {
  it('opens the LibreGrid menu and suppresses the native browser menu on header right-click', async () => {
    await makeGrid([{ field: 'athlete' }, { field: 'gold' }]);

    const event = rightClick(headerCell('athlete'));
    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(document.querySelector('.lgr-menu')).not.toBeNull());
    const labels = Array.from(document.querySelectorAll('.lgr-menu-item')).map((el) => el.textContent?.trim());
    expect(labels).toContain('Sort Ascending');
  });

  it('keeps the browser default when the header context menu is suppressed', async () => {
    await makeGrid([{ field: 'athlete' }, { field: 'gold', suppressHeaderContextMenu: true }]);

    const event = rightClick(headerCell('gold'));
    expect(event.defaultPrevented).toBe(false);
    expect(document.querySelector('.lgr-menu')).toBeNull();
  });

  it('suppresses the native browser menu for a group-header menu too', async () => {
    await makeGrid([{ headerName: 'Medals', groupId: 'medals', children: [{ field: 'gold' }] }]);

    const event = rightClick(groupHeaderCell('medals'));
    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(document.querySelector('.lgr-menu')).not.toBeNull());
  });
});
