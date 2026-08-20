import type {
  _ModuleWithApi,
  BeanCollection,
  GetNoteParams,
  Note,
  RefreshNotesParams,
  SetNoteParams,
} from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { notesCss } from './notesCss';
import { NotesDataService } from './notesDataService';
import { NotesService } from './notesService';
import { VERSION } from './version';

/** The GridApi surface contributed by this module's `apiFunctions`. */
export interface NotesGridApi {
  getNote(params: GetNoteParams): Note | undefined;
  setNote(params: SetNoteParams): void;
  refreshNotes(params?: RefreshNotesParams): void;
}

function notesSvc(beans: BeanCollection) {
  return beans.notesSvc as NotesService | undefined;
}

function getNote(beans: BeanCollection, params: GetNoteParams): Note | undefined {
  return notesSvc(beans)?.getNote(params);
}

function setNote(beans: BeanCollection, params: SetNoteParams): void {
  notesSvc(beans)?.setNote(params);
}

function refreshNotes(beans: BeanCollection, params?: RefreshNotesParams): void {
  notesSvc(beans)?.refreshNotes(params);
}

/**
 * Registers the `notesDataSvc` + `notesSvc` beans (the `notesDataSource`
 * option and the built-in note editor), the `getNote` / `setNote` /
 * `refreshNotes` GridApi functions Community reserves for the `Notes`
 * module, the `note` context-menu contribution and the note marker CSS.
 * `notesDataSource` on the grid options enables Notes; it may be set,
 * replaced or removed at runtime.
 *
 * @feature Notes
 */
export const NotesModule: _ModuleWithApi<NotesGridApi> = {
  moduleName: 'Notes',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  beans: [NotesDataService, NotesService],
  css: [notesCss],
  apiFunctions: { getNote, setNote, refreshNotes },
};
