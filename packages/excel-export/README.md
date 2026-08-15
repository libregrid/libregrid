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
| `getSheetDataForExcel(params?)` | Returns the data for one worksheet as an opaque string. |
| `exportMultipleSheetsAsExcel(params)` | Downloads several worksheets in one file. |
| `getMultipleSheetsAsExcel(params)` | Returns several worksheets in one Blob. |

Pass `ExcelExportParams` to control the file name, the sheet name, styling,
freeze panes, row-group outlines, page setup, and protection.

Date cells export as 1900-system serials and display with the built-in
`mm-dd-yy` format unless the cell's style sets a `numberFormat`.

## Not included

Cell images (`addImageToCell`), Excel tables (`exportAsExcelTable`) and cell
notes are not included. The decisions are recorded in the
[gap list](https://github.com/libregrid/libregrid/blob/main/docs/parity/gap-list.md).

With `@libregrid/menu` also registered, the Export item (with CSV and Excel
entries) appears in the context menu. Exporting several sheets uses the data
strings from `getSheetDataForExcel`:

```ts
const sheets = [
  firstApi.getSheetDataForExcel({ sheetName: 'First' }),
  secondApi.getSheetDataForExcel({ sheetName: 'Second' }),
];
firstApi.exportMultipleSheetsAsExcel({ data: sheets, fileName: 'multi.xlsx' });
```

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
