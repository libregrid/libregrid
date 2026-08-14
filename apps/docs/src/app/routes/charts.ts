import { ChangeDetectionStrategy, Component, ViewChild, inject } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { ChartModel, ChartRef, ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface ChartRow { country: string; sales: number; profit: number; trend: number[]; }
const rows: ChartRow[] = [
  { country: 'United Kingdom', sales: 120, profit: 28, trend: [8, 12, 11, 18, 20, 28] },
  { country: 'United States', sales: 240, profit: 62, trend: [18, 24, 31, 28, 42, 62] },
  { country: 'Japan', sales: 300, profit: 81, trend: [22, 31, 45, 52, 64, 81] },
  { country: 'Germany', sales: 180, profit: 39, trend: [10, 14, 22, 30, 33, 39] },
];

@Component({
  selector: 'lgr-charts-demo', changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule],
  template: `
  <div class="lgr-page"><h1>Integrated Charts & Sparklines</h1>
    <p>Range charts use a replaceable provider backed by MIT-licensed AG Charts Community. Select a range, create a chart, and its linked data follows grid updates.</p>
    <mat-card appearance="outlined"><mat-card-content>
      <div class="lgr-actions">
        <button mat-stroked-button (click)="selectRange()">Select chart range</button>
        <button mat-flat-button (click)="createChart()">Create range chart</button>
        <button mat-stroked-button (click)="createCrossFilterChart()">Create cross-filter chart</button>
        <button mat-stroked-button (click)="editFirstRow()">Update data</button>
        <button mat-stroked-button (click)="unlink()">Unlink chart</button>
        <button mat-stroked-button (click)="openPanel()">Open chart configuration</button>
        <button mat-stroked-button (click)="save()">Save chart state</button>
        <button mat-stroked-button (click)="restore()">Restore chart</button>
        <span aria-live="polite" data-testid="phase-twelve-status">{{ status }}</span>
      </div>
      <div class="lgr-grid-host"><ag-grid-angular style="width:100%;height:300px" [theme]="theme.gridTheme()" [columnDefs]="columnDefs" [rowData]="rowData" [gridOptions]="gridOptions" (gridReady)="ready($event.api)" data-testid="phase-twelve-grid" /></div>
    </mat-card-content></mat-card>
    <h2>Chart container</h2><div #chartContainer data-testid="phase-twelve-chart-container" aria-label="Chart container"></div>
    <h2>In-cell sparklines</h2><p>Each trend cell owns a virtualised mini chart with axis and tooltip options.</p>
  </div>`,
})
export class ChartsDemo {
  protected readonly theme = inject(LibreGridThemeService); protected rowData = rows.map((row) => ({ ...row, trend: [...row.trend] }));
  @ViewChild('chartContainer') private chartContainer!: ElementRef<HTMLElement>;
  protected status = 'No chart yet'; private api: GridApi<ChartRow> | undefined; private ref: ChartRef | undefined; private saved: ChartModel | undefined;
  protected readonly columnDefs: ColDef<ChartRow>[] = [
    { field: 'country' }, { field: 'sales', editable: true, cellDataType: 'number' }, { field: 'profit', editable: true, cellDataType: 'number' },
    { field: 'trend', headerName: 'Trend', cellRenderer: 'agSparklineCellRenderer', cellRendererParams: { sparklineOptions: { type: 'area', tooltip: { enabled: true }, axis: { type: 'number' } } } },
  ];
  protected readonly gridOptions: GridOptions<ChartRow> = { enableCharts: true, cellSelection: true };
  protected ready(api: GridApi<ChartRow>): void { this.api = api; api.addEventListener('chartCreated', () => this.status = 'Chart created and linked'); }
  protected selectRange(): void { this.api?.addCellRange({ rowStartIndex: 0, rowEndIndex: 3, columns: ['country', 'sales', 'profit'] }); this.status = 'Range selected'; }
  protected createChart(): void { this.ref = this.api?.createRangeChart({ chartType: 'groupedColumn', cellRange: { rowStartIndex: 0, rowEndIndex: 3, columns: ['country', 'sales', 'profit'] }, chartContainer: this.chartContainer.nativeElement }); this.status = this.ref ? 'Chart created and linked' : 'Select a range first'; }
  protected createCrossFilterChart(): void { this.ref = this.api?.createCrossFilterChart({ chartType: 'line', cellRange: { columns: ['country', 'sales'] }, chartContainer: this.chartContainer.nativeElement }); this.status = this.ref ? 'Cross-filter chart created' : 'Could not create chart'; }
  protected editFirstRow(): void { const first = this.api?.getDisplayedRowAtIndex(0); if (first?.data) { this.api?.applyTransaction({ update: [{ ...first.data, sales: first.data.sales + 10 }] }); this.status = 'Linked chart updated'; } }
  protected unlink(): void { if (this.ref) { this.api?.updateChart({ type: 'rangeChartUpdate', chartId: this.ref.chartId, unlinkChart: true }); this.status = 'Chart unlinked'; } }
  protected openPanel(): void { if (this.ref) this.api?.openChartToolPanel({ chartId: this.ref.chartId, panel: 'settings' }); }
  protected save(): void { this.saved = this.api?.getChartModels()?.[0]; this.status = this.saved ? 'Chart state saved' : 'Create a chart first'; }
  protected restore(): void { if (this.saved) { this.ref?.destroyChart(); this.ref = this.api?.restoreChart(this.saved, this.chartContainer.nativeElement); this.status = 'Chart state restored'; } }
}
