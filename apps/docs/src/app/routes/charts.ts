import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { ChartModel, ChartRef, ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import { DocsCodeExampleComponent, DocsDemoGuideComponent, DocsFeaturePageShellComponent, DocsProductionChecklistComponent, type DocsCodeExample } from '../docs';

interface ChartRow { country: string; sales: number; profit: number; pipeline: number; }
const ROWS: ChartRow[] = [
  { country: 'United Kingdom', sales: 120, profit: 28, pipeline: 146 },
  { country: 'United States', sales: 240, profit: 62, pipeline: 318 },
  { country: 'Japan', sales: 300, profit: 81, pipeline: 384 },
  { country: 'Germany', sales: 180, profit: 39, pipeline: 211 },
  { country: 'Brazil', sales: 155, profit: 31, pipeline: 202 },
];

const CHART_EXAMPLES: readonly DocsCodeExample[] = [
  { id: 'create', label: 'Create a chart', language: 'TypeScript', filename: 'revenue-grid.component.ts', description: 'Create a linked range chart from the user’s selected grid values.', code: `const chart = api.createRangeChart({
  chartType: 'groupedColumn',
  cellRange: { columns: ['country', 'sales', 'profit'] },
  chartContainer: this.chartHost.nativeElement,
});
// Later grid transactions update a linked chart automatically.` },
  { id: 'persist', label: 'Persist a view', language: 'TypeScript', filename: 'saved-view.service.ts', description: 'Store chart models with the rest of a user’s workspace preference.', code: `const chartModels = api.getChartModels();
await preferences.save({
  columnState: api.getColumnState(),
  chartModels,
});

for (const model of savedView.chartModels) {
  api.restoreChart(model, chartHost);
}` },
];

@Component({
  selector: 'lgr-charts-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule, MatIconModule, DocsCodeExampleComponent, DocsDemoGuideComponent, DocsFeaturePageShellComponent, DocsProductionChecklistComponent],
  styles: `
    .workspace { display:grid; grid-template-columns:minmax(0, 1fr); gap:1rem; }
    .chart-panel { min-height:360px; padding:1rem; } .chart-heading { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
    .chart-heading h2 { margin:0; font-size:1.05rem; } .chart-container { min-height:300px; } .empty { display:grid; min-height:300px; place-items:center; text-align:center; color:var(--mat-sys-on-surface-variant); }
    .empty mat-icon { color:var(--mat-sys-primary); font-size:2rem; width:2rem; height:2rem; }
    .actions { display:flex; flex-wrap:wrap; gap:.65rem; margin-bottom:1rem; } .status { color:var(--mat-sys-on-surface-variant); font-size:.85rem; }
    @media (min-width:1020px) { .workspace { grid-template-columns:minmax(0, 1.1fr) minmax(25rem, .9fr); } }
  `,
  template: `
    <lgr-docs-feature-page-shell
      eyebrow="Decision-ready reporting"
      title="Turn the grid your team already trusts into a live decision view"
      summary="Integrated Charts keeps a visual tied to the operational rows that created it. Teams can compare revenue and profit, update a record, and see the linked chart respond."
      [packages]="['@libregrid/integrated-charts']"
      [values]="values"
    >
      <div featureDemo>
        <div class="actions"><button matButton="filled" (click)="createSalesChart()"><mat-icon>bar_chart</mat-icon> Create sales chart</button><button matButton="tonal" (click)="updateFirstMarket()"><mat-icon>edit</mat-icon> Add $10k to UK sales</button><button matButton="outlined" (click)="saveView()"><mat-icon>bookmark</mat-icon> Save chart state</button><button matButton="text" (click)="clearChart()">Clear chart</button></div>
        <p class="status" aria-live="polite">{{ status() }}</p>
        <div class="workspace">
          <mat-card appearance="outlined"><mat-card-content><div class="lgr-grid-host"><ag-grid-angular style="width:100%;height:100%" [theme]="theme.gridTheme()" [gridOptions]="gridOptions" (gridReady)="ready($event.api)" data-testid="phase-twelve-grid" /></div></mat-card-content></mat-card>
          <mat-card appearance="outlined" class="chart-panel"><div class="chart-heading"><h2>Sales and profit by market</h2>@if (chart()) { <span class="status">Linked to grid</span> }</div><div #chartContainer class="chart-container" data-testid="phase-twelve-chart-container">@if (!chart()) { <div class="empty"><div><mat-icon>insights</mat-icon><p>Create the chart to start the comparison.</p></div></div> }</div></mat-card>
        </div>
      </div>
      <lgr-docs-demo-guide featureGuide [steps]="demoSteps" intro="The demo starts focused: one meaningful chart, one data update, one persistence path." />
      <div featureImplementation><lgr-docs-code-example heading="Make charts part of a saved workspace" [examples]="chartExamples" /></div>
      <div featureProduction><lgr-docs-production-checklist [items]="checklist" /></div>
    </lgr-docs-feature-page-shell>
  `,
})
export class ChartsDemo {
  protected readonly theme = inject(LibreGridThemeService);
  @ViewChild('chartContainer') private chartContainer!: ElementRef<HTMLElement>;
  private api: GridApi<ChartRow> | undefined;
  private ref: ChartRef | undefined;
  private saved: ChartModel | undefined;
  protected readonly chart = signal<ChartRef | undefined>(undefined);
  protected readonly status = signal('Create a chart from the current market rows.');
  protected readonly values = [
    { icon: 'insights', title: 'Faster comparison', description: 'Move from a table of records to a visible revenue-versus-profit decision.' },
    { icon: 'link', title: 'One source of truth', description: 'A linked chart reflects transactions applied to the underlying grid.' },
    { icon: 'bookmark', title: 'Repeatable views', description: 'Save chart models alongside personal or team workspace preferences.' },
  ];
  protected readonly demoSteps = [
    { title: 'Create the core comparison', instruction: 'Create the sales chart from the five market rows.', expected: 'A grouped chart appears beside the grid and is linked to those rows.', icon: 'bar_chart' },
    { title: 'Change the source data', instruction: 'Add $10k to United Kingdom sales.', expected: 'The same chart changes without a separate reporting refresh.', icon: 'sync' },
    { title: 'Save the workspace', instruction: 'Save chart state after choosing the view a team needs.', expected: 'The example below shows exactly what to persist and restore.', icon: 'bookmark' },
  ];
  protected readonly checklist = [
    { title: 'Provide a table alternative', description: 'Keep the underlying grid accessible and allow users to export or inspect its data.', priority: 'required' as const },
    { title: 'Persist stable data contracts', description: 'Version saved chart preferences as columns and business metrics evolve.', priority: 'recommended' as const },
    { title: 'Avoid dashboard action walls', description: 'Lead with a focused default chart and reveal advanced configuration only when needed.', priority: 'recommended' as const },
  ];
  protected readonly chartExamples = CHART_EXAMPLES;
  protected readonly gridOptions: GridOptions<ChartRow> = {
    rowData: ROWS.map((row) => ({ ...row })), enableCharts: true, cellSelection: true, animateRows: false,
    columnDefs: [{ field: 'country', minWidth: 155 }, { field: 'sales', headerName: 'Sales ($k)', type: 'numericColumn', editable: true }, { field: 'profit', headerName: 'Profit ($k)', type: 'numericColumn', editable: true }, { field: 'pipeline', headerName: 'Pipeline ($k)', type: 'numericColumn' }] satisfies ColDef<ChartRow>[],
    defaultColDef: { flex: 1, minWidth: 110, sortable: true },
  };

  protected ready(api: GridApi<ChartRow>): void { this.api = api; }
  protected createSalesChart(): void {
    this.ref?.destroyChart();
    this.ref = this.api?.createRangeChart({ chartType: 'groupedColumn', cellRange: { rowStartIndex: 0, rowEndIndex: ROWS.length - 1, columns: ['country', 'sales', 'profit'] }, chartContainer: this.chartContainer.nativeElement });
    this.chart.set(this.ref); this.status.set(this.ref ? 'Sales and profit chart linked to the visible market rows.' : 'The grid is still loading. Try again in a moment.');
  }
  protected updateFirstMarket(): void { const first = this.api?.getDisplayedRowAtIndex(0); if (!first?.data) return; this.api?.applyTransaction({ update: [{ ...first.data, sales: first.data.sales + 10 }] }); this.status.set('United Kingdom sales updated; the linked chart refreshed.'); }
  protected saveView(): void { const models = this.api?.getChartModels(); this.saved = models?.[0]; this.status.set(this.saved ? 'Chart state captured. Persist this model with the user’s workspace.' : 'Create a chart before saving its state.'); }
  protected clearChart(): void { this.ref?.destroyChart(); this.ref = undefined; this.chart.set(undefined); this.status.set('Chart cleared; the grid data is unchanged.'); }
}
