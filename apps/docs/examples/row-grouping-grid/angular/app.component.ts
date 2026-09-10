import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Row {
  country: string;
  city: string;
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
  protected readonly rowData = [
    {
      country: 'United States',
      city: 'New York',
      product: 'Widget',
      sales: 100,
    },
    {
      country: 'France',
      city: 'Lyon',
      product: 'Gadget',
      sales: 8019,
    },
    {
      country: 'Japan',
      city: 'Kyoto',
      product: 'Doohickey',
      sales: 5938,
    },
    {
      country: 'Brazil',
      city: 'São Paulo',
      product: 'Widget',
      sales: 3857,
    },
    {
      country: 'Germany',
      city: 'Munich',
      product: 'Gadget',
      sales: 1776,
    },
    {
      country: 'United States',
      city: 'Chicago',
      product: 'Doohickey',
      sales: 9695,
    },
    {
      country: 'France',
      city: 'Paris',
      product: 'Widget',
      sales: 7614,
    },
    {
      country: 'Japan',
      city: 'Osaka',
      product: 'Gadget',
      sales: 5533,
    },
  ];
  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', rowGroup: true },
    { field: 'city', rowGroup: true },
    { field: 'product', minWidth: 140 },
    { field: 'sales', aggFunc: 'sum', sort: 'desc', type: 'numericColumn', minWidth: 120 },
    {
      field: 'sales',
      colId: 'salesShare',
      headerName: '% of Total',
      showValuesAs: 'percentOfGrandTotal',
      type: 'numericColumn',
      minWidth: 120,
      valueFormatter: (params) =>
        params.value == null ? '' : `${(Number(params.value) * 100).toFixed(1)}%`,
    },
  ];
  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { flex: 1, minWidth: 120 },
    groupDefaultExpanded: 1,
    autoGroupColumnDef: { headerName: 'Location', minWidth: 240 },
    groupTotalRow: 'bottom',
    grandTotalRow: 'bottom',
    suppressAggFuncInHeader: true,
  };
}
