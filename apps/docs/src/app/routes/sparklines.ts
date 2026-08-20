import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface AccountHealth {
  account: string;
  owner: string;
  monthlyUsage: number[];
  retention: number[];
  trend: 'Growing' | 'Watch';
}

const ROWS: AccountHealth[] = [
  { account: 'Northstar Health', owner: 'Avery', monthlyUsage: [24, 29, 31, 38, 44, 57], retention: [82, 84, 83, 88, 90, 93], trend: 'Growing' },
  { account: 'Meridian Retail', owner: 'Jo', monthlyUsage: [52, 49, 47, 45, 41, 38], retention: [91, 90, 88, 84, 80, 76], trend: 'Watch' },
  { account: 'Fieldstone Labs', owner: 'Mina', monthlyUsage: [12, 18, 21, 28, 35, 41], retention: [69, 74, 78, 82, 85, 88], trend: 'Growing' },
  { account: 'Crown & Finch', owner: 'Daniel', monthlyUsage: [34, 37, 35, 40, 44, 46], retention: [88, 87, 89, 90, 91, 91], trend: 'Growing' },
];

@Component({
  selector: 'lgr-sparklines-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule],
  template: `
    <div class="lgr-page"><p class="lgr-eyebrow">At-a-glance patterns</p><h1>Sparklines</h1><p>Give account teams the shape of a trend without forcing them into a separate report. The mini charts below virtualize with grid rows, so they remain useful in large operational views.</p>
      <ul class="lgr-inline-status" aria-label="Sparkline guidance"><li>Browser-only rendering</li><li>Use raw series from your API</li><li>Accessible values remain in cells</li></ul>
      <mat-card appearance="outlined"><mat-card-content><div class="lgr-grid-host"><ag-grid-angular style="height:100%;width:100%" [theme]="theme.gridTheme()" [gridOptions]="gridOptions" /></div></mat-card-content></mat-card>
      <h2>Backend boundary</h2><p>Send compact, ordered numeric arrays alongside each row—such as monthly usage or retention. The grid owns presentation; your service remains the source of truth for the series and its aggregation window.</p>
    </div>
  `,
})
export class SparklinesDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly gridOptions: GridOptions<AccountHealth> = {
    rowData: ROWS,
    columnDefs: [
      { field: 'account', minWidth: 180 },
      { field: 'owner', width: 120 },
      { field: 'monthlyUsage', headerName: 'Monthly usage', minWidth: 190, cellRenderer: 'agSparklineCellRenderer', cellRendererParams: { sparklineOptions: { type: 'area', tooltip: { enabled: true } } } },
      { field: 'retention', headerName: 'Retention', minWidth: 190, cellRenderer: 'agSparklineCellRenderer', cellRendererParams: { sparklineOptions: { type: 'line', tooltip: { enabled: true } } } },
      { field: 'trend', width: 120 },
    ] satisfies ColDef<AccountHealth>[],
    animateRows: false,
  };
}
