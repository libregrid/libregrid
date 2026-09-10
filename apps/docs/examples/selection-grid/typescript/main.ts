import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { ClipboardModule } from '@libregrid/clipboard';
import { StatusBarModule } from '@libregrid/status-bar';
ModuleRegistry.registerModules([
  AllCommunityModule,
  CellSelectionModule,
  ClipboardModule,
  StatusBarModule,
]);
interface Row {
  name: string;
  first: number;
  second: number;
}
const rows: Row[] = [
  { name: 'Alpha', first: 1, second: 2 },
  { name: 'Beta', first: 3, second: 4 },
  { name: 'Gamma', first: 5, second: 6 },
  { name: 'Delta', first: 0, second: 0 },
  { name: 'Epsilon', first: 0, second: 0 },
  { name: 'Zeta', first: 0, second: 0 },
];
const rowData = rows;
let copied = 'Nothing copied';
let gridApi: GridApi | undefined;
const columnDefs: ColDef<Row>[] = [
  { field: 'name' },
  { field: 'first', type: 'numericColumn' },
  { field: 'second', type: 'numericColumn' },
];
const gridOptions: GridOptions<Row> = {
  defaultColDef: { flex: 1, editable: true },
  cellSelection: { handle: { mode: 'fill' } },
  statusBar: {
    statusPanels: [
      { statusPanel: 'agAggregationComponent', key: 'aggregation' },
      { statusPanel: 'agTotalRowCountComponent', key: 'total' },
    ],
  },
} as never;
function ready(api: GridApi): void {
  gridApi = api;
}
function copy(): void {
  gridApi?.copySelectedRangeToClipboard({ includeHeaders: true });
  copied = 'Copied selected range — paste it into a spreadsheet or text editor';
  render();
}
function clear(): void {
  gridApi?.clearCellSelection();
}
function render(): void {
  document.querySelector('#status-copied')!.textContent = copied == null ? '' : String(copied);
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  copy();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  clear();
  render();
});
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
  rowData: rowData,
  onGridReady: (event) => {
    ready(event.api);
    render();
  },
});
render();
