import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
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
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly rowData = rowData;
  private api: GridApi | undefined;
  protected readonly columnDefs: ColDef<Sale>[] = [
    { field: 'country', rowGroup: true, enableRowGroup: true },
    // Two row groups keep the grid's role as treegrid while pivoting —
    // a single row group leaves role=grid, where axe rejects the
    // aria-expanded attribute on group rows (community's role decision).
    { field: 'product', rowGroup: true, enableRowGroup: true },
    { field: 'year', pivot: true, enablePivot: true },
    { field: 'quarter', pivot: true, enablePivot: true },
    { field: 'sales', aggFunc: 'sum', enableValue: true, type: 'numericColumn' },
  ];
  protected readonly gridOptions: GridOptions<Sale> = {
    pivotMode: true,
    groupDefaultExpanded: -1,
    pivotPanelShow: 'onlyWhenPivoting',
    pivotMaxGeneratedColumns: 100,
    sideBar: { toolPanels: ['columns'], defaultToolPanel: 'columns' },
    defaultColDef: { flex: 1, minWidth: 110 },
  };
  ready(api: GridApi): void {
    this.api = api;
  }
  toggle(): void {
    if (this.api) this.api.setGridOption('pivotMode', !this.api.getGridOption('pivotMode'));
  }
  openColumns(): void {
    this.api?.openToolPanel('columns');
  }
}
