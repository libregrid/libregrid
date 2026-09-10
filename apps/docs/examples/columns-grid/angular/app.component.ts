import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Row {
  country: string;
  region: string;
  product: string;
  sales: number;
  units: number;
  internalId: number;
}

@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly rowData = [
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
  private api: GridApi | undefined;
  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', enableRowGroup: true, minWidth: 160 },
    { field: 'region', enableRowGroup: true, enablePivot: true, minWidth: 110 },
    { field: 'product', minWidth: 130 },
    { field: 'sales', enableValue: true, type: 'numericColumn', minWidth: 110 },
    { field: 'units', enableValue: true, type: 'numericColumn', minWidth: 100 },
    { field: 'internalId', hide: true, suppressColumnsToolPanel: true },
  ];
  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { flex: 1, filter: true, resizable: true, sortable: true },
    sideBar: { toolPanels: ['columns'], defaultToolPanel: 'columns' },
    rowGroupPanelShow: 'onlyWhenGrouping',
  };
  onGridReady(api: GridApi): void {
    this.api = api;
  }
  openColumns(): void {
    this.api?.openToolPanel('columns');
  }
  openChooser(): void {
    this.api?.showColumnChooser();
  }
  closeChooser(): void {
    this.api?.hideColumnChooser();
  }
}
