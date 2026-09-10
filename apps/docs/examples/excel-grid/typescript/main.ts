import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ExcelExportModule } from '@libregrid/excel-export';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { ContextMenuModule } from '@libregrid/menu';
ModuleRegistry.registerModules([
  AllCommunityModule,
  ExcelExportModule,
  RowGroupingModule,
  ContextMenuModule,
]);
interface Trade {
  country: string;
  product: string;
  amount: number;
  date: Date;
}
const trades: Trade[] = [
  { country: 'US', product: 'Widget', amount: 100, date: new Date('2024-01-15') },
  { country: 'US', product: 'Gadget', amount: 250.5, date: new Date('2024-02-20') },
  { country: 'DE', product: 'Widget', amount: -30, date: new Date('2024-03-05') },
  { country: 'DE', product: 'Gadget', amount: 75, date: new Date('2024-04-10') },
];
let status = '';
const columnDefs: ColDef<Trade>[] = [
  { field: 'country', rowGroup: true },
  { field: 'product' },
  { field: 'amount', type: 'numericColumn', cellClass: 'money' },
  { field: 'date' },
];
const gridOptions: GridOptions<Trade> = {
  groupDefaultExpanded: -1,
  excelStyles: [{ id: 'money', numberFormat: { format: '"$"#,##0.00' } }],
};
let gridApi: GridApi | undefined;
function ready(api: GridApi): void {
  gridApi = api;
}
function exportSingle(): void {
  gridApi?.exportDataAsExcel({ fileName: 'trades.xlsx', sheetName: 'Trades' });
  status = 'Downloaded trades.xlsx';
  render();
}
function exportMultiple(): void {
  if (!gridApi || !scoresApi) return;
  const sheets = [
    gridApi.getSheetDataForExcel({ sheetName: 'Trades' }),
    scoresApi.getSheetDataForExcel({ sheetName: 'Scores' }),
  ];
  gridApi.exportMultipleSheetsAsExcel({
    data: sheets.filter((sheet): sheet is string => sheet !== undefined),
    fileName: 'multi.xlsx',
  });
  status = 'Downloaded multi.xlsx';
  render();
}
function render(): void {
  document.querySelector('#status-status')!.textContent = status == null ? '' : String(status);
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  exportSingle();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  exportMultiple();
  render();
});
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
  rowData: trades,
  onGridReady: (event) => {
    ready(event.api);
    render();
  },
});
render();
const scoresApi = createGrid(document.querySelector<HTMLElement>('#scores')!, {
  rowData: [
    { label: 'A', score: 1 },
    { label: 'B', score: 2 },
  ],
  columnDefs: [{ field: 'label' }, { field: 'score' }],
});
