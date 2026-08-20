---
"@libregrid/notes": minor
"@libregrid/menu": minor
"@libregrid/all": minor
---

A4: cell and full-width-row notes (Enterprise `Notes` module parity).

- **New `@libregrid/notes`** — the AG Grid Community notes feature. Provide a `notesDataSource` (or a `FullWidthNotesDataSource` with `supportsFullWidthRows: true`) and register `NotesModule`. Notes open on hover (`noteTrigger: 'hover'`, `noteShowDelay`, `noteHideDelay`), on click (`noteTrigger: 'click'`), or with `Shift+F2`. Noted cells and full-width rows are marked with the `lgr-cell-has-note` class. The popup edits text only (metadata is rendered as provided), commits on close when changed, and honours `note.readOnly`. `colDef.suppressNoteActions` (boolean or callback) hides note interactions per column — suppressed cells with an existing note only offer *View Note*. `notesDataSource` can be set or cleared at runtime with `setGridOption`; the grid reacts without a redraw. Grid API: `getNote`, `setNote`, `refreshNotes` (the reserved Enterprise method names).
- **Context menu `note` item is now in the default menu** — `DEFAULT_CONTEXT_MENU_ITEMS` ends with a `note` entry. Without `@libregrid/notes` registered the factory resolves to nothing and the menu is unchanged (separator trimming); with it, cells gain *Add Note* / *Edit Note* + *Remove Note* / *View Note* (read-only) items.
- **`@libregrid/all`** re-exports the notes module.
