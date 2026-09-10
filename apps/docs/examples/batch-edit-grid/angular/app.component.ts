import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  type BatchEditingStoppedEvent,
  type CellValueChangedEvent,
  type ColDef,
  type GridApi,
  type GridOptions,
} from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Row {
  country: string;
  region: string;
  sales: number;
}

@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly rowData = signal<Row[]>([
    {
      country: 'United States',
      region: 'North',
      sales: 100,
    },
    {
      country: 'France',
      region: 'South',
      sales: 8019,
    },
    {
      country: 'Japan',
      region: 'East',
      sales: 5938,
    },
    {
      country: 'Brazil',
      region: 'West',
      sales: 3857,
    },
    {
      country: 'Germany',
      region: 'North',
      sales: 1776,
    },
    {
      country: 'United States',
      region: 'South',
      sales: 9695,
    },
    {
      country: 'France',
      region: 'East',
      sales: 7614,
    },
    {
      country: 'Japan',
      region: 'West',
      sales: 5533,
    },
  ]);
  protected readonly batchEditing = signal(false);
  protected readonly log = signal<string[]>([]);
  private api: GridApi<Row> | undefined;
  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', editable: true, minWidth: 150 },
    { field: 'region', editable: true, minWidth: 110 },
    { field: 'sales', editable: true, type: 'numericColumn', minWidth: 110 },
  ];
  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { sortable: true, resizable: true, flex: 1 },
    onBatchEditingStarted: () => this.onBatchStarted(),
    onBatchEditingStopped: (e: BatchEditingStoppedEvent<Row>) => this.onBatchStopped(e),
    onCellValueChanged: (e: CellValueChangedEvent<Row>) => this.onCellChanged(e),
  };
  onGridReady(gridApi: GridApi<Row>): void {
    this.api = gridApi;
  }
  startBatch(): void {
    this.api?.startBatchEdit();
    this.syncBatchState();
  }
  commitBatch(): void {
    this.api?.commitBatchEdit();
    this.syncBatchState();
  }
  cancelBatch(): void {
    this.api?.cancelBatchEdit();
    this.syncBatchState();
  }
  private syncBatchState(): void {
    this.batchEditing.set(this.api?.isBatchEditing() ?? false);
  }
  private onBatchStarted(): void {
    this.batchEditing.set(true);
    this.pushLog('batchEditingStarted');
  }
  private onBatchStopped(e: BatchEditingStoppedEvent<Row>): void {
    this.batchEditing.set(false);
    const n = e.changes?.length ?? 0;
    this.pushLog(`batchEditingStopped (${n} change${n === 1 ? '' : 's'})`);
  }
  private onCellChanged(e: CellValueChangedEvent<Row>): void {
    this.pushLog(`cellValueChanged ${e.colDef.field}`);
  }
  private pushLog(entry: string): void {
    this.log.update((entries) => [entry, ...entries].slice(0, 50));
  }
}
