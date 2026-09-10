# @libregrid/excel-export

Export grid data as Excel `.xlsx` workbooks in the browser. Configure styles,
worksheet names, grouped-row outlines, and multiple sheets without an export
server.

[Documentation and examples](https://libregrid.dev/excel-export)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/excel-export
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.

## Usage

In a browser TypeScript project, add a grid container before running the code:

```html
<button id="export">Export to Excel</button>
<div id="grid" style="height: 400px"></div>
```

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { ExcelExportModule } from '@libregrid/excel-export';

ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);

const api = createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [{ field: 'name' }, { field: 'value' }],
  rowData: [{ name: 'Widget', value: 42 }],
});

document.querySelector('#export')!.addEventListener('click', () => {
  api.exportDataAsExcel({ fileName: 'sales.xlsx', sheetName: 'Sales' });
});
```

## API

| Method                                | Purpose                                                 |
| ------------------------------------- | ------------------------------------------------------- |
| `exportDataAsExcel(params?)`          | Downloads the grid data as an `.xlsx` file.             |
| `getDataAsExcel(params?)`             | Returns the `.xlsx` bytes as a Blob.                    |
| `getSheetDataForExcel(params?)`       | Returns the data for one worksheet as an opaque string. |
| `exportMultipleSheetsAsExcel(params)` | Downloads several worksheets in one file.               |
| `getMultipleSheetsAsExcel(params)`    | Returns several worksheets in one Blob.                 |

Pass `ExcelExportParams` to control the file name, the sheet name, styling,
freeze panes, row-group outlines, page setup, and protection.

Date cells export as 1900-system serials and display with the built-in
`mm-dd-yy` format unless the cell's style sets a `numberFormat`.

## Multiple worksheets

With `@libregrid/menu` also registered, the Export item (with CSV and Excel
entries) appears in the context menu. Exporting several sheets uses the data
strings from `getSheetDataForExcel`. Register `ExcelExportModule` for both
grids and call this helper from an export button:

```ts
import type { GridApi } from 'ag-grid-community';

export function exportTwoGrids(firstApi: GridApi, secondApi: GridApi): void {
  const sheets = [
    firstApi.getSheetDataForExcel({ sheetName: 'First' }),
    secondApi.getSheetDataForExcel({ sheetName: 'Second' }),
  ].filter((sheet): sheet is string => sheet !== undefined);
  firstApi.exportMultipleSheetsAsExcel({ data: sheets, fileName: 'multi.xlsx' });
}
```

## Limitations

Cell images (`addImageToCell`), Excel tables (`exportAsExcelTable`), and cell
notes are not included. See the [gap list](https://github.com/libregrid/libregrid/blob/main/docs/parity/gap-list.md).

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
