// Browser-only mock data. Reloading loses changes. In production, replace the mock
// with an authenticated service that validates and authorises reads and writes.
import type { ColDef, GridOptions, IServerSideDatasource } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ServerSideRowModelModule } from '@libregrid/server-side-row-model';
ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);
interface Trade {
  id: string;
  desk: string;
  instrument: string;
  quantity: number;
}
const DESKS = ['Equities', 'Fixed Income', 'Commodities', 'FX'] as const;
const INSTRUMENTS = ['Alpha', 'Beta', 'Gamma', 'Delta'] as const;
const ROW_COUNT = 1000000;
const BLOCK_SIZE = 100;
const LOAD_LATENCY_MS = 25;
function tradeAt(index: number): Trade {
  return {
    id: `trade-${index + 1}`,
    desk: DESKS[index % DESKS.length]!,
    instrument: INSTRUMENTS[index % INSTRUMENTS.length]!,
    quantity: ((index * 7919) % 10000) + 1,
  };
}
const columnDefs: ColDef<Trade>[] = [
  { field: 'id', minWidth: 120 },
  { field: 'desk', minWidth: 160 },
  { field: 'instrument', minWidth: 140 },
  { field: 'quantity', type: 'numericColumn', minWidth: 130 },
];
const gridOptions: GridOptions<Trade> = {
  rowModelType: 'serverSide',
  cacheBlockSize: BLOCK_SIZE,
  maxBlocksInCache: 10,
  serverSideInitialRowCount: ROW_COUNT,
  pagination: true,
  paginationPageSize: BLOCK_SIZE,
  paginationPageSizeSelector: [50, BLOCK_SIZE, 250],
  defaultColDef: { sortable: true, resizable: true, flex: 1 },
  getRowId: (params) => params.data.id,
  serverSideDatasource: datasource(),
};
function datasource(): IServerSideDatasource<Trade> {
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
function render(): void {}
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
});
render();
