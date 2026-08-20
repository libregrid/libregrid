/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type Column,
  type FullWidthNotesDataSource,
  type GridApi,
  type IRowNode,
  type Note,
  type NotesDataSource,
} from 'ag-grid-community';
import { ContextMenuModule } from '@libregrid/menu';
import { NOTE_MARKER_CLASS } from './noteFeature';
import { NotesModule } from './notesModule';

const DATA = [
  { a: 1, b: 'one' },
  { a: 2, b: 'two' },
];

interface Store {
  notes: Map<string, Note>;
  source: NotesDataSource;
  fullWidthSource: FullWidthNotesDataSource;
}

function makeStore(): Store {
  const notes = new Map<string, Note>();
  const keyOf = (params: { rowNode: IRowNode; column?: Column; location?: string }): string =>
    params.location === 'fullWidthRow'
      ? `${params.rowNode.id}::fw`
      : `${params.rowNode.id}::${(params.column as Column).getColId()}`;
  const apply = (params: { rowNode: IRowNode; column?: Column; location?: string; note: Note | undefined }): void => {
    const key = keyOf(params);
    if (params.note) {
      notes.set(key, params.note);
    } else {
      notes.delete(key);
    }
  };
  const source: NotesDataSource = {
    init: vi.fn(),
    destroy: vi.fn(),
    getNote: (params) => notes.get(keyOf(params)),
    setNote: apply,
  };
  return { notes, source, fullWidthSource: { ...source, supportsFullWidthRows: true } };
}

let api: GridApi | undefined;
let host: HTMLDivElement | undefined;

async function makeGrid(store: Store, extra: Record<string, unknown> = {}): Promise<GridApi> {
  ModuleRegistry.registerModules([AllCommunityModule, NotesModule, ContextMenuModule]);
  host = document.createElement('div');
  document.body.appendChild(host);
  const grid = createGrid(host, {
    columnDefs: [
      { field: 'a' },
      { field: 'b', suppressNoteActions: true },
    ],
    rowData: DATA,
    getRowId: (params) => `row-${params.data.a}`,
    notesDataSource: store.source,
    ...extra,
  });
  api = grid;
  // Full width rows also carry the `.ag-row` class, so wait for "at least"
  // the data rows.
  await vi.waitFor(() => expect(host?.querySelectorAll('.ag-row').length).toBeGreaterThanOrEqual(DATA.length));
  return grid;
}

function cell(row: number, colId: string): HTMLElement {
  const rowEl = host?.querySelectorAll('.ag-row')[row];
  const el = rowEl?.querySelector<HTMLElement>(`.ag-cell[col-id="${colId}"]`);
  if (!el) {
    throw new Error(`cell ${row}/${colId} not found`);
  }
  return el;
}

function popup(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.lgr-note-popup');
}

function popupText(): string {
  const el = popup()?.querySelector<HTMLElement>('.lgr-note-popup-text');
  if (!el) {
    return '';
  }
  return el instanceof HTMLTextAreaElement ? el.value : (el.textContent ?? '');
}

function menuItemLabels(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.lgr-menu-item')).map((el) => el.textContent?.trim() ?? '');
}

function clickMenuItem(label: string): void {
  const item = Array.from(document.querySelectorAll<HTMLElement>('.lgr-menu-item')).find((el) => el.textContent?.trim() === label);
  if (!item) {
    throw new Error(`menu item "${label}" not found`);
  }
  item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function rowNode(index: number): IRowNode {
  const node = api?.getRowNode(`row-${index + 1}`);
  if (!node) {
    throw new Error(`row ${index} not found`);
  }
  return node;
}

afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

describe('NotesModule (integration)', () => {
  it('marks rendered cells that have notes', async () => {
    const store = makeStore();
    store.notes.set('row-1::a', { text: 'hello', author: 'ann' });
    await makeGrid(store);

    await vi.waitFor(() => expect(cell(0, 'a').classList.contains(NOTE_MARKER_CLASS)).toBe(true));
    expect(cell(1, 'a').classList.contains(NOTE_MARKER_CLASS)).toBe(false);
    expect(cell(0, 'b').classList.contains(NOTE_MARKER_CLASS)).toBe(false);
  });

  it('exposes getNote / setNote / refreshNotes on the GridApi', async () => {
    const store = makeStore();
    store.notes.set('row-1::a', { text: 'hello' });
    const grid = await makeGrid(store);

    expect(grid.getNote({ rowNode: rowNode(0), column: 'a' })).toEqual({ text: 'hello' });
    expect(grid.getNote({ rowNode: rowNode(1), column: 'a' })).toBeUndefined();

    grid.setNote({ rowNode: rowNode(1), column: 'a', note: { text: 'new' } });
    expect(store.notes.get('row-2::a')).toEqual({ text: 'new' });
    await vi.waitFor(() => expect(cell(1, 'a').classList.contains(NOTE_MARKER_CLASS)).toBe(true));

    // External store change picked up by refreshNotes.
    store.notes.set('row-1::a', { text: 'changed' });
    expect(popupText()).not.toContain('changed');
    grid.refreshNotes();
    await vi.waitFor(() => expect(grid.getNote({ rowNode: rowNode(0), column: 'a' })).toEqual({ text: 'changed' }));

    grid.setNote({ rowNode: rowNode(0), column: 'a', note: undefined });
    expect(store.notes.has('row-1::a')).toBe(false);
    await vi.waitFor(() => expect(cell(0, 'a').classList.contains(NOTE_MARKER_CLASS)).toBe(false));
  });

  it('opens the editor on hover, closes it on hover-out, and commits edits on close', async () => {
    const store = makeStore();
    store.notes.set('row-1::a', { text: 'hello', author: 'ann', createdAt: '2026-01-01', updatedAt: '2026-01-02' });
    await makeGrid(store);
    await vi.waitFor(() => expect(cell(0, 'a').classList.contains(NOTE_MARKER_CLASS)).toBe(true));

    cell(0, 'a').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    expect(popupText()).toBe('hello');
    expect(popup()?.querySelector('.lgr-note-popup-title')?.textContent).toBe('ann');
    expect(popup()?.querySelector('.lgr-note-popup-meta')?.textContent).toContain('Created: 2026-01-01');
    expect(popup()?.querySelector('.lgr-note-popup-remove')).not.toBeNull();

    const textarea = popup()?.querySelector<HTMLTextAreaElement>('textarea');
    expect(textarea).not.toBeNull();
    textarea!.value = 'edited';
    popup()!.querySelector<HTMLElement>('.lgr-note-popup-close')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => expect(popup()).toBeNull());
    expect(store.notes.get('row-1::a')).toEqual({
      text: 'edited',
      author: 'ann',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
    });

    // Hover-out without edits closes without committing.
    cell(0, 'a').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    cell(0, 'a').dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    await vi.waitFor(() => expect(popup()).toBeNull());
    expect(store.notes.get('row-1::a')?.text).toBe('edited');
  });

  it('creates a note with Shift+F2 and discards empty new notes', async () => {
    const store = makeStore();
    await makeGrid(store);
    await vi.waitFor(() => expect(cell(1, 'a').classList.contains(NOTE_MARKER_CLASS)).toBe(false));

    const target = cell(1, 'a');
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', shiftKey: true, bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    const textarea = popup()?.querySelector<HTMLTextAreaElement>('textarea');
    expect(textarea).not.toBeNull();
    expect(textarea!.value).toBe('');

    // Empty new note is discarded on close.
    popup()!.querySelector<HTMLElement>('.lgr-note-popup-close')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => expect(popup()).toBeNull());
    expect(store.notes.has('row-2::a')).toBe(false);

    // Typed text commits.
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', shiftKey: true, bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    const typed = popup()?.querySelector<HTMLTextAreaElement>('textarea');
    expect(typed).not.toBeNull();
    typed!.value = 'created';
    popup()!.querySelector<HTMLElement>('.lgr-note-popup-close')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => expect(popup()).toBeNull());
    expect(store.notes.get('row-2::a')).toEqual({ text: 'created' });
  });

  it('shows read-only notes as non-editable without a remove button', async () => {
    const store = makeStore();
    store.notes.set('row-2::a', { text: 'fixed', readOnly: true });
    await makeGrid(store);

    const target = cell(1, 'a');
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', shiftKey: true, bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    const textEl = popup()!.querySelector<HTMLElement>('.lgr-note-popup-text');
    expect(textEl?.tagName).toBe('DIV');
    expect(textEl?.getAttribute('aria-readonly')).toBe('true');
    expect(popup()?.querySelector('.lgr-note-popup-remove')).toBeNull();

    popup()!.querySelector<HTMLElement>('.lgr-note-popup-close')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => expect(popup()).toBeNull());
    expect(store.notes.get('row-2::a')).toEqual({ text: 'fixed', readOnly: true });
  });

  it('opens existing notes on left click when noteTrigger is "click"', async () => {
    const store = makeStore();
    store.notes.set('row-1::a', { text: 'click me' });
    await makeGrid(store, { noteTrigger: 'click' });
    await vi.waitFor(() => expect(cell(0, 'a').classList.contains(NOTE_MARKER_CLASS)).toBe(true));

    // Hover does not open with the click trigger.
    cell(0, 'a').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(popup()).toBeNull();

    cell(0, 'a').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    await vi.waitFor(() => expect(popup()).not.toBeNull());
    expect(popupText()).toBe('click me');
  });

  it('supports full width row notes with a full-width data source', async () => {
    const store = makeStore();
    store.notes.set('row-1::fw', { text: 'row note' });
    await makeGrid(store, {
      notesDataSource: store.fullWidthSource,
      isFullWidthRow: (params: { rowNode: IRowNode }) => params.rowNode.id === 'row-1',
      fullWidthCellRenderer: (params: { data?: { a?: number } }) => {
        const el = document.createElement('div');
        el.textContent = `fw-${params.data?.a ?? ''}`;
        return el;
      },
    });

    let fwRow: HTMLElement | undefined;
    await vi.waitFor(
      () => {
        fwRow = host?.querySelector<HTMLElement>('.ag-full-width-row');
        expect(fwRow).not.toBeNull();
      },
      { timeout: 2000 },
    );
    await vi.waitFor(() => expect(fwRow!.classList.contains(NOTE_MARKER_CLASS)).toBe(true));

    const grid = api!;
    expect(grid.getNote({ rowNode: rowNode(0), location: 'fullWidthRow' })).toEqual({ text: 'row note' });

    grid.setNote({ rowNode: rowNode(0), location: 'fullWidthRow', note: { text: 'row note v2' } });
    expect(store.notes.get('row-1::fw')).toEqual({ text: 'row note v2' });

    // Cell-only data sources must ignore full width rows.
    const cellStore = makeStore();
    cellStore.notes.set('row-1::fw', { text: 'ignored' });
    const grid2Host = document.createElement('div');
    document.body.appendChild(grid2Host);
    const grid2 = createGrid(grid2Host, {
      columnDefs: [{ field: 'a' }],
      rowData: DATA,
      getRowId: (params) => `row-${params.data.a}`,
      notesDataSource: cellStore.source,
      isFullWidthRow: (params: { rowNode: IRowNode }) => params.rowNode.id === 'row-1',
      fullWidthCellRenderer: () => {
        const el = document.createElement('div');
        el.textContent = 'fw';
        return el;
      },
    });
    await vi.waitFor(
      () => {
        if (!grid2Host.querySelector('.ag-full-width-row')) {
          throw new Error('full width row not rendered');
        }
      },
      { timeout: 2000 },
    );
    expect(grid2.getNote({ rowNode: grid2.getRowNode('row-1')!, location: 'fullWidthRow' })).toBeUndefined();
    grid2.destroy();
    document.body.removeChild(grid2Host);
  });

  it('enables and disables Notes at runtime without a redraw', async () => {
    const store = makeStore();
    store.notes.set('row-1::a', { text: 'hello' });
    const grid = await makeGrid(store, { notesDataSource: undefined });

    expect(cell(0, 'a').classList.contains(NOTE_MARKER_CLASS)).toBe(false);
    expect((store.source.init as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);

    grid.setGridOption('notesDataSource', store.source);
    await vi.waitFor(() => expect(cell(0, 'a').classList.contains(NOTE_MARKER_CLASS)).toBe(true));
    expect((store.source.init as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);

    grid.setGridOption('notesDataSource', undefined);
    await vi.waitFor(() => expect(cell(0, 'a').classList.contains(NOTE_MARKER_CLASS)).toBe(false));
    expect((store.source.destroy as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect(grid.getNote({ rowNode: rowNode(0), column: 'a' })).toBeUndefined();
  });

  describe('context menu', () => {
    async function openCellMenu(row: number, colId: string): Promise<void> {
      const grid = api!;
      grid.showContextMenu({ rowNode: rowNode(row), column: grid.getColumn(colId)!, value: null });
      await vi.waitFor(() => expect(document.querySelector('.lgr-menu')).not.toBeNull());
    }

    it('offers Add Note on a note-less cell and creates the note', async () => {
      const store = makeStore();
      await makeGrid(store);
      await openCellMenu(1, 'a');
      expect(menuItemLabels()).toContain('Add Note');
      expect(menuItemLabels()).not.toContain('Edit Note');

      clickMenuItem('Add Note');
      await vi.waitFor(() => expect(popup()).not.toBeNull());
      const menuTyped = popup()?.querySelector<HTMLTextAreaElement>('textarea');
      expect(menuTyped).not.toBeNull();
      menuTyped!.value = 'from menu';
      popup()!.querySelector<HTMLElement>('.lgr-note-popup-close')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.waitFor(() => expect(popup()).toBeNull());
      expect(store.notes.get('row-2::a')).toEqual({ text: 'from menu' });
    });

    it('offers Edit and Remove Note on an editable note; Remove clears it', async () => {
      const store = makeStore();
      store.notes.set('row-1::a', { text: 'hello' });
      await makeGrid(store);
      await openCellMenu(0, 'a');
      expect(menuItemLabels()).toEqual(expect.arrayContaining(['Edit Note', 'Remove Note']));
      expect(menuItemLabels()).not.toContain('Add Note');

      clickMenuItem('Remove Note');
      await vi.waitFor(() => expect(document.querySelector('.lgr-menu')).toBeNull());
      expect(store.notes.has('row-1::a')).toBe(false);
      await vi.waitFor(() => expect(cell(0, 'a').classList.contains(NOTE_MARKER_CLASS)).toBe(false));
    });

    it('shows View Note and a disabled Remove Note for read-only notes', async () => {
      const store = makeStore();
      store.notes.set('row-1::a', { text: 'fixed', readOnly: true });
      await makeGrid(store);
      await openCellMenu(0, 'a');
      expect(menuItemLabels()).toContain('View Note');
      const remove = Array.from(document.querySelectorAll<HTMLElement>('.lgr-menu-item')).find((el) => el.textContent?.trim() === 'Remove Note');
      expect(remove).not.toBeNull();
      expect(remove?.classList.contains('lgr-menu-item-disabled')).toBe(true);
    });

    it('omits note items on suppressed cells without a note and shows only View Note with one', async () => {
      const store = makeStore();
      store.notes.set('row-2::b', { text: 'hidden' });
      await makeGrid(store, {
        // This minimal environment registers no clipboard/export modules, so
        // every default item resolves to null and an all-null menu never
        // opens. Returning the defaults plus one literal item keeps the menu
        // open in all cases while 'note' still goes through the real
        // registry resolution.
        getContextMenuItems: (params: { defaultItems?: string[] }) => [
          ...(params.defaultItems ?? []),
          { name: 'Baseline Item' },
        ],
      });

      // b is suppressed (suppressNoteActions: true) and has no note.
      await openCellMenu(0, 'b');
      expect(menuItemLabels()).toContain('Baseline Item');
      expect(menuItemLabels()).not.toContain('Add Note');
      expect(menuItemLabels()).not.toContain('View Note');

      // A second menu would stack on the first — recreate the grid for a clean DOM.
      api?.destroy();
      api = undefined;
      document.body.replaceChildren();
      await makeGrid(store);

      // Suppressed cell with a note: View Note only.
      await openCellMenu(1, 'b');
      expect(menuItemLabels()).toContain('View Note');
      expect(menuItemLabels()).not.toContain('Edit Note');
      expect(menuItemLabels()).not.toContain('Remove Note');
    });
  });
});
