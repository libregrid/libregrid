import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import {
  type BatchEditingStoppedEvent,
  type CellValueChangedEvent,
  type ColDef,
  type GridApi,
  type GridOptions,
} from 'ag-grid-community';

import { LibreGridThemeService } from '@libregrid/material';

interface Row {
  country: string;
  region: string;
  sales: number;
}

const COUNTRIES = ['United States', 'France', 'Japan', 'Brazil', 'Germany'] as const;
const REGIONS = ['North', 'South', 'East', 'West'] as const;

function makeRows(n: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      country: COUNTRIES[i % COUNTRIES.length]!,
      region: REGIONS[i % REGIONS.length]!,
      sales: Math.round(((i * 7919) % 10000) + 100),
    });
  }
  return rows;
}

@Component({
  selector: 'lgr-batch-edit-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule, MatButtonModule],
  styles: `
    .lgr-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .lgr-batch-status {
      font-size: 0.85rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid light-dark(#d0d0d0, #4d4d4d);
      color: light-dark(#3d3d3d, #e0e0e0);
      margin-right: 4px;
    }
    .lgr-batch-log {
      margin: 8px 0 24px;
      padding-left: 20px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      color: light-dark(#3d3d3d, #e0e0e0);
    }
    .lgr-batch-log-empty {
      list-style: none;
      margin-left: -20px;
      font-style: italic;
      color: light-dark(#5a5759, #b8b5b9);
    }
  `,
  template: `
    <div class="lgr-page">
      <h1>Batch Edit</h1>
      <p>
        Batch editing stages cell edits and writes them in one pass — or discards
        them all. Register <code>BatchEditModule</code> and drive the grid from the
        host UI: <code>startBatchEdit()</code>, then <code>commitBatchEdit()</code>
        or <code>cancelBatchEdit()</code> on the grid API.
      </p>

      <mat-card appearance="outlined">
        <mat-card-content>
          <div class="lgr-grid-host">
            <ag-grid-angular
              style="width: 100%; height: 360px;"
              [theme]="theme.gridTheme()"
              [columnDefs]="columnDefs"
              [rowData]="rowData()"
              [gridOptions]="gridOptions"
              (gridReady)="onGridReady($event.api)"
              data-testid="batch-edit-grid"
            />
          </div>
          <div class="lgr-actions" style="margin-top: 12px;">
            <span class="lgr-batch-status" data-testid="batch-status"
              >{{ batchEditing() ? 'Batch editing' : 'Idle' }}</span
            >
            <button mat-stroked-button data-testid="batch-start" (click)="startBatch()" [disabled]="batchEditing()">
              Start batch edit
            </button>
            <button mat-stroked-button data-testid="batch-commit" (click)="commitBatch()" [disabled]="!batchEditing()">
              Commit batch
            </button>
            <button mat-stroked-button data-testid="batch-cancel" (click)="cancelBatch()" [disabled]="!batchEditing()">
              Cancel batch
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <h2>Event log</h2>
      <ul class="lgr-batch-log" data-testid="batch-event-log">
        @for (entry of log(); track $index) {
          <li>{{ entry }}</li>
        }
        @if (log().length === 0) {
          <li class="lgr-batch-log-empty">No events yet — start a batch and edit a cell.</li>
        }
      </ul>

      <h2>How it works</h2>
      <p>
        While a batch is open, cell edits are <em>staged</em>: the row data is
        untouched, staged cells are highlighted, and
        <code>cellValueChanged</code> events are deferred until the commit.
        <code>batchEditingStarted</code> fires on the first staged write, and
        <code>batchEditingStopped</code> carries the list of committed changes.
        With <code>invalidEditValueMode: 'block'</code>, an invalid staged edit
        keeps the batch open on commit until it is corrected.
      </p>
    </div>
  `,
})
export class BatchEditDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = signal<Row[]>(makeRows(8));
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

  // `batchEditingStarted` fires lazily (first staged write), so the buttons
  // and status track the authoritative `isBatchEditing()` state directly.
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
