# @libregrid/notes

Attach notes to cells or full-width rows. Users can open the note editor from
the context menu or with Shift+F2, and noted cells show a marker. Your data
source controls storage, metadata, and whether a note is editable.

[Documentation and examples](https://libregrid.dev/notes)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/notes
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<div id="grid" style="height: 400px"></div>
```

Provide a `notesDataSource` that stores notes, and register the module:

```ts
import {
  ModuleRegistry,
  AllCommunityModule,
  createGrid,
  type Note,
  type NotesDataSource,
} from 'ag-grid-community';
import { NotesModule } from '@libregrid/notes';
import { ContextMenuModule } from '@libregrid/menu';

ModuleRegistry.registerModules([AllCommunityModule, NotesModule, ContextMenuModule]);

// A minimal in-memory data source (cell notes only).
const store = new Map<string, Note>();
const cellKey = (params: {
  rowNode: { id: string | undefined };
  column: { getColId(): string };
}): string => `${params.rowNode.id}::${params.column.getColId()}`;

const notesDataSource: NotesDataSource = {
  init: () => {},
  destroy: () => store.clear(),
  getNote: (params) => store.get(cellKey(params)),
  setNote: (params) => {
    if (params.note) {
      store.set(cellKey(params), params.note);
    } else {
      store.delete(cellKey(params));
    }
  },
};

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'country' }, { field: 'sales' }],
  rowData: [
    { country: 'Japan', sales: 120 },
    { country: 'Canada', sales: 240 },
  ],
  getRowId: (params) => String(params.data.country), // stable ids are required
  notesDataSource,
});
```

### Options

| Option                                     | Default     | Purpose                                                                                                                      |
| ------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `notesDataSource`                          | `undefined` | The `NotesDataSource` that stores notes. Set or clear it at any time with `setGridOption`; the grid reacts without a redraw. |
| `noteTrigger`                              | `'hover'`   | `'hover'` opens the popup after `noteShowDelay`; `'click'` opens it on left mousedown.                                       |
| `noteShowDelay`                            | `180`       | Milliseconds the pointer must rest on a noted cell before the popup opens (hover trigger).                                   |
| `noteHideDelay`                            | `220`       | Milliseconds the pointer may stay off the popup before it closes again.                                                      |
| `isFullWidthRow` + `fullWidthCellRenderer` | —           | The standard full-width row options; full-width rows support notes when the data source sets `supportsFullWidthRows: true`.  |

Per column, `suppressNoteActions` (boolean or
`(params: { node, column, data, colDef, api, context }) => boolean`) hides all
note interactions for that column. Suppressed cells with an existing note only
offer _View Note_; without a note they offer nothing.

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
  _Add Note_ (no note), _Edit Note_ / _Remove Note_ (editable), _View Note_
  with a disabled _Remove Note_ (read-only).
- **Read-only:** `note.readOnly` notes can be viewed but not edited or removed.
- **Change handling:** the data source receives each `setNote` call. Use that
  callback to save changes; there is no `noteChanged` event.

For full-width notes, implement `FullWidthNotesDataSource` from
`ag-grid-community`, set `supportsFullWidthRows: true`, and handle both cell
and full-width-row locations in its callbacks.

The example stores notes in memory and loses them on grid destruction or page
reload. Implement durable storage and access checks in your application’s data
source. Read-only UI flags are not a substitute for server-side authorization.

## API

| Export                      | Purpose                                                                         |
| --------------------------- | ------------------------------------------------------------------------------- |
| `NotesModule`               | Registers the feature (`moduleName: 'Notes'`).                                  |
| `NotesService`              | Bean (`notesSvc`) — note access, popups, markers, the `note` context-menu item. |
| `NotesDataService`          | Bean (`notesDataSvc`) — validates and drives the `notesDataSource` lifecycle.   |
| `api.getNote(params)`       | Read the note for a cell or full-width row.                                     |
| `api.setNote(params)`       | Create, update or remove a note (pass `note: undefined` to remove).             |
| `api.refreshNotes(params?)` | Re-evaluate markers/popups, optionally scoped by `rowNodes` / `columns`.        |
| `keyForParams(params)`      | Stable `rowId::colId` (or `rowId::__fullWidth__`) key used by the feature map.  |
| `NOTE_MARKER_CLASS`         | The `lgr-cell-has-note` CSS class.                                              |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/menu`](https://github.com/libregrid/libregrid/blob/main/packages/menu/README.md) — the context menu the note items plug into

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
