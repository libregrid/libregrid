import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface Trade {
  country: string;
  product: string;
  amount: number;
  date: Date;
}

const trades: Trade[] = [
  { country: 'US', product: 'Widget', amount: 100, date: new Date('2024-01-15') },
  { country: 'US', product: 'Gadget', amount: 250.5, date: new Date('2024-02-20') },
  { country: 'DE', product: 'Widget', amount: -30, date: new Date('2024-03-05') },
  { country: 'DE', product: 'Gadget', amount: 75, date: new Date('2024-04-10') },
];

const scores = [
  { label: 'A', score: 1 },
  { label: 'B', score: 2 },
];

@Component({
  selector: 'lgr-excel-export-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule],
  template: ` <div class="lgr-page">
    <h1>Excel Export</h1>
    <p>
      Export the grid to an <code>.xlsx</code> workbook. Grouped rows keep their outline levels and
      collapse state. Right-click a cell to use the Export menu item.
    </p>
    <mat-card appearance="outlined"
      ><mat-card-content
        ><ag-grid-angular
          style="width:100%;height:320px"
          [theme]="theme.gridTheme()"
          [columnDefs]="columnDefs"
          [rowData]="trades"
          [gridOptions]="gridOptions"
          (gridReady)="ready($event.api)"
          data-testid="excel-grid" /></mat-card-content
    ></mat-card>
    <p>
      <button matButton="tonal" (click)="exportSingle()" data-testid="export-single">
        Export as .xlsx
      </button>
      <button matButton="tonal" (click)="exportMultiple()" data-testid="export-multiple">
        Export multiple sheets
      </button>
    </p>
    <p aria-live="polite">{{ status() }}</p>
    <h2>Second sheet</h2>
    <mat-card appearance="outlined"
      ><mat-card-content
        ><ag-grid-angular
          style="width:100%;height:220px"
          [theme]="theme.gridTheme()"
          [columnDefs]="scoreColumnDefs"
          [rowData]="scores"
          (gridReady)="readyScores($event.api)"
          data-testid="scores-grid" /></mat-card-content
    ></mat-card>
  </div>`,})
export class ExcelExportDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly trades = trades;
  protected readonly scores = scores;
  protected readonly status = signal('');
  protected readonly columnDefs: ColDef<Trade>[] = [
    { field: 'country', rowGroup: true },
    { field: 'product' },
    { field: 'amount', type: 'numericColumn', cellClass: 'money' },
    { field: 'date' },
  ];
  protected readonly scoreColumnDefs: ColDef<{ label: string; score: number }>[] = [
    { field: 'label' },
    { field: 'score' },
  ];
  protected readonly gridOptions: GridOptions<Trade> = {
    groupDefaultExpanded: -1,
    excelStyles: [{ id: 'money', numberFormat: { format: '"$"#,##0.00' } }],
  };
  private api: GridApi | undefined;
  private scoresApi: GridApi | undefined;

  ready(api: GridApi): void {
    this.api = api;
  }

  readyScores(api: GridApi): void {
    this.scoresApi = api;
  }

  exportSingle(): void {
    this.api?.exportDataAsExcel({ fileName: 'trades.xlsx', sheetName: 'Trades' });
    this.status.set('Downloaded trades.xlsx');
  }

  exportMultiple(): void {
    if (!this.api || !this.scoresApi) return;
    const sheets = [
      this.api.getSheetDataForExcel({ sheetName: 'Trades' }),
      this.scoresApi.getSheetDataForExcel({ sheetName: 'Scores' }),
    ];
    this.api.exportMultipleSheetsAsExcel({
      data: sheets.filter((sheet): sheet is string => sheet !== undefined),
      fileName: 'multi.xlsx',
    });
    this.status.set('Downloaded multi.xlsx');
  }
}
