import { describe, expect, it } from 'vitest';
import { EnterpriseCoreModule } from '@libregrid/core';
import { NotesModule } from './notesModule';
import { NotesDataService } from './notesDataService';
import { NotesService } from './notesService';
import { VERSION } from './version';

describe('NotesModule', () => {
  it('registers under the reserved Community module name "Notes"', () => {
    // The community runtime validates the `notesDataSource` option against a
    // registered module named "Notes" — any other name fails validation.
    expect(NotesModule.moduleName).toBe('Notes');
    expect(NotesModule.version).toBe(VERSION);
    expect(NotesModule.enterprise).toBe(true);
    expect(NotesModule.dependsOn).toEqual([EnterpriseCoreModule]);
  });

  it('owns the two reserved note beans and the marker CSS', () => {
    expect(NotesModule.beans).toContain(NotesDataService);
    expect(NotesModule.beans).toContain(NotesService);
    expect(NotesModule.css).toHaveLength(1);
    expect(NotesModule.css?.[0]).toContain('lgr-note-popup');
    expect(NotesModule.css?.[0]).toContain('lgr-cell-has-note');
  });

  it('provides the GridApi functions the community reserves for the Notes module', () => {
    const api = NotesModule.apiFunctions as Record<string, unknown>;
    expect(Object.keys(api).sort()).toEqual(['getNote', 'refreshNotes', 'setNote']);
    for (const fn of Object.values(api)) {
      expect(typeof fn).toBe('function');
    }
  });

  it('api functions delegate to the notesSvc bean and tolerate its absence', () => {
    const api = NotesModule.apiFunctions as unknown as {
      getNote(beans: unknown, params: unknown): unknown;
      setNote(beans: unknown, params: unknown): void;
      refreshNotes(beans: unknown, params?: unknown): void;
    };
    const params = { rowNode: { id: 'r' }, column: 'a' };
    const beansWithout = {};
    // No bean registered (e.g. grid destroyed): no throw, no note.
    expect(api.getNote(beansWithout, params)).toBeUndefined();
    expect(() => api.setNote(beansWithout, params)).not.toThrow();
    expect(() => api.refreshNotes(beansWithout)).not.toThrow();
  });
});
