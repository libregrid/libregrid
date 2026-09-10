import { type ColDef, type ColGroupDef, type GridOptions, type GridApi } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ColumnHeaderEditModule } from '@libregrid/column-header-edit';
import { ColumnMenuModule } from '@libregrid/menu';
ModuleRegistry.registerModules([AllCommunityModule, ColumnHeaderEditModule, ColumnMenuModule]);
interface Row {
  name: string;
  country: string;
  sales: number;
}
const rowData: Row[] = [
  {
    name: 'Alice',
    country: 'United States',
    sales: 100,
  },
  {
    name: 'Bruno',
    country: 'France',
    sales: 8019,
  },
  {
    name: 'Carmen',
    country: 'Japan',
    sales: 5938,
  },
  {
    name: 'Dmitri',
    country: 'Brazil',
    sales: 3857,
  },
  {
    name: 'Elena',
    country: 'Germany',
    sales: 1776,
  },
  {
    name: 'Farid',
    country: 'United States',
    sales: 9695,
  },
  {
    name: 'Grace',
    country: 'France',
    sales: 7614,
  },
  {
    name: 'Hiro',
    country: 'Japan',
    sales: 5533,
  },
];
let deferred = false;
let gridApi: GridApi | undefined;
const columnDefs: (ColDef<Row> | ColGroupDef<Row>)[] = [
  { field: 'name', headerNameEditable: true, minWidth: 140 },
  {
    groupId: 'where',
    headerName: 'Where & How Much',
    headerNameEditable: true,
    children: [
      { field: 'country', minWidth: 140 },
      { field: 'sales', type: 'numericColumn', minWidth: 110 },
    ],
  },
  {
    // Not editable: no headerNameEditable — the menu item stays hidden.
    colId: 'notes',
    headerName: 'Notes',
    minWidth: 140,
    valueGetter: () => '—',
  },
];
const gridOptions: GridOptions<Row> = {
  columnHeaderEdit: { applyMode: 'live' },
} as never;
function onGridReady(readyApi: GridApi): void {
  gridApi = readyApi;
}
function toggleApplyMode(): void {
  deferred = ((on) => !on)(deferred);
  render();
  gridApi?.setGridOption('columnHeaderEdit', { applyMode: deferred ? 'deferred' : 'live' });
}
function resetColumnState(): void {
  gridApi?.resetColumnState();
}
function render(): void {
  document.querySelector('#action-0')!.textContent =
    `${deferred ? "applyMode: 'deferred'" : "applyMode: 'live'"}`;
  document.querySelector('#status-deferred')!.textContent =
    deferred == null ? '' : String(deferred);
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  toggleApplyMode();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  resetColumnState();
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
