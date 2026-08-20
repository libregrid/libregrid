/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import type { Column, IRowNode, Note, NotesDataSource } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { NotesDataService } from './notesDataService';

const colA: Column = { getColId: () => 'a' } as Column;
const rowNode = { id: 'row-1' } as IRowNode;

interface DataSourceHarness {
  source: NotesDataSource;
  inits: unknown[];
  destroys: number;
  gets: unknown[];
  sets: unknown[];
  notes: Map<string, Note>;
}

function makeDataSource(options: { fullWidth?: boolean } = {}): DataSourceHarness {
  const notes = new Map<string, Note>();
  const h: DataSourceHarness = { source: undefined as unknown as NotesDataSource, inits: [], destroys: 0, gets: [], sets: [], notes };
  h.source = {
    init: (params: unknown) => {
      h.inits.push(params);
    },
    destroy: () => {
      h.destroys++;
    },
    getNote: (params: { rowNode: IRowNode; column?: Column; location?: string; pinned?: 'left' | 'right' }) => {
      h.gets.push(params);
      const key =
        params.location === 'fullWidthRow'
          ? `${params.rowNode.id}::__fullWidth__${params.pinned ?? ''}`
          : `${params.rowNode.id}::${(params.column as Column).getColId()}`;
      return notes.get(key);
    },
    setNote: (params: { rowNode: IRowNode; column?: Column; location?: string; pinned?: 'left' | 'right'; note: Note | undefined }) => {
      h.sets.push(params);
      const key =
        params.location === 'fullWidthRow'
          ? `${params.rowNode.id}::__fullWidth__${params.pinned ?? ''}`
          : `${params.rowNode.id}::${(params.column as Column).getColId()}`;
      if (params.note) {
        notes.set(key, params.note);
      } else {
        notes.delete(key);
      }
    },
    ...(options.fullWidth ? { supportsFullWidthRows: true as const } : {}),
  };
  return h;
}

function makeHarness(options: { gridOptions?: Record<string, unknown>; dataSource?: DataSourceHarness } = {}) {
  const colLookups: string[] = [];
  const beans = {
    gridApi: { id: 'grid' },
    colModel: {
      getCol: (key: string) => {
        colLookups.push(key);
        return key === 'a' ? colA : undefined;
      },
    },
  };
  const harness = makeBeanHarness(NotesDataService, {
    gridOptions: options.gridOptions as never,
    beans,
  });
  return { ...harness, colLookups, dataSource: options.dataSource };
}

describe('NotesDataService (unit)', () => {
  it('starts with no data source and tolerates note access', () => {
    const { bean, destroy } = makeHarness();
    expect(bean.hasDataSource()).toBe(false);
    expect(bean.supportsFullWidthRows()).toBe(false);
    expect(bean.getNote({ rowNode, column: 'a' })).toBeUndefined();
    expect(() => bean.setNote({ rowNode, column: 'a', note: { text: 'x' } })).not.toThrow();
    destroy();
  });

  it('initialises the initial option in postConstruct with api and context', () => {
    const ds = makeDataSource();
    makeHarness({
      gridOptions: { notesDataSource: ds.source, context: { user: 'u1' } },
      dataSource: ds,
    });
    expect(ds.inits).toHaveLength(1);
    expect(ds.inits[0]).toEqual({ api: { id: 'grid' }, context: { user: 'u1' } });
  });

  it('maps string ColKeys to Column objects via colModel before delegating', () => {
    const ds = makeDataSource();
    ds.notes.set('row-1::a', { text: 'hi', author: 'ann' });
    const { bean, colLookups, destroy } = makeHarness({
      gridOptions: { notesDataSource: ds.source },
      dataSource: ds,
    });
    expect(bean.getNote({ rowNode, column: 'a' })).toEqual({ text: 'hi', author: 'ann' });
    expect(colLookups).toEqual(['a']);
    expect(ds.gets[0]).toEqual({ rowNode, column: colA });
    destroy();
  });

  it('passes live Column objects through without a colModel lookup', () => {
    const ds = makeDataSource();
    ds.notes.set('row-1::a', { text: 'hi' });
    const { bean, colLookups, destroy } = makeHarness({
      gridOptions: { notesDataSource: ds.source },
      dataSource: ds,
    });
    expect(bean.getNote({ rowNode, column: colA })).toEqual({ text: 'hi' });
    expect(colLookups).toEqual([]);
    destroy();
  });

  it('delegates setNote with the resolved column and clears on undefined', () => {
    const ds = makeDataSource();
    const { bean, destroy } = makeHarness({
      gridOptions: { notesDataSource: ds.source },
      dataSource: ds,
    });
    bean.setNote({ rowNode, column: 'a', note: { text: 'hi' } });
    expect(ds.sets).toHaveLength(1);
    expect(ds.sets[0]).toEqual({ rowNode, column: colA, note: { text: 'hi' } });
    bean.setNote({ rowNode, column: 'a', note: undefined });
    expect(ds.sets[1]).toEqual({ rowNode, column: colA, note: undefined });
    destroy();
  });

  it('ignores full-width params for cell-only data sources', () => {
    const ds = makeDataSource();
    const { bean, destroy } = makeHarness({
      gridOptions: { notesDataSource: ds.source },
      dataSource: ds,
    });
    expect(bean.supportsFullWidthRows()).toBe(false);
    expect(bean.getNote({ rowNode, location: 'fullWidthRow' })).toBeUndefined();
    bean.setNote({ rowNode, location: 'fullWidthRow', note: { text: 'x' } });
    expect(ds.gets).toHaveLength(0);
    expect(ds.sets).toHaveLength(0);
    destroy();
  });

  it('delegates full-width params to full-width data sources, keeping the pinned section', () => {
    const ds = makeDataSource({ fullWidth: true });
    ds.notes.set('row-1::__fullWidth__left', { text: 'fw' });
    const { bean, destroy } = makeHarness({
      gridOptions: { notesDataSource: ds.source },
      dataSource: ds,
    });
    expect(bean.supportsFullWidthRows()).toBe(true);
    expect(bean.getNote({ rowNode, location: 'fullWidthRow', pinned: 'left' })).toEqual({ text: 'fw' });
    expect(ds.gets[0]).toEqual({ rowNode, location: 'fullWidthRow', pinned: 'left' });
    expect(bean.getNote({ rowNode, location: 'fullWidthRow' })).toBeUndefined();
    expect(ds.gets[1]).toEqual({ rowNode, location: 'fullWidthRow' });
    destroy();
  });

  it('destroys the outgoing source and inits the incoming one on runtime swap', () => {
    const first = makeDataSource();
    const second = makeDataSource();
    second.notes.set('row-1::a', { text: 'new' });
    const { bean, gos, destroy } = makeHarness({
      gridOptions: { notesDataSource: first.source },
      dataSource: first,
    });
    gos.set('notesDataSource', second.source);
    expect(first.destroys).toBe(1);
    expect(second.inits).toHaveLength(1);
    expect(bean.getNote({ rowNode, column: 'a' })).toEqual({ text: 'new' });

    // Setting the same instance again is a no-op.
    gos.set('notesDataSource', second.source);
    expect(second.destroys).toBe(0);
    expect(second.inits).toHaveLength(1);
    destroy();
  });

  it('destroys the source when the bean is destroyed', () => {
    const ds = makeDataSource();
    const { destroy } = makeHarness({ gridOptions: { notesDataSource: ds.source }, dataSource: ds });
    destroy();
    expect(ds.destroys).toBe(1);
  });
});
