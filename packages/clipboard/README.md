# @libregrid/clipboard

Copy, cut, and paste grid values as tab-delimited text. Use cell ranges for
spreadsheet workflows, or the standalone encode/decode helpers for delimited
data outside the grid.

[Documentation and examples](https://libregrid.dev/selection)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/clipboard
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/cell-selection` and `@libregrid/menu` are installed
automatically. Register them too for range-based copy and the context-menu
copy/paste items.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<button id="copy">Copy selected cells</button>
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { ClipboardModule } from '@libregrid/clipboard';

ModuleRegistry.registerModules([AllCommunityModule, CellSelectionModule, ClipboardModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'name' }, { field: 'value' }],
  rowData: [{ name: 'Widget', value: 42 }],
  defaultColDef: { editable: true },
  cellSelection: true,
});

document.querySelector('#copy')!.addEventListener('click', () => {
  api.copySelectedRangeToClipboard({ includeHeaders: true });
});
```

With `@libregrid/menu` also registered, Copy/Cut/Paste appear in the
right-click context menu automatically. Keyboard shortcuts
(<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>C</kbd>/<kbd>X</kbd>/<kbd>V</kbd>) work
once the module is registered. Browser clipboard access may require HTTPS (or localhost), a user gesture,
and permission. Paste writes only to editable cells.

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

| Export                                                              | Purpose                                                                                   |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `ClipboardModule`                                                   | Registers the feature (`moduleName: 'Clipboard'`).                                        |
| `ClipboardService`                                                  | Bean backing copy/cut/paste and the browser Clipboard API integration.                    |
| `GridClipboardService`                                              | Grid-data-aware layer on top of `ClipboardService` (range extraction, paste application). |
| `toDelimited(rows, delimiter?)` / `fromDelimited(text, delimiter?)` | TSV (or other delimiter) encode/decode, independent of the grid.                          |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/cell-selection`](https://github.com/libregrid/libregrid/blob/main/packages/cell-selection/README.md) — the range this package copies from

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
