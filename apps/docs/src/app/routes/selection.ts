import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService, MaterialStatusBarComponent } from '@libregrid/material';

interface Row {
  name: string;
  first: number;
  second: number;
}
const rows: Row[] = [
  { name: 'Alpha', first: 1, second: 2 },
  { name: 'Beta', first: 3, second: 4 },
  { name: 'Gamma', first: 5, second: 6 },
  { name: 'Delta', first: 0, second: 0 },
  { name: 'Epsilon', first: 0, second: 0 },
  { name: 'Zeta', first: 0, second: 0 },
];
@Component({
  selector: 'lgr-selection-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule, MaterialStatusBarComponent],
  template: ` <div class="lgr-page">
    <h1>Cell Selection & Clipboard</h1>
    <p>
      Drag across cells to create a range. Copy uses an Excel-compatible TSV shape, including quoted
      line breaks and delimiters.
    </p>
    <mat-card appearance="outlined"
      ><mat-card-content
        ><ag-grid-angular
          style="width:100%;height:360px"
          [theme]="theme.gridTheme()"
          [columnDefs]="columnDefs"
          [rowData]="rowData"
          [gridOptions]="gridOptions"
          (gridReady)="ready($event.api)"
          data-testid="selection-grid" /></mat-card-content
    ></mat-card>
    <p>
      <button mat-stroked-button (click)="copy()">Copy selected range</button>
      <button mat-stroked-button (click)="clear()">Clear range</button>
    </p>
    <p aria-live="polite">{{ copied() }}</p>
    <h2>Status</h2>
    <lgr-material-status-bar [text]="statusText()" />
  </div>`,
})
export class SelectionDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = rows;
  protected readonly copied = signal('Nothing copied');
  protected readonly rangeCount = signal(0);
  protected readonly statusText = signal('Ranges: 0');
  private api: GridApi | undefined;
  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'name' },
    { field: 'first' },
    { field: 'second' },
  ];
  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { flex: 1, editable: true },
    cellSelection: { handle: { mode: 'fill' } },
    statusBar: {
      statusPanels: [
        { statusPanel: 'agAggregationComponent', key: 'aggregation' },
        { statusPanel: 'agTotalRowCountComponent', key: 'total' },
      ],
    },
  } as never;
  ready(api: GridApi): void {
    this.api = api;
    api.addEventListener('rangeSelectionChanged', () => {
      this.rangeCount.set(api.getCellRanges()?.length ?? 0);
      this.updateStatus();
    });
    this.updateStatus();
  }
  copy(): void {
    this.api?.copySelectedRangeToClipboard({ includeHeaders: true });
    this.copied.set('Copied selected range — paste it into a spreadsheet or text editor');
  }
  clear(): void {
    this.api?.clearCellSelection();
    this.rangeCount.set(0);
  }
  private updateStatus(): void {
    const aggregation =
      this.api?.getStatusPanel<{ getGui(): HTMLElement }>('aggregation')?.getGui().textContent ??
      'Count: 0';
    const total =
      this.api?.getStatusPanel<{ getGui(): HTMLElement }>('total')?.getGui().textContent ??
      'Total Rows: 0';
    this.statusText.set(`Ranges: ${this.rangeCount()} · ${aggregation} · ${total}`);
  }
}
