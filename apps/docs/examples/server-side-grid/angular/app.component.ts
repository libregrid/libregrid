// Browser-only mock data. Reloading loses changes. In production, replace the mock
// with an authenticated service that validates and authorises reads and writes.
import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridOptions, IServerSideDatasource } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
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
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
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
