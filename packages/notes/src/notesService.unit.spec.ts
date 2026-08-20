/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import type {
  Column,
  GridApi,
  IRowNode,
  Note,
  NoteParams,
  RefreshNotesParams,
} from 'ag-grid-community';
import type { MenuActionParams, MenuItemContribution } from '@libregrid/menu';
import { makeBeanHarness } from '@libregrid/core/testing';
import { keyForParams, NotesService } from './notesService';

const rowNode = { id: 'row-1', data: { a: 1 } } as IRowNode;
const rowNode2 = { id: 'row-2', data: { a: 2 } } as IRowNode;
const colA: Column = {
  getColId: () => 'a',
  getColDef: () => colDefA,
} as Column;
let colDefA: Record<string, unknown> = {};

interface Access {
  note?: Note;
  isReadOnly?: boolean;
  isSuppressed?: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface ServiceHarness {
  notes: Map<string, Note>;
  access: (params: NoteParams) => Access | undefined;
  setNote: ReturnType<typeof vi.fn>;
  registerCalls: { name: string; order: number }[];
  factory: (params: MenuActionParams) => unknown;
}

function makeService(options: { notes?: Note[]; notesOptions?: Record<string, unknown> } = {}) {
  const notes = new Map<string, Note>();
  const h: ServiceHarness = { notes, access: undefined as never, setNote: vi.fn(), registerCalls: [], factory: undefined as never };
  const colId = (params: NoteParams): string =>
    'location' in params && params.location === 'fullWidthRow'
      ? 'fw'
      : typeof params.column === 'string'
        ? params.column
        : (params.column as Column).getColId();
  const notesDataSvc = {
    hasDataSource: () => true,
    supportsFullWidthRows: () => false,
    getNote: (params: NoteParams) => notes.get(`${params.rowNode.id}::${colId(params)}`),
    setNote: (params: { note: Note | undefined } & NoteParams) => {
      h.setNote(params);
    },
  };
  const beans = {
    gridApi: {} as GridApi,
    colModel: { getCol: (key: string) => (key === 'a' ? colA : undefined) },
    notesDataSvc,
    menuItemMapper: {
      registry: {
        register: (contribution: MenuItemContribution) => {
          h.registerCalls.push({ name: contribution.name, order: contribution.order });
          h.factory = contribution.factory;
        },
      },
    },
  };
  const harness = makeBeanHarness(NotesService, {
    gridOptions: { context: { user: 'u' }, ...options.notesOptions } as never,
    beans,
  });
  for (const note of options.notes ?? []) {
    notes.set(keyForParams(note.params as NoteParams), note.value);
  }
  h.access = (params: NoteParams) => {
    const access = harness.bean.getNoteAccess(params);
    return access ? { ...access } : undefined;
  };
  return { ...harness, ...h };
}

const note = (params: NoteParams, value: Note) => ({ params, value });

describe('NotesService (unit)', () => {
  it('reflects the data service state', () => {
    const { bean, destroy } = makeService();
    expect(bean.hasDataSource()).toBe(true);
    destroy();
  });

  it('registers the `note` menu contribution with the stub-winning identity', () => {
    const { registerCalls, destroy } = makeService();
    expect(registerCalls).toEqual([{ name: 'note', order: 40 }]);
    destroy();
  });

  describe('getNoteAccess', () => {
    it('reports an editable note', () => {
      const { access, destroy } = makeService({
        notes: [note({ rowNode, column: 'a' }, { text: 'hi', author: 'ann' })],
      });
      const result = access({ rowNode, column: 'a' });
      expect(result).toMatchObject({
        note: { text: 'hi', author: 'ann' },
        isReadOnly: false,
        isSuppressed: false,
        canView: true,
        canCreate: false,
        canEdit: true,
        canDelete: true,
        column: colA,
      });
      destroy();
    });

    it('allows creating on a cell without a note', () => {
      const { access, destroy } = makeService();
      expect(access({ rowNode, column: 'a' })).toMatchObject({
        note: undefined,
        canView: false,
        canCreate: true,
        canEdit: false,
        canDelete: false,
      });
      destroy();
    });

    it('reports read-only notes', () => {
      const { access, destroy } = makeService({
        notes: [note({ rowNode, column: 'a' }, { text: 'hi', readOnly: true })],
      });
      expect(access({ rowNode, column: 'a' })).toMatchObject({
        isReadOnly: true,
        canView: true,
        canEdit: false,
        canDelete: false,
        canCreate: false,
      });
      destroy();
    });

    it('applies suppressNoteActions booleans and callbacks', () => {
      colDefA = { suppressNoteActions: true };
      const suppressed = makeService({
        notes: [note({ rowNode, column: 'a' }, { text: 'hi' })],
      });
      expect(suppressed.access({ rowNode, column: 'a' })).toMatchObject({
        isSuppressed: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canView: true,
      });
      suppressed.destroy();

      const seen: { node?: IRowNode; data?: unknown; context?: unknown; api?: unknown }[] = [];
      colDefA = {
        suppressNoteActions: (params: { node: IRowNode; data?: unknown }) => {
          seen.push({ node: params.node, data: params.data });
          return params.node.id === 'row-1';
        },
      };
      const h = makeService({
        notes: [note({ rowNode, column: 'a' }, { text: 'hi' })],
        notesOptions: { context: { user: 'u' } },
      });
      expect(h.access({ rowNode, column: 'a' })?.isSuppressed).toBe(true);
      expect(h.access({ rowNode: rowNode2, column: 'a' })?.isSuppressed).toBe(false);
      expect(seen[0]).toMatchObject({ node: rowNode, data: { a: 1 } });
      expect(h.factory({ node: rowNode, column: colA, value: 1, api: {} })).toEqual([
        { name: 'View Note', action: expect.any(Function) },
      ]);
      h.destroy();

      colDefA = {};
    });

    it('never suppresses full width rows and omits the column', () => {
      colDefA = { suppressNoteActions: true };
      const { access, destroy } = makeService();
      expect(access({ rowNode, location: 'fullWidthRow' })).toMatchObject({
        isSuppressed: false,
        canCreate: true,
        column: undefined,
      });
      destroy();
      colDefA = {};
    });

    it('resolves Column objects as well as column ids', () => {
      const { access, destroy } = makeService({
        notes: [note({ rowNode, column: 'a' }, { text: 'hi' })],
      });
      expect(access({ rowNode, column: colA })?.canEdit).toBe(true);
      destroy();
    });
  });

  describe('menu items', () => {
    const call = (factory: (p: MenuActionParams) => unknown, node: IRowNode, column: Column) =>
      factory({ node, column, value: 1, api: {} as GridApi });

    it('returns null without a data source, node or column', () => {
      const { factory, destroy } = makeService();
      expect(call(factory, rowNode, colA)).not.toBeNull();
      expect(factory({ node: rowNode, column: null, value: 1, api: {} as GridApi })).toBeNull();
      expect(factory({ node: null, column: colA, value: 1, api: {} as GridApi })).toBeNull();
      destroy();
    });

    it('offers Add Note on a note-less cell', () => {
      const { factory, destroy } = makeService();
      expect(call(factory, rowNode, colA)).toEqual([{ name: 'Add Note', action: expect.any(Function) }]);
      destroy();
    });

    it('offers Edit and Remove Note on an editable note; Remove clears the note', () => {
      const h = makeService({ notes: [note({ rowNode, column: 'a' }, { text: 'hi' })] });
      const items = call(h.factory, rowNode, colA) as { name: string; action: () => void; disabled?: boolean }[];
      expect(items.map((i) => i.name)).toEqual(['Edit Note', 'Remove Note']);
      h.setNote.mockClear();
      items[1].action();
      expect(h.setNote).toHaveBeenCalledWith({ rowNode, column: colA, note: undefined });
      h.destroy();
    });

    it('offers View and a disabled Remove Note on a read-only note', () => {
      const { factory, destroy } = makeService({
        notes: [note({ rowNode, column: 'a' }, { text: 'hi', readOnly: true })],
      });
      expect(call(factory, rowNode, colA)).toEqual([
        { name: 'View Note', action: expect.any(Function) },
        { name: 'Remove Note', disabled: true },
      ]);
      destroy();
    });

    it('offers only View Note on a suppressed cell with a note, nothing without', () => {
      colDefA = { suppressNoteActions: true };
      const h = makeService({ notes: [note({ rowNode, column: 'a' }, { text: 'hi' })] });
      expect(call(h.factory, rowNode, colA)).toEqual([{ name: 'View Note', action: expect.any(Function) }]);
      const bare = makeService();
      expect(call(bare.factory, rowNode, colA)).toBeNull();
      h.destroy();
      bare.destroy();
      colDefA = {};
    });
  });

  describe('setNote / showNote / refreshNotes', () => {
    it('delegates setNote to the data service', () => {
      const params = { rowNode, column: 'a' as Column, note: { text: 'x' } };
      const { bean, setNote, destroy } = makeService();
      bean.setNote(params);
      expect(setNote).toHaveBeenCalledWith(params);
      destroy();
    });

    it('refuses to write without a data source', () => {
      const params = { rowNode, column: 'a' as Column, note: { text: 'x' } };
      const h = makeService();
      (h.beans.notesDataSvc as { hasDataSource: () => boolean }).hasDataSource = () => false;
      const { bean, setNote, destroy } = h;
      bean.setNote(params);
      expect(setNote).not.toHaveBeenCalled();
      destroy();
    });

    it('showNote is false when the target is not rendered or Notes is off', () => {
      const h = makeService();
      expect(h.bean.showNote({ rowNode, column: 'a' } as NoteParams)).toBe(false);
      (h.beans.notesDataSvc as { hasDataSource: () => boolean }).hasDataSource = () => false;
      expect(h.bean.showNote({ rowNode, column: 'a' } as NoteParams)).toBe(false);
      h.destroy();
    });

    it('refreshNotes filters by row and column without throwing on empty state', () => {
      const { bean, destroy } = makeService();
      expect(() => bean.refreshNotes()).not.toThrow();
      const params: RefreshNotesParams = {
        rowNodes: [rowNode, rowNode2],
        columns: ['a' as unknown as Column],
      };
      expect(() => bean.refreshNotes(params)).not.toThrow();
      destroy();
    });
  });

  describe('options', () => {
    it('defaults noteTrigger hover with the documented delays', () => {
      const { bean, destroy } = makeService();
      expect(bean.noteTrigger()).toBe('hover');
      expect(bean.noteShowDelay()).toBe(180);
      expect(bean.noteHideDelay()).toBe(220);
      destroy();
    });

    it('honours overrides, falling back on invalid values', () => {
      const { bean, gos, destroy } = makeService();
      gos.set('noteTrigger', 'click');
      gos.set('noteShowDelay', 0);
      gos.set('noteHideDelay', 50);
      expect(bean.noteTrigger()).toBe('click');
      expect(bean.noteShowDelay()).toBe(0);
      expect(bean.noteHideDelay()).toBe(50);
      gos.set('noteTrigger', 'bogus');
      gos.set('noteShowDelay', -5);
      expect(bean.noteTrigger()).toBe('hover');
      expect(bean.noteShowDelay()).toBe(180);
      destroy();
    });
  });

  describe('data source lifecycle', () => {
    it('onDataSourceChanged closes the popup and tolerates an empty feature set', () => {
      const { bean, destroy } = makeService();
      expect(() => bean.onDataSourceChanged()).not.toThrow();
      destroy();
    });
  });
});

describe('keyForParams', () => {
  it('keys cells by row id + column id and full width rows by marker', () => {
    expect(keyForParams({ rowNode, column: 'a' })).toBe('row-1::a');
    expect(keyForParams({ rowNode, column: colA })).toBe('row-1::a');
    expect(keyForParams({ rowNode, location: 'fullWidthRow' })).toBe('row-1::__fullWidth__');
    expect(keyForParams({ rowNode, location: 'fullWidthRow', pinned: 'left' })).toBe('row-1::__fullWidth__');
  });
});
