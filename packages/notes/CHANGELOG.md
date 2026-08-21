# @libregrid/notes

## 1.2.0

### Minor Changes

- 3a7c86d: A4: cell and full-width-row notes (Enterprise `Notes` module parity).

  - **New `@libregrid/notes`** — the AG Grid Community notes feature. Provide a `notesDataSource` (or a `FullWidthNotesDataSource` with `supportsFullWidthRows: true`) and register `NotesModule`. Notes open on hover (`noteTrigger: 'hover'`, `noteShowDelay`, `noteHideDelay`), on click (`noteTrigger: 'click'`), or with `Shift+F2`. Noted cells and full-width rows are marked with the `lgr-cell-has-note` class. The popup edits text only (metadata is rendered as provided), commits on close when changed, and honours `note.readOnly`. `colDef.suppressNoteActions` (boolean or callback) hides note interactions per column — suppressed cells with an existing note only offer _View Note_. `notesDataSource` can be set or cleared at runtime with `setGridOption`; the grid reacts without a redraw. Grid API: `getNote`, `setNote`, `refreshNotes` (the reserved Enterprise method names).
  - **Context menu `note` item is now in the default menu** — `DEFAULT_CONTEXT_MENU_ITEMS` ends with a `note` entry. Without `@libregrid/notes` registered the factory resolves to nothing and the menu is unchanged (separator trimming); with it, cells gain _Add Note_ / _Edit Note_ + _Remove Note_ / _View Note_ (read-only) items.
  - **`@libregrid/all`** re-exports the notes module.

### Patch Changes

- Updated dependencies [3a7c86d]
- Updated dependencies [192f180]
- Updated dependencies [c4c47ae]
- Updated dependencies [3a7c86d]
  - @libregrid/menu@1.2.0
  - @libregrid/core@1.2.0
