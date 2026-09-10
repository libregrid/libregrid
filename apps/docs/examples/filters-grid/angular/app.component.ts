import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
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
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly rowData = ROWS;
  private api: GridApi | undefined;
  protected readonly columnDefs: ColDef<Row>[] = [
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
  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { flex: 1, filter: true, sortable: true },
    sideBar: { toolPanels: ['filters'], defaultToolPanel: 'filters' },
  };
  onGridReady(api: GridApi): void {
    this.api = api;
  }
  openFilters(): void {
    this.api?.openToolPanel('filters');
  }
}
