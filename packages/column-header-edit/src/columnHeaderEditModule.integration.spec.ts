/** @vitest-environment jsdom */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type AgProvidedColumnGroup,
  type GridApi,
} from 'ag-grid-community';
import { ColumnMenuModule } from '@libregrid/menu';
import { ColumnHeaderEditModule } from './columnHeaderEditModule';
import { ColumnHeaderEditService } from './columnHeaderEditService';

let api: GridApi | undefined;
let host: HTMLDivElement | undefined;

beforeAll(() => {
  ModuleRegistry.registerModules([AllCommunityModule, ColumnMenuModule, ColumnHeaderEditModule]);
});

function makeGrid(options: Record<string, unknown> = {}): GridApi {
  host = document.createElement('div');
  document.body.appendChild(host);
  const grid = createGrid(host, {
    columnDefs: [
      { field: 'a', headerName: 'A', headerNameEditable: true },
      { field: 'b', headerName: 'B' },
    ],
    rowData: [{ a: 1, b: 2 }, { a: 3, b: 4 }],
    ...options,
  });
  api = grid;
  return grid;
}

function headerCell(columnId: string): HTMLElement | null {
  return host?.querySelector<HTMLElement>(`.ag-header-cell[col-id="${columnId}"]`) ?? null;
}

/** The group header cell (group cells use the `ag-header-group-cell` class). */
function groupHeaderCell(): HTMLElement {
  const cell = host?.querySelector<HTMLElement>('.ag-header-group-cell');
  if (!cell) throw new Error('group header cell not found');
  return cell;
}

function menuItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.lgr-menu-item'));
}

/** Open the column menu for column `a` and click the Edit Column Name item. */
async function openEditColumnMenu(): Promise<void> {
  api!.showColumnMenu('a');
  // The menu opens on a requestAnimationFrame tick in the "auto" positioning path.
  await vi.waitFor(() => expect(menuItems().some((el) => el.textContent?.trim() === 'Edit Column Name')).toBe(true));
  const item = menuItems().find((el) => el.textContent?.trim() === 'Edit Column Name')!;
  item.click();
}

const tick = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

describe('ColumnHeaderEditModule (integration)', () => {
  it('shows Edit Column Name in the column menu only for editable columns', async () => {
    makeGrid();
    api!.showColumnMenu('a');
    await vi.waitFor(() => expect(menuItems().some((el) => el.textContent?.trim() === 'Edit Column Name')).toBe(true));
  });

  it('hides Edit Column Name for columns without headerNameEditable', async () => {
    makeGrid();
    api!.showColumnMenu('b');
    await vi.waitFor(() => expect(menuItems().length).toBeGreaterThan(0));
    expect(menuItems().some((el) => el.textContent?.trim() === 'Edit Column Name')).toBe(false);
  });

  it('renames a column header live and persists the name in column state', async () => {
    makeGrid();
    await openEditColumnMenu();
    await vi.waitFor(() => expect(host!.querySelector('.lgr-header-name-editor-input')).not.toBeNull());
    const input = host!.querySelector<HTMLInputElement>('.lgr-header-name-editor-input')!;
    expect(input.value).toBe('A');

    // While the editor is open the header cell is highlighted (async event).
    await tick();
    expect(headerCell('a')?.classList.contains('ag-column-header-edit-highlighted')).toBe(true);

    input.value = 'Renamed';
    input.dispatchEvent(new Event('input'));
    expect(api!.getColumn('a')?.headerNameOverride).toBe('Renamed');
    await vi.waitFor(() => expect(headerCell('a')?.textContent?.trim()).toBe('Renamed'));

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await vi.waitFor(() => expect(host!.querySelector('.lgr-header-name-editor')).toBeNull());
    await tick();
    expect(headerCell('a')?.classList.contains('ag-column-header-edit-highlighted')).toBe(false);

    const state = api!.getColumnState().find((s) => s.colId === 'a');
    expect(state?.headerName).toBe('Renamed');
  });

  it('edits group headers through the service and highlights the group header cell', async () => {
    // Groups have no column-menu entry, so the editor is driven through the
    // service bean. The bean is not publicly reachable from the grid, so a
    // postConstruct spy captures the instance Community constructs.
    let svc: ColumnHeaderEditService | undefined;
    const capture = (instance: ColumnHeaderEditService) => {
      svc = instance;
    };
    const originalPostConstruct = ColumnHeaderEditService.prototype.postConstruct;
    const spy = vi
      .spyOn(ColumnHeaderEditService.prototype, 'postConstruct')
      .mockImplementation(function (this: ColumnHeaderEditService) {
        capture(this);
        return originalPostConstruct.call(this);
      });

    try {
      makeGrid({
        columnDefs: [
          {
            groupId: 'g1',
            headerName: 'Grp',
            headerNameEditable: true,
            children: [{ field: 'x', headerName: 'X' }],
          },
        ],
      });
      expect(api!.getColumn('x')).not.toBeNull();
      expect(svc).toBeDefined();

      // The only public path from a grid to its provided column groups is the
      // columnGroupOpened/Collapsed event payload.
      let group: AgProvidedColumnGroup | undefined;
      api!.addEventListener('columnGroupOpened', (e) => {
        group = (e.columnGroup ?? e.columnGroups[0]) as AgProvidedColumnGroup;
      });
      api!.setColumnGroupState([{ groupId: 'g1', open: true }]);
      await vi.waitFor(() => expect(group).toBeDefined());

      svc!.showHeaderNameEditor(group!);

      const input = host!.querySelector<HTMLInputElement>('.lgr-header-name-editor-input')!;
      expect(input.value).toBe('Grp');

      await tick();
      expect(groupHeaderCell().classList.contains('ag-column-header-edit-highlighted')).toBe(true);

      input.value = 'Renamed Group';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() => expect(groupHeaderCell().textContent?.trim()).toBe('Renamed Group'));

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await vi.waitFor(() => expect(host!.querySelector('.lgr-header-name-editor')).toBeNull());
      await tick();
      expect(groupHeaderCell().classList.contains('ag-column-header-edit-highlighted')).toBe(false);

      const state = (
        api!.getColumnGroupState() as { groupId: string; open: boolean; headerName?: string | null }[]
      ).find((g) => g.groupId === 'g1');
      expect(state?.headerName).toBe('Renamed Group');
    } finally {
      spy.mockRestore();
    }
  });

  it('applies deferred edits on Apply and discards them on Escape', async () => {
    makeGrid({ columnHeaderEdit: { applyMode: 'deferred' } });
    api!.showColumnMenu('a');
    await vi.waitFor(() => expect(menuItems().some((el) => el.textContent?.trim() === 'Edit Column Name')).toBe(true));
    menuItems().find((el) => el.textContent?.trim() === 'Edit Column Name')!.click();
    await vi.waitFor(() => expect(host!.querySelector('.lgr-header-name-editor-input')).not.toBeNull());

    const input = host!.querySelector<HTMLInputElement>('.lgr-header-name-editor-input')!;
    input.value = 'Typed';
    input.dispatchEvent(new Event('input'));
    expect(api!.getColumn('a')?.headerNameOverride).toBeNull(); // deferred: not applied yet

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await vi.waitFor(() => expect(host!.querySelector('.lgr-header-name-editor')).toBeNull());
    expect(api!.getColumn('a')?.headerNameOverride).toBeNull();

    api!.showColumnMenu('a');
    await vi.waitFor(() => expect(menuItems().some((el) => el.textContent?.trim() === 'Edit Column Name')).toBe(true));
    menuItems().find((el) => el.textContent?.trim() === 'Edit Column Name')!.click();
    await vi.waitFor(() => expect(host!.querySelector('.lgr-header-name-editor-input')).not.toBeNull());
    const input2 = host!.querySelector<HTMLInputElement>('.lgr-header-name-editor-input')!;
    input2.value = 'Applied';
    input2.dispatchEvent(new Event('input'));
    host!.querySelector<HTMLElement>('.lgr-header-name-editor-apply')?.click();
    await vi.waitFor(() => expect(host!.querySelector('.lgr-header-name-editor')).toBeNull());
    expect(api!.getColumn('a')?.headerNameOverride).toBe('Applied');
  });
});
