import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { FiltersToolPanelModule } from '@libregrid/filters-tool-panel';
import { SetFilterModule } from '@libregrid/set-filter';
import { MultiFilterModule } from '@libregrid/multi-filter';
ModuleRegistry.registerModules([
  AllCommunityModule,
  FiltersToolPanelModule,
  SetFilterModule,
  MultiFilterModule,
]);
interface Row {
  country: string;
  region: string;
  product: string;
  status: string;
  sales: number;
}
const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Japan',
  'Brazil',
] as const;
const PRODUCTS = ['Widget', 'Gadget', 'Doohickey', 'Thingamabob'] as const;
const STATUSES = ['Draft', 'Pending', 'Approved'] as const;
const ROWS = [
  {
    country: 'United States',
    region: 'Americas',
    product: 'Widget',
    status: 'Draft',
    sales: 100,
  },
  {
    country: 'United Kingdom',
    region: 'Europe',
    product: 'Gadget',
    status: 'Pending',
    sales: 8019,
  },
  {
    country: 'Germany',
    region: 'Europe',
    product: 'Doohickey',
    status: 'Approved',
    sales: 5938,
  },
  {
    country: 'France',
    region: 'Europe',
    product: 'Thingamabob',
    status: 'Draft',
    sales: 3857,
  },
  {
    country: 'Japan',
    region: 'Asia',
    product: 'Widget',
    status: 'Pending',
    sales: 1776,
  },
  {
    country: 'Brazil',
    region: 'Americas',
    product: 'Gadget',
    status: 'Approved',
    sales: 9695,
  },
  {
    country: 'United States',
    region: 'Americas',
    product: 'Doohickey',
    status: 'Draft',
    sales: 7614,
  },
  {
    country: 'United Kingdom',
    region: 'Europe',
    product: 'Thingamabob',
    status: 'Pending',
    sales: 5533,
  },
];
const rowData = ROWS;
let gridApi: GridApi | undefined;
const columnDefs: ColDef<Row>[] = [
  {
    field: 'country',
    filter: 'agSelectableColumnFilter',
    filterParams: {
      filters: [
        { name: 'Simple Filter', filter: 'agTextColumnFilter' },
        {
          name: 'Selection Filter',
          filter: 'agSetColumnFilter',
          filterParams: { values: COUNTRIES, buttons: ['apply', 'clear', 'cancel'] },
        },
      ],
    },
  },
  {
    field: 'region',
    filter: 'agSelectableColumnFilter',
    filterParams: {
      filters: [
        { name: 'Simple Filter', filter: 'agTextColumnFilter' },
        {
          name: 'Selection Filter',
          filter: 'agSetColumnFilter',
          filterParams: { values: ['Europe', 'Americas', 'Asia'] },
        },
      ],
    },
  },
  {
    field: 'product',
    filter: 'agSelectableColumnFilter',
    filterParams: {
      filters: [
        { name: 'Simple Filter', filter: 'agTextColumnFilter' },
        {
          name: 'Selection Filter',
          filter: 'agSetColumnFilter',
          filterParams: { values: PRODUCTS },
        },
      ],
    },
  },
  {
    field: 'status',
    filter: 'agSelectableColumnFilter',
    filterParams: {
      filters: [
        { name: 'Simple Filter', filter: 'agTextColumnFilter' },
        {
          name: 'Selection Filter',
          filter: 'agSetColumnFilter',
          filterParams: { values: STATUSES },
        },
      ],
    },
  },
  {
    field: 'sales',
    filter: 'agNumberColumnFilter',
    type: 'numericColumn',
    suppressFiltersToolPanel: true,
  },
];
const gridOptions: GridOptions<Row> = {
  defaultColDef: { flex: 1, filter: true, sortable: true },
  sideBar: { toolPanels: ['filters'], defaultToolPanel: 'filters' },
};
function onGridReady(api: GridApi): void {
  gridApi = api;
}
function openFilters(): void {
  gridApi?.openToolPanel('filters');
}
function render(): void {}
document.querySelector('#action-0')!.addEventListener('click', () => {
  openFilters();
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
