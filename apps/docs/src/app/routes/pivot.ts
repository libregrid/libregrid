import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface Sale { country: string; year: number; quarter: string; product: string; sales: number; }
const rowData: Sale[] = [
  { country: 'US', year: 2025, quarter: 'Q1', product: 'Widget', sales: 120 },
  { country: 'US', year: 2025, quarter: 'Q2', product: 'Widget', sales: 180 },
  { country: 'France', year: 2025, quarter: 'Q1', product: 'Widget', sales: 90 },
  { country: 'France', year: 2026, quarter: 'Q1', product: 'Gadget', sales: 160 },
  { country: 'US', year: 2026, quarter: 'Q1', product: 'Gadget', sales: 210 },
];

@Component({
  selector: 'lgr-pivot-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule],
  template: `
    <div class="lgr-page">
      <h1>Pivot</h1>
      <p>Country remains a row group while year and quarter become nested result-column headers. Sales is aggregated into each intersection.</p>
      <mat-card appearance="outlined"><mat-card-content>
        <ag-grid-angular style="width:100%;height:500px" [theme]="theme.gridTheme()" [columnDefs]="columnDefs" [rowData]="rowData" [gridOptions]="gridOptions" (gridReady)="ready($event.api)" data-testid="pivot-grid" />
      </mat-card-content></mat-card>
      <p><button mat-stroked-button (click)="toggle()">Toggle pivot mode</button> <button mat-stroked-button (click)="openColumns()">Open Columns panel</button></p>
      <h2>How it works</h2>
      <p><code>&#64;libregrid/pivot</code> provides <code>pivotStage</code>, which generates deterministic result columns before the aggregation stage. Use <code>getPivotResultColumn(['2025', 'Q1'], 'sales')</code> to retrieve a particular intersection.</p>
      <p>The Columns panel supports the Pivot Mode switch and Column Labels drop zone. Set <code>pivotMaxGeneratedColumns</code> to cap generated columns when pivot values have high cardinality.</p>
    </div>
  `,
})
export class PivotDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = rowData;
  private api: GridApi | undefined;
  protected readonly columnDefs: ColDef<Sale>[] = [
    { field: 'country', rowGroup: true, enableRowGroup: true },
    { field: 'year', pivot: true, enablePivot: true },
    { field: 'quarter', pivot: true, enablePivot: true },
    { field: 'product' },
    { field: 'sales', aggFunc: 'sum', enableValue: true },
  ];
  protected readonly gridOptions: GridOptions<Sale> = {
    pivotMode: true,
    groupDefaultExpanded: -1,
    pivotPanelShow: 'onlyWhenPivoting',
    pivotMaxGeneratedColumns: 100,
    sideBar: { toolPanels: ['columns'], defaultToolPanel: 'columns' },
    defaultColDef: { flex: 1, minWidth: 110 },
  };
  ready(api: GridApi): void { this.api = api; }
  toggle(): void { if (this.api) this.api.setGridOption('pivotMode', !this.api.getGridOption('pivotMode')); }
  openColumns(): void { this.api?.openToolPanel('columns'); }
}
