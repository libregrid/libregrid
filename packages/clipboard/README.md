# @libregrid/clipboard

Excel-compatible copy, cut, and paste for cell ranges. TSV formatting
handles quoted delimiters and embedded line breaks correctly. Pasting into
Excel, Google Sheets, or a text editor round-trips cleanly.

Replaces AG Grid Enterprise's `Clipboard` module.

## Install

```bash
npm install ag-grid-community @libregrid/clipboard
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/cell-selection` and `@libregrid/menu` are installed
automatically. Register them too for range-based copy and the context-menu
copy/paste items.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { ClipboardModule } from '@libregrid/clipboard';

ModuleRegistry.registerModules([AllCommunityModule, CellSelectionModule, ClipboardModule]);

const api = createGrid(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'name' }, { field: 'value' }],
  rowData: [{ name: 'Widget', value: 42 }],
  defaultColDef: { editable: true },
  cellSelection: true,
});

api.copySelectedRangeToClipboard({ includeHeaders: true });
```

With `@libregrid/menu` also registered, Copy/Cut/Paste appear in the
right-click context menu automatically. Keyboard shortcuts
(<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>C</kbd>/<kbd>X</kbd>/<kbd>V</kbd>) work
once the module is registered. No extra configuration is needed.

### Working with delimited text directly

```ts
import { toDelimited, fromDelimited } from '@libregrid/clipboard';

const text = toDelimited([
  ['name', 'value'],
  ['Widget', 42],
]); // "name\tvalue\nWidget\t42"

const rows = fromDelimited(text); // [['name', 'value'], ['Widget', '42']]
```

## API

| Export | Purpose |
| --- | --- |
| `ClipboardModule` | Registers the feature (`moduleName: 'Clipboard'`). |
| `ClipboardService` | Bean backing copy/cut/paste and the browser Clipboard API integration. |
| `GridClipboardService` | Grid-data-aware layer on top of `ClipboardService` (range extraction, paste application). |
| `toDelimited(rows, delimiter?)` / `fromDelimited(text, delimiter?)` | TSV (or other delimiter) encode/decode, independent of the grid. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/cell-selection`](https://github.com/libregrid/libregrid/blob/main/packages/cell-selection/README.md) — the range this package copies from

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
