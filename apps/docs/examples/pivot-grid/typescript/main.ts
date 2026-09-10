import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { PivotModule } from '@libregrid/pivot';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';
ModuleRegistry.registerModules([AllCommunityModule, PivotModule, ColumnsToolPanelModule]);
interface Sale {
  country: string;
  year: number;
  quarter: string;
  product: string;
  sales: number;
}
const rowData: Sale[] = [
  { country: 'US', year: 2025, quarter: 'Q1', product: 'Widget', sales: 120 },
  { country: 'US', year: 2025, quarter: 'Q2', product: 'Widget', sales: 180 },
  { country: 'France', year: 2025, quarter: 'Q1', product: 'Widget', sales: 90 },
  { country: 'France', year: 2026, quarter: 'Q1', product: 'Gadget', sales: 160 },
  { country: 'US', year: 2026, quarter: 'Q1', product: 'Gadget', sales: 210 },
];
let gridApi: GridApi | undefined;
const columnDefs: ColDef<Sale>[] = [
  { field: 'country', rowGroup: true, enableRowGroup: true },
  // Two row groups keep the grid's role as treegrid while pivoting —
  // a single row group leaves role=grid, where axe rejects the
  // aria-expanded attribute on group rows (community's role decision).
  { field: 'product', rowGroup: true, enableRowGroup: true },
  { field: 'year', pivot: true, enablePivot: true },
  { field: 'quarter', pivot: true, enablePivot: true },
  { field: 'sales', aggFunc: 'sum', enableValue: true, type: 'numericColumn' },
];
const gridOptions: GridOptions<Sale> = {
  pivotMode: true,
  groupDefaultExpanded: -1,
  pivotPanelShow: 'onlyWhenPivoting',
  pivotMaxGeneratedColumns: 100,
  sideBar: { toolPanels: ['columns'], defaultToolPanel: 'columns' },
  defaultColDef: { flex: 1, minWidth: 110 },
};
function ready(api: GridApi): void {
  gridApi = api;
}
function toggle(): void {
  if (gridApi) gridApi.setGridOption('pivotMode', !gridApi.getGridOption('pivotMode'));
}
function openColumns(): void {
  gridApi?.openToolPanel('columns');
}
function render(): void {}
document.querySelector('#action-0')!.addEventListener('click', () => {
  toggle();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  openColumns();
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
