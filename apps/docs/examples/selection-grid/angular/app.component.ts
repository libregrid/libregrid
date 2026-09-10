import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
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
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly rowData = rows;
  protected readonly copied = signal('Nothing copied');
  private api: GridApi | undefined;
  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'name' },
    { field: 'first', type: 'numericColumn' },
    { field: 'second', type: 'numericColumn' },
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
  }
  copy(): void {
    this.api?.copySelectedRangeToClipboard({ includeHeaders: true });
    this.copied.set('Copied selected range — paste it into a spreadsheet or text editor');
  }
  clear(): void {
    this.api?.clearCellSelection();
  }
}
