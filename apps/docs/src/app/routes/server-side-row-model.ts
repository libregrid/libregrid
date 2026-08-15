import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridOptions, IServerSideDatasource } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface Trade {
  id: string;
  desk: string;
  instrument: string;
  quantity: number;
}

const DESKS = ['Equities', 'Fixed Income', 'Commodities', 'FX'] as const;
const INSTRUMENTS = ['Alpha', 'Beta', 'Gamma', 'Delta'] as const;

const ROW_COUNT = 1_000_000;
const BLOCK_SIZE = 100;
const LOAD_LATENCY_MS = 25;

function tradeAt(index: number): Trade {
  return {
    id: `trade-${index + 1}`,
    desk: DESKS[index % DESKS.length]!,
    instrument: INSTRUMENTS[index % INSTRUMENTS.length]!,
    quantity: ((index * 7919) % 10_000) + 1,
  };
}

/** Phase-7 flat SSRM demonstration with a deterministic one-million-row mock server. */
@Component({
  selector: 'lgr-server-side-row-model-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule],
  template: `
    <div class="lgr-page">
      <h1>Server-Side Row Model</h1>
      <p>
        This grid uses <code>rowModelType: 'serverSide'</code> and a datasource instead of
        <code>rowData</code>. It serves one million deterministic rows in 100-row blocks with a
        small configurable mock-server delay. Use the pager to jump between server-backed pages, or
        sort a column to see fresh range requests.
      </p>

      <mat-card appearance="outlined">
        <mat-card-content>
          <div class="lgr-grid-host">
            <ag-grid-angular
              style="width: 100%; height: 100%;"
              [theme]="theme.gridTheme()"
              [columnDefs]="columnDefs"
              [gridOptions]="gridOptions"
              data-testid="server-side-grid"
            />
          </div>
        </mat-card-content>
      </mat-card>

      <h2>Current Phase 7 scope</h2>
      <p>
        Phase 7 supports flat full and lazy stores, LRU block eviction, retryable failures,
        transactions, and identity-backed selection persistence. A stable <code>getRowId</code> is
        required for correct transaction and selection behavior. Grouping, filtering, and pivot
        request semantics remain Phase 9.
      </p>
    </div>
  `,
})
export class ServerSideRowModelDemo {
  protected readonly theme = inject(LibreGridThemeService);

  protected readonly columnDefs: ColDef<Trade>[] = [
    { field: 'id', minWidth: 120 },
    { field: 'desk', minWidth: 160 },
    { field: 'instrument', minWidth: 140 },
    { field: 'quantity', type: 'numericColumn', minWidth: 130 },
  ];

  protected readonly gridOptions: GridOptions<Trade> = {
    rowModelType: 'serverSide',
    cacheBlockSize: BLOCK_SIZE,
    maxBlocksInCache: 10,
    serverSideInitialRowCount: ROW_COUNT,
    pagination: true,
    paginationPageSize: BLOCK_SIZE,
    paginationPageSizeSelector: [50, BLOCK_SIZE, 250],
    defaultColDef: { sortable: true, resizable: true, flex: 1 },
    getRowId: (params) => params.data.id,
    serverSideDatasource: this.datasource(),
  };

  private datasource(): IServerSideDatasource<Trade> {
    return {
      getRows: (params) => {
        const sort = params.request.sortModel[0];
        const start = params.request.startRow ?? 0;
        const end = Math.min(params.request.endRow ?? ROW_COUNT, ROW_COUNT);
        const reverse = sort?.sort === 'desc';
        const rowData = Array.from({ length: Math.max(0, end - start) }, (_, offset) => {
          const index = reverse ? ROW_COUNT - 1 - (start + offset) : start + offset;
          return tradeAt(index);
        });
        window.setTimeout(() => params.success({ rowData, rowCount: ROW_COUNT }), LOAD_LATENCY_MS);
      },
    };
  }
}
