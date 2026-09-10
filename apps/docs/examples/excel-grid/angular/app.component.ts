import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
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
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly scores = [
    { label: 'A', score: 1 },
    { label: 'B', score: 2 },
  ];
  readonly scoreColumnDefs: ColDef[] = [{ field: 'label' }, { field: 'score' }];
  readyScores(api: GridApi): void {
    this.scoresApi = api;
  }
  readonly theme = themeQuartz;
  protected readonly trades = trades;
  protected readonly status = signal('');
  protected readonly columnDefs: ColDef<Trade>[] = [
    { field: 'country', rowGroup: true },
    { field: 'product' },
    { field: 'amount', type: 'numericColumn', cellClass: 'money' },
    { field: 'date' },
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
