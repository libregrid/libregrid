# @libregrid/excel-export

Exports grid data to `.xlsx` files. The writer builds OOXML SpreadsheetML
inside the browser. It uses `fflate` to assemble the ZIP archive. No server is
required.

Replaces AG Grid Enterprise's `ExcelExport` module.

## Install

```bash
npm install ag-grid-community @libregrid/excel-export
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { ExcelExportModule } from '@libregrid/excel-export';

ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);

const api = createGrid(document.querySelector('#grid')!, {
  columnDefs: [{ field: 'name' }, { field: 'value' }],
  rowData: [{ name: 'Widget', value: 42 }],
});

api.exportDataAsExcel();
```

## API

| Method | Purpose |
| --- | --- |
| `exportDataAsExcel(params?)` | Downloads the grid data as an `.xlsx` file. |
| `getDataAsExcel(params?)` | Returns the `.xlsx` bytes as a Blob. |
| `getSheetDataForExcel(params?)` | Returns the raw XML for one worksheet. |
| `exportMultipleSheetsAsExcel(params)` | Downloads several worksheets in one file. |
| `getMultipleSheetsAsExcel(params)` | Returns several worksheets in one Blob. |

Pass `ExcelExportParams` to control the file name, the sheet name, styling,
freeze panes, row-group outlines, page setup, and protection.

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
