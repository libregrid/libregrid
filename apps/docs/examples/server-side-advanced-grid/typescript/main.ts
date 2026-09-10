// Browser-only mock data. Reloading loses changes. In production, replace the mock
// with an authenticated service that validates and authorises reads and writes.
import { evaluateAdvancedFilterModel } from '@libregrid/advanced-filter';
import type {
  AdvancedFilterModel,
  ColDef,
  GridApi,
  GridOptions,
  IServerSideDatasource,
  IServerSideGetRowsRequest,
} from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ServerSideRowModelModule } from '@libregrid/server-side-row-model';
import { AdvancedFilterModule } from '@libregrid/advanced-filter';
import { PivotModule } from '@libregrid/pivot';
import { RowGroupingModule } from '@libregrid/row-grouping';
ModuleRegistry.registerModules([
  AllCommunityModule,
  ServerSideRowModelModule,
  AdvancedFilterModule,
  PivotModule,
  RowGroupingModule,
]);
interface Trade {
  id: string;
  desk: string;
  strategy: string;
  month: string;
  quantity: number;
  notional: number;
}
const DESKS = ['Equities', 'Fixed Income', 'Commodities'] as const;
const STRATEGIES = ['Arbitrage', 'Macro', 'Momentum'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const;
const TRADES: Trade[] = Array.from({ length: 5000 }, (_, index) => ({
  id: `trade-${index}`,
  desk: DESKS[index % DESKS.length]!,
  strategy: STRATEGIES[Math.floor(index / 3) % STRATEGIES.length]!,
  month: MONTHS[Math.floor(index / 9) % MONTHS.length]!,
  quantity: (index % 37) + 1,
  notional: ((index * 871) % 900000) + 25000,
}));
const RISK_FILTER: AdvancedFilterModel = {
  filterType: 'join',
  type: 'AND',
  conditions: [
    { filterType: 'text', type: 'equals', colId: 'desk', filter: 'Equities' },
    { filterType: 'number', type: 'greaterThanOrEqual', colId: 'quantity', filter: 20 },
  ],
};
function isAdvancedFilter(model: unknown): model is AdvancedFilterModel {
  return typeof model === 'object' && model !== null && 'filterType' in model;
}
function filterRows(rows: Trade[], request: IServerSideGetRowsRequest): Trade[] {
  const model = request.filterModel;
  if (isAdvancedFilter(model))
    return rows.filter((row) =>
      evaluateAdvancedFilterModel(model, (column) => row[column as keyof Trade]),
    );
  return Object.entries(model ?? {}).reduce((current, [field, filter]) => {
    const value = (
      filter as {
        filter?: unknown;
      }
    ).filter;
    return value == null
      ? current
      : current.filter((row) =>
          String(row[field as keyof Trade])
            .toLowerCase()
            .includes(String(value).toLowerCase()),
        );
  }, rows);
}
function sortRows(rows: Trade[], request: IServerSideGetRowsRequest): Trade[] {
  return [...rows].sort((left, right) =>
    request.sortModel.reduce((result, sort) => {
      if (result !== 0) return result;
      const comparison = String(left[sort.colId as keyof Trade]).localeCompare(
        String(right[sort.colId as keyof Trade]),
        undefined,
        { numeric: true },
      );
      return sort.sort === 'desc' ? -comparison : comparison;
    }, 0),
  );
}
const advancedParent = document.querySelector<HTMLElement>('#advancedParent')!;
let gridApi: GridApi<Trade> | undefined;
let pivotEnabled = false;
let requestTrace = 'Waiting for the first server request…';
const columnDefs: ColDef<Trade>[] = [
  { field: 'desk', rowGroup: true, hide: true, enableRowGroup: true },
  { field: 'strategy', rowGroup: true, hide: true, enableRowGroup: true },
  { field: 'month', pivot: true, hide: true, enablePivot: true },
  { field: 'quantity', aggFunc: 'sum', enableValue: true, type: 'numericColumn' },
  {
    field: 'notional',
    aggFunc: 'sum',
    enableValue: true,
    type: 'numericColumn',
    valueFormatter: ({ value }) => (value == null ? '' : `$${Number(value).toLocaleString()}`),
  },
];
const gridOptions: GridOptions<Trade> = {
  rowModelType: 'serverSide',
  enableAdvancedFilter: true,
  advancedFilterBuilderParams: { showMoveButtons: true, minWidth: 520 },
  defaultColDef: { flex: 1, minWidth: 140, sortable: true, filter: true },
  cacheBlockSize: 100,
  getRowId: ({ data }) => data.id,
  ssrmExpandAllAffectsAllRows: true,
  serverSideDatasource: datasource(),
};
function ready(api: GridApi<Trade>): void {
  gridApi = api;
  api.setGridOption('advancedFilterParent', advancedParent);
}
function applyRiskFilter(): void {
  gridApi?.setAdvancedFilterModel(RISK_FILTER);
}
function showBuilder(): void {
  gridApi?.showAdvancedFilterBuilder();
}
function clearFilter(): void {
  gridApi?.setAdvancedFilterModel(null);
}
function togglePivot(): void {
  if (!gridApi) return;
  const next = !pivotEnabled;
  pivotEnabled = next;
  render();
  gridApi.setGridOption('pivotMode', next);
}
function datasource(): IServerSideDatasource<Trade> {
  return {
    getRows: (params) =>
      window.setTimeout(() => {
        const request = params.request;
        let rows = sortRows(filterRows(TRADES, request), request);
        request.groupKeys.forEach((key, index) => {
          const field = request.rowGroupCols[index]?.field as keyof Trade | undefined;
          if (field) rows = rows.filter((row) => String(row[field]) === key);
        });
        const groupColumn = request.rowGroupCols[request.groupKeys.length];
        const pivotFields = request.pivotMode ? MONTHS.map((month) => `${month}_sum`) : undefined;
        const rowData = groupColumn?.field
          ? groupRows(rows, groupColumn.field, pivotFields)
          : rows.slice(request.startRow, request.endRow);
        requestTrace = JSON.stringify(
          {
            startRow: request.startRow,
            endRow: request.endRow,
            groupKeys: request.groupKeys,
            sortModel: request.sortModel,
            filterModel: request.filterModel,
            pivotMode: request.pivotMode,
            returnedRows: rowData.length,
          },
          null,
          2,
        );
        render();
        params.success({
          rowData,
          rowCount: groupColumn?.field ? rowData.length : rows.length,
          ...(pivotFields ? { pivotResultFields: pivotFields } : {}),
        });
      }, 180),
  };
}
function groupRows(
  rows: Trade[],
  field: string,
  pivotFields: readonly string[] | undefined,
): Trade[] {
  return [...new Set(rows.map((row) => String(row[field as keyof Trade])))].map((key) => {
    const members = rows.filter((row) => String(row[field as keyof Trade]) === key);
    const group = {
      id: `group-${field}-${key}`,
      [field]: key,
      quantity: members.reduce((sum, row) => sum + row.quantity, 0),
      notional: members.reduce((sum, row) => sum + row.notional, 0),
    } as unknown as Trade;
    if (pivotFields)
      MONTHS.forEach((month) => {
        (group as unknown as Record<string, number>)[`${month}_sum`] = members
          .filter((row) => row.month === month)
          .reduce((sum, row) => sum + row.quantity, 0);
      });
    return group;
  });
}
function render(): void {
  document.querySelector('#action-3')!.textContent =
    `${pivotEnabled ? 'Leave' : 'Show'} monthly pivot`;
  document.querySelector('#status-pivotEnabled')!.textContent =
    pivotEnabled == null ? '' : String(pivotEnabled);
  document.querySelector('#status-requestTrace')!.textContent =
    requestTrace == null ? '' : String(requestTrace);
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  applyRiskFilter();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  showBuilder();
  render();
});
document.querySelector('#action-2')!.addEventListener('click', () => {
  clearFilter();
  render();
});
document.querySelector('#action-3')!.addEventListener('click', () => {
  togglePivot();
  render();
});
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
  onGridReady: (event) => {
    ready(event.api);
    render();
  },
});
render();
