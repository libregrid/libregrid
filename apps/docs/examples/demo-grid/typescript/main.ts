import type { ColDef, GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
interface Row {
  country: string;
  region: string;
  product: string;
  sales: number;
  units: number;
}
const rowData: Row[] = [
  {
    country: 'United States',
    region: 'North',
    product: 'Widget',
    sales: 100,
    units: 1,
  },
  {
    country: 'France',
    region: 'South',
    product: 'Gadget',
    sales: 8019,
    units: 32,
  },
  {
    country: 'Japan',
    region: 'East',
    product: 'Doohickey',
    sales: 5938,
    units: 13,
  },
  {
    country: 'Brazil',
    region: 'West',
    product: 'Widget',
    sales: 3857,
    units: 44,
  },
  {
    country: 'Germany',
    region: 'North',
    product: 'Gadget',
    sales: 1776,
    units: 25,
  },
  {
    country: 'United States',
    region: 'South',
    product: 'Doohickey',
    sales: 9695,
    units: 6,
  },
  {
    country: 'France',
    region: 'East',
    product: 'Widget',
    sales: 7614,
    units: 37,
  },
  {
    country: 'Japan',
    region: 'West',
    product: 'Gadget',
    sales: 5533,
    units: 18,
  },
];
const columnDefs: ColDef<Row>[] = [
  { field: 'country', minWidth: 160 },
  { field: 'region', minWidth: 110 },
  { field: 'product', minWidth: 130 },
  { field: 'sales', type: 'numericColumn', minWidth: 110 },
  { field: 'units', type: 'numericColumn', minWidth: 100 },
];
const gridOptions: GridOptions<Row> = {
  defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1 },
  rowSelection: { mode: 'multiRow' },
};
function render(): void {}
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
  rowData: rowData,
});
render();
