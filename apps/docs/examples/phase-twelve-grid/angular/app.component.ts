import type { ElementRef } from '@angular/core';
import { Component, ViewChild, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ChartModel, ChartRef, ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface ChartRow {
  country: string;
  sales: number;
  profit: number;
  pipeline: number;
}
const ROWS: ChartRow[] = [
  { country: 'United Kingdom', sales: 120, profit: 28, pipeline: 146 },
  { country: 'United States', sales: 240, profit: 62, pipeline: 318 },
  { country: 'Japan', sales: 300, profit: 81, pipeline: 384 },
  { country: 'Germany', sales: 180, profit: 39, pipeline: 211 },
  { country: 'Brazil', sales: 155, profit: 31, pipeline: 202 },
];
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  @ViewChild('chartContainer') private chartContainer!: ElementRef<HTMLElement>;
  private api: GridApi<ChartRow> | undefined;
  private ref: ChartRef | undefined;
  private saved: ChartModel | undefined;
  protected readonly chart = signal<ChartRef | undefined>(undefined);
  protected readonly status = signal('Create a chart from the current market rows.');
  protected readonly gridOptions: GridOptions<ChartRow> = {
    rowData: ROWS.map((row) => ({ ...row })),
    enableCharts: true,
    cellSelection: true,
    animateRows: false,
    columnDefs: [
      { field: 'country', minWidth: 155 },
      { field: 'sales', headerName: 'Sales ($k)', type: 'numericColumn', editable: true },
      { field: 'profit', headerName: 'Profit ($k)', type: 'numericColumn', editable: true },
      { field: 'pipeline', headerName: 'Pipeline ($k)', type: 'numericColumn' },
    ] satisfies ColDef<ChartRow>[],
    defaultColDef: { flex: 1, minWidth: 110, sortable: true },
  };
  protected ready(api: GridApi<ChartRow>): void {
    this.api = api;
  }
  protected createSalesChart(): void {
    this.ref?.destroyChart();
    this.ref = this.api?.createRangeChart({
      chartType: 'groupedColumn',
      cellRange: {
        rowStartIndex: 0,
        rowEndIndex: ROWS.length - 1,
        columns: ['country', 'sales', 'profit'],
      },
      chartContainer: this.chartContainer.nativeElement,
    });
    this.chart.set(this.ref);
    this.status.set(
      this.ref
        ? 'Sales and profit chart linked to the visible market rows.'
        : 'The grid is still loading. Try again in a moment.',
    );
  }
  protected updateFirstMarket(): void {
    const first = this.api?.getDisplayedRowAtIndex(0);
    if (!first?.data) return;
    this.api?.applyTransaction({ update: [{ ...first.data, sales: first.data.sales + 10 }] });
    this.status.set('United Kingdom sales updated; the linked chart refreshed.');
  }
  protected saveView(): void {
    const models = this.api?.getChartModels();
    this.saved = models?.[0];
    this.status.set(
      this.saved
        ? 'Chart state captured. Persist this model with the user’s workspace.'
        : 'Create a chart before saving its state.',
    );
  }
  protected clearChart(): void {
    this.ref?.destroyChart();
    this.ref = undefined;
    this.chart.set(undefined);
    this.status.set('Chart cleared; the grid data is unchanged.');
  }
}
