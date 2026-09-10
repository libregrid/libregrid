import { type ColDef, type GridOptions, type GridApi, type SideBarDef } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { SideBarModule } from '@libregrid/side-bar';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';
import { FiltersToolPanelModule } from '@libregrid/filters-tool-panel';
import { SetFilterModule } from '@libregrid/set-filter';
import { MultiFilterModule } from '@libregrid/multi-filter';
ModuleRegistry.registerModules([
  AllCommunityModule,
  SideBarModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  SetFilterModule,
  MultiFilterModule,
]);
interface Row {
  country: string;
  region: string;
  product: string;
  sales: number;
  units: number;
  category: string;
  discount: number;
  stock: number;
}
const rowData: Row[] = [
  {
    country: 'United States',
    region: 'North',
    product: 'Widget',
    sales: 100,
    units: 1,
    category: 'Gadget',
    discount: 0,
    stock: 10,
  },
  {
    country: 'France',
    region: 'South',
    product: 'Gadget',
    sales: 8019,
    units: 32,
    category: 'Doohickey',
    discount: 7,
    stock: 63,
  },
  {
    country: 'Japan',
    region: 'East',
    product: 'Doohickey',
    sales: 5938,
    units: 13,
    category: 'Widget',
    discount: 14,
    stock: 116,
  },
  {
    country: 'Brazil',
    region: 'West',
    product: 'Widget',
    sales: 3857,
    units: 44,
    category: 'Gadget',
    discount: 21,
    stock: 169,
  },
  {
    country: 'Germany',
    region: 'North',
    product: 'Gadget',
    sales: 1776,
    units: 25,
    category: 'Doohickey',
    discount: 28,
    stock: 22,
  },
  {
    country: 'United States',
    region: 'South',
    product: 'Doohickey',
    sales: 9695,
    units: 6,
    category: 'Widget',
    discount: 5,
    stock: 75,
  },
  {
    country: 'France',
    region: 'East',
    product: 'Widget',
    sales: 7614,
    units: 37,
    category: 'Gadget',
    discount: 12,
    stock: 128,
  },
  {
    country: 'Japan',
    region: 'West',
    product: 'Gadget',
    sales: 5533,
    units: 18,
    category: 'Doohickey',
    discount: 19,
    stock: 181,
  },
];
let isVisible = false;
let openPanelId: string | null = null;
let buttonsHidden = false;
let gridApi: GridApi | null = null;
const sideBarDef: SideBarDef = {
  toolPanels: ['columns', 'filters'],
  defaultToolPanel: 'columns',
};
const columnDefs: ColDef<Row>[] = [
  { field: 'country', enableRowGroup: true, minWidth: 160 },
  { field: 'region', enableRowGroup: true, enablePivot: true, minWidth: 110 },
  { field: 'product', enableRowGroup: true, minWidth: 130 },
  { field: 'sales', enableValue: true, type: 'numericColumn', minWidth: 110 },
  { field: 'units', enableValue: true, type: 'numericColumn', minWidth: 100 },
  { field: 'category', enablePivot: true, minWidth: 150 },
  { field: 'discount', enableValue: true, type: 'numericColumn', minWidth: 130 },
  { field: 'stock', type: 'numericColumn', minWidth: 130 },
];
const gridOptions: GridOptions<Row> = {
  defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1 },
  sideBar: sideBarDef,
};
function onGridReady(readyApi: GridApi): void {
  gridApi = readyApi;
  isVisible = readyApi.isSideBarVisible();
  render();
  openPanelId = readyApi.getOpenedToolPanel();
  render();
}
function toggleSideBar(): void {
  const current = gridApi?.isSideBarVisible() ?? false;
  gridApi?.setSideBarVisible(!current);
  isVisible = !current;
  render();
}
function openPanel(id: string): void {
  gridApi?.openToolPanel(id);
  openPanelId = id;
  render();
}
function closePanel(): void {
  gridApi?.closeToolPanel();
  openPanelId = null;
  render();
}
function setPosition(position: 'left' | 'right'): void {
  gridApi?.setSideBarPosition(position);
}
function setButtonsHidden(hidden: boolean): void {
  buttonsHidden = hidden;
  render();
  gridApi?.setGridOption('sideBar', {
    ...sideBarDef,
    hideButtons: hidden,
  });
}
function render(): void {
  document.querySelector('#status-isVisible')!.textContent =
    isVisible == null ? '' : String(isVisible);
  document.querySelector('#status-openPanelId')!.textContent =
    openPanelId == null ? '' : String(openPanelId);
  document.querySelector('#status-buttonsHidden')!.textContent =
    buttonsHidden == null ? '' : String(buttonsHidden);
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  toggleSideBar();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  openPanel('columns');
  render();
});
document.querySelector('#action-2')!.addEventListener('click', () => {
  openPanel('filters');
  render();
});
document.querySelector('#action-3')!.addEventListener('click', () => {
  closePanel();
  render();
});
document.querySelector('#action-4')!.addEventListener('click', () => {
  setPosition('left');
  render();
});
document.querySelector('#action-5')!.addEventListener('click', () => {
  setPosition('right');
  render();
});
document.querySelector('#action-6')!.addEventListener('click', () => {
  setButtonsHidden(true);
  render();
});
document.querySelector('#action-7')!.addEventListener('click', () => {
  setButtonsHidden(false);
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
