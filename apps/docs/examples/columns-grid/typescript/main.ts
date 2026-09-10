import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { PivotModule } from '@libregrid/pivot';
ModuleRegistry.registerModules([
  AllCommunityModule,
  ColumnsToolPanelModule,
  RowGroupingModule,
  PivotModule,
]);
interface Row {
  country: string;
  region: string;
  product: string;
  sales: number;
  units: number;
  internalId: number;
}
const rowData = [
  {
    country: 'United States',
    region: 'North',
    product: 'Widget',
    sales: 100,
    units: 1,
    internalId: 0,
  },
  {
    country: 'France',
    region: 'South',
    product: 'Gadget',
    sales: 8019,
    units: 32,
    internalId: 1,
  },
  {
    country: 'Japan',
    region: 'East',
    product: 'Doohickey',
    sales: 5938,
    units: 13,
    internalId: 2,
  },
  {
    country: 'Brazil',
    region: 'West',
    product: 'Widget',
    sales: 3857,
    units: 44,
    internalId: 3,
  },
  {
    country: 'Germany',
    region: 'North',
    product: 'Gadget',
    sales: 1776,
    units: 25,
    internalId: 4,
  },
  {
    country: 'United States',
    region: 'South',
    product: 'Doohickey',
    sales: 9695,
    units: 6,
    internalId: 5,
  },
  {
    country: 'France',
    region: 'East',
    product: 'Widget',
    sales: 7614,
    units: 37,
    internalId: 6,
  },
  {
    country: 'Japan',
    region: 'West',
    product: 'Gadget',
    sales: 5533,
    units: 18,
    internalId: 7,
  },
];
let gridApi: GridApi | undefined;
const columnDefs: ColDef<Row>[] = [
  { field: 'country', enableRowGroup: true, minWidth: 160 },
  { field: 'region', enableRowGroup: true, enablePivot: true, minWidth: 110 },
  { field: 'product', minWidth: 130 },
  { field: 'sales', enableValue: true, type: 'numericColumn', minWidth: 110 },
  { field: 'units', enableValue: true, type: 'numericColumn', minWidth: 100 },
  { field: 'internalId', hide: true, suppressColumnsToolPanel: true },
];
const gridOptions: GridOptions<Row> = {
  defaultColDef: { flex: 1, filter: true, resizable: true, sortable: true },
  sideBar: { toolPanels: ['columns'], defaultToolPanel: 'columns' },
  rowGroupPanelShow: 'onlyWhenGrouping',
};
function onGridReady(api: GridApi): void {
  gridApi = api;
}
function openColumns(): void {
  gridApi?.openToolPanel('columns');
}
function openChooser(): void {
  gridApi?.showColumnChooser();
}
function closeChooser(): void {
  gridApi?.hideColumnChooser();
}
function render(): void {}
document.querySelector('#action-0')!.addEventListener('click', () => {
  openColumns();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  openChooser();
  render();
});
document.querySelector('#action-2')!.addEventListener('click', () => {
  closeChooser();
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
