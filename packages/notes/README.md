# @libregrid/notes

Adds cell and full-width-row notes to AG Grid Community: hover (or click) a
noted cell to open a note editor, create and edit notes from the context menu
or with `Shift+F2`, and mark noted cells with a dot.

Replaces AG Grid Enterprise's `Notes` module.

## Install

```bash
npm install ag-grid-community @libregrid/notes
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

Provide a `notesDataSource` that stores notes, and register the module:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid, type Note, type NotesDataSource } from 'ag-grid-community';
import { NotesModule } from '@libregrid/notes';
import { ContextMenuModule } from '@libregrid/menu';

ModuleRegistry.registerModules([AllCommunityModule, NotesModule, ContextMenuModule]);

// A minimal in-memory data source (cell notes only).
const store = new Map<string, Note>();
const cellKey = (params: { rowNode: { id: string }; column: { getColId(): string } }): string =>
  `${params.rowNode.id}::${params.column.getColId()}`;

const notesDataSource: NotesDataSource = {
  init: () => {},
  destroy: () => store.clear(),
  getNote: (params) =>
    params.location === 'fullWidthRow'
      ? undefined // add `supportsFullWidthRows: true` for full-width row notes
      : store.get(cellKey(params)),
  setNote: (params) => {
    if (params.location === 'fullWidthRow') return;
    if (params.note) {
      store.set(cellKey(params), params.note);
    } else {
      store.delete(cellKey(params));
    }
  },
};

const api = createGrid(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'country' }, { field: 'sales' }],
  rowData,
  getRowId: (params) => String(params.data.country), // stable ids are required
  notesDataSource,
});
```

### Options

| Option | Default | Purpose |
| --- | --- | --- |
| `notesDataSource` | `undefined` | The `NotesDataSource` that stores notes. Set or clear it at any time with `setGridOption`; the grid reacts without a redraw. |
| `noteTrigger` | `'hover'` | `'hover'` opens the popup after `noteShowDelay`; `'click'` opens it on left mousedown. |
| `noteShowDelay` | `180` | Milliseconds the pointer must rest on a noted cell before the popup opens (hover trigger). |
| `noteHideDelay` | `220` | Milliseconds the pointer may stay off the popup before it closes again. |
| `isFullWidthRow` + `fullWidthCellRenderer` | — | The standard full-width row options; full-width rows support notes when the data source sets `supportsFullWidthRows: true`. |

Per column, `suppressNoteActions` (boolean or
`(params: { node, column, data, colDef, api, context }) => boolean`) hides all
note interactions for that column. Suppressed cells with an existing note only
offer *View Note*; without a note they offer nothing.

### Behaviour

- **Opening:** hover (default) or click, per `noteTrigger`. `Shift+F2` on a
  rendered cell (or full-width row) also opens the editor, creating the note
  when there is none.
- **Editor:** a resizable popup with the note text (a `textarea` when
  editable, a read-only `div` otherwise), the author, and `Created` /
  `Updated` lines rendered exactly as provided by your data source. Closing
  commits only when the text actually changed; a brand-new note is committed
  only if it has non-empty text. Metadata is never edited by the popup.
- **Markers:** rendered cells and full-width rows carrying a note get the
  `lgr-cell-has-note` class (a small dot, styled by the module CSS).
- **Context menu:** with `@libregrid/menu` registered, cells gain note items —
  *Add Note* (no note), *Edit Note* / *Remove Note* (editable), *View Note*
  with a disabled *Remove Note* (read-only).
- **Read-only:** `note.readOnly` notes can be viewed but not edited or removed.
- **No `noteChanged` event:** the module follows the Enterprise contract —
  your data source is the source of truth and receives every `setNote`.

## API

| Export | Purpose |
| --- | --- |
| `NotesModule` | Registers the feature (`moduleName: 'Notes'`). |
| `NotesService` | Bean (`notesSvc`) — note access, popups, markers, the `note` context-menu item. |
| `NotesDataService` | Bean (`notesDataSvc`) — validates and drives the `notesDataSource` lifecycle. |
| `api.getNote(params)` | Read the note for a cell or full-width row. |
| `api.setNote(params)` | Create, update or remove a note (pass `note: undefined` to remove). |
| `api.refreshNotes(params?)` | Re-evaluate markers/popups, optionally scoped by `rowNodes` / `columns`. |
| `keyForParams(params)` | Stable `rowId::colId` (or `rowId::__fullWidth__`) key used by the feature map. |
| `NOTE_MARKER_CLASS` | The `lgr-cell-has-note` CSS class. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/menu`](https://github.com/libregrid/libregrid/blob/main/packages/menu/README.md) — the context menu the note items plug into

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
