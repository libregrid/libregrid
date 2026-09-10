import { type ColDef, type GridOptions, type GridApi } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { RowNumbersModule } from '@libregrid/row-numbers';
import { CellSelectionModule } from '@libregrid/cell-selection';
ModuleRegistry.registerModules([AllCommunityModule, RowNumbersModule, CellSelectionModule]);
interface Row {
  name: string;
  region: string;
  sales: number;
}
const rowData: Row[] = [
  {
    name: 'Alice',
    region: 'North',
    sales: 100,
  },
  {
    name: 'Bruno',
    region: 'South',
    sales: 8019,
  },
  {
    name: 'Carmen',
    region: 'East',
    sales: 5938,
  },
  {
    name: 'Dmitri',
    region: 'West',
    sales: 3857,
  },
  {
    name: 'Elena',
    region: 'North',
    sales: 1776,
  },
  {
    name: 'Farid',
    region: 'South',
    sales: 9695,
  },
  {
    name: 'Grace',
    region: 'East',
    sales: 7614,
  },
  {
    name: 'Hiro',
    region: 'West',
    sales: 5533,
  },
];
let rowNumbers = true;
let enableRowResizer = true;
let cellSelection = true;
let gridApi: GridApi | undefined;
const columnDefs: ColDef<Row>[] = [
  { field: 'name', minWidth: 140 },
  { field: 'region', minWidth: 110 },
  { field: 'sales', type: 'numericColumn', minWidth: 110 },
];
const gridOptions: GridOptions<Row> = {
  rowNumbers: { enableRowResizer: true },
  cellSelection: true,
} as never;
function onGridReady(readyApi: GridApi): void {
  gridApi = readyApi;
}
function toggleRowNumbers(): void {
  rowNumbers = ((on) => !on)(rowNumbers);
  render();
  gridApi?.setGridOption('rowNumbers', rowNumbers ? { enableRowResizer: enableRowResizer } : false);
}
function toggleRowResizer(): void {
  enableRowResizer = ((on) => !on)(enableRowResizer);
  render();
  gridApi?.setGridOption('rowNumbers', {
    enableRowResizer: enableRowResizer,
  });
}
function toggleCellSelection(): void {
  cellSelection = ((on) => !on)(cellSelection);
  render();
  gridApi?.setGridOption('cellSelection', cellSelection);
}
function render(): void {
  document.querySelector('#action-0')!.textContent =
    `${rowNumbers ? 'rowNumbers: on' : 'rowNumbers: off'}`;
  document.querySelector('#action-1')!.textContent =
    `${enableRowResizer ? 'Row resizer: on' : 'Row resizer: off'}`;
  document.querySelector('#action-2')!.textContent =
    `${cellSelection ? 'Cell selection: on' : 'Cell selection: off'}`;
  document.querySelector('#status-rowNumbers')!.textContent =
    rowNumbers == null ? '' : String(rowNumbers);
  document.querySelector('#status-enableRowResizer')!.textContent =
    enableRowResizer == null ? '' : String(enableRowResizer);
  document.querySelector('#status-cellSelection')!.textContent =
    cellSelection == null ? '' : String(cellSelection);
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  toggleRowNumbers();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  toggleRowResizer();
  render();
});
document.querySelector('#action-2')!.addEventListener('click', () => {
  toggleCellSelection();
  render();
});
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
  rowData: rowData,
  onGridReady: (event) => {
    onGridReady(event.api);
    render();
  },
});
render();
