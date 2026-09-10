import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { type ColDef, type GridOptions, type GridApi } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Row {
  country: string;
  region: string;
  product: string;
  sales: number;
}

@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly rowData = signal<Row[]>([
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
  ]);
  private api: GridApi | undefined;
  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', enableRowGroup: true, minWidth: 150 },
    { field: 'region', enableRowGroup: true, enablePivot: true, minWidth: 110 },
    { field: 'product', enablePivot: true, minWidth: 130 },
    { field: 'sales', enableValue: true, type: 'numericColumn', minWidth: 110 },
  ];
  protected readonly gridOptions: GridOptions<Row> = {
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
  onGridReady(gridApi: GridApi): void {
    this.api = gridApi;
  }
  resetQuickFilter(): void {
    this.api?.setGridOption('quickFilterText', undefined);
  }
}
