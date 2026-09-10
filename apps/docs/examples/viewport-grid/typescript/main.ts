// Browser-only mock data. Reloading loses changes. In production, replace the mock
// with an authenticated service that validates and authorises reads and writes.
import type {
  ColDef,
  GridOptions,
  IViewportDatasource,
  IViewportDatasourceParams,
} from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ViewportRowModelModule } from '@libregrid/viewport-row-model';
ModuleRegistry.registerModules([AllCommunityModule, ViewportRowModelModule]);
interface Quote {
  id: string;
  symbol: string;
  price: number;
  updatedAt: string;
}
const columnDefs: ColDef<Quote>[] = [
  { field: 'id' },
  { field: 'symbol' },
  { field: 'price', type: 'numericColumn' },
  { field: 'updatedAt' },
];
const gridOptions: GridOptions<Quote> = {
  rowModelType: 'viewport',
  viewportRowModelPageSize: 20,
  viewportRowModelBufferSize: 10,
  defaultColDef: { flex: 1, minWidth: 120 },
  getRowId: ({ data }) => data.id,
  viewportDatasource: datasource(),
};
function datasource(): IViewportDatasource {
  let timer: number | undefined;
  let params: IViewportDatasourceParams<Quote> | undefined;
  const quote = (index: number): Quote => ({
    id: `quote-${index}`,
    symbol: ['LGR', 'GRID', 'FLOW'][index % 3]!,
    price: 100 + ((index * 13 + Date.now() / 1000) % 50),
    updatedAt: new Date().toLocaleTimeString(),
  });
  return {
    init: (initParams) => {
      params = initParams;
      initParams.setRowCount(2000);
      timer = window.setInterval(
        () =>
          params?.setRowData(
            Object.fromEntries(Array.from({ length: 30 }, (_, offset) => [offset, quote(offset)])),
          ),
        750,
      );
    },
    setViewportRange: (first, last) =>
      params?.setRowData(
        Object.fromEntries(
          Array.from({ length: last - first + 1 }, (_, offset) => [
            first + offset,
            quote(first + offset),
          ]),
        ),
      ),
    destroy: () => {
      if (timer) window.clearInterval(timer);
    },
  };
}
function render(): void {}
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
});
render();
