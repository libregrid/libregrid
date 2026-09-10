import { type ColDef, type GridOptions, type GridApi } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ToolbarModule } from '@libregrid/toolbar';
import { FindModule } from '@libregrid/find';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { PivotModule } from '@libregrid/pivot';
ModuleRegistry.registerModules([
  AllCommunityModule,
  ToolbarModule,
  FindModule,
  ColumnsToolPanelModule,
  RowGroupingModule,
  PivotModule,
]);
interface Row {
  country: string;
  region: string;
  product: string;
  sales: number;
}
const rowData: Row[] = [
  {
    country: 'United States',
    region: 'North',
    product: 'Widget',
    sales: 100,
  },
  {
    country: 'France',
    region: 'South',
    product: 'Gadget',
    sales: 8019,
  },
  {
    country: 'Japan',
    region: 'East',
    product: 'Doohickey',
    sales: 5938,
  },
  {
    country: 'Brazil',
    region: 'West',
    product: 'Widget',
    sales: 3857,
  },
  {
    country: 'Germany',
    region: 'North',
    product: 'Gadget',
    sales: 1776,
  },
  {
    country: 'United States',
    region: 'South',
    product: 'Doohickey',
    sales: 9695,
  },
  {
    country: 'France',
    region: 'East',
    product: 'Widget',
    sales: 7614,
  },
  {
    country: 'Japan',
    region: 'West',
    product: 'Gadget',
    sales: 5533,
  },
];
let gridApi: GridApi | undefined;
const columnDefs: ColDef<Row>[] = [
  { field: 'country', enableRowGroup: true, minWidth: 150 },
  { field: 'region', enableRowGroup: true, enablePivot: true, minWidth: 110 },
  { field: 'product', enablePivot: true, minWidth: 130 },
  { field: 'sales', enableValue: true, type: 'numericColumn', minWidth: 110 },
];
const gridOptions: GridOptions<Row> = {
  defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1 },
  rowGroupPanelShow: 'always',
  pivotMode: false,
  sideBar: { toolPanels: ['columns'], defaultToolPanel: 'columns' },
  toolbar: {
    alignment: 'left',
    items: [
      'agQuickFilterToolbarItem',
      'agFindToolbarItem',
      'separator',
      'agRowGroupPanelToolbarItem',
      'agPivotPanelToolbarItem',
      'separator',
      {
        label: 'Export CSV',
        icon: 'csvExport',
        action: (params: { api: GridApi }) => params.api.exportDataAsCsv(),
      },
      {
        label: 'Toggle pivot',
        icon: 'pivotPanel',
        action: (params: { api: GridApi }) =>
          params.api.setGridOption('pivotMode', !params.api.getGridOption('pivotMode')),
      },
    ],
  },
} as never;
function onGridReady(readyApi: GridApi): void {
  gridApi = readyApi;
}
function resetQuickFilter(): void {
  gridApi?.setGridOption('quickFilterText', undefined);
}
function render(): void {}
document.querySelector('#action-0')!.addEventListener('click', () => {
  resetQuickFilter();
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
