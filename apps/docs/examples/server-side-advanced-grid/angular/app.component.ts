// Browser-only mock data. Reloading loses changes. In production, replace the mock
// with an authenticated service that validates and authorises reads and writes.
import type { ElementRef } from '@angular/core';
import { Component, ViewChild, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { evaluateAdvancedFilterModel } from '@libregrid/advanced-filter';
import type {
  AdvancedFilterModel,
  ColDef,
  GridApi,
  GridOptions,
  IServerSideDatasource,
  IServerSideGetRowsRequest,
} from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
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
const TRADES: Trade[] = Array.from({ length: 5_000 }, (_, index) => ({
  id: `trade-${index}`,
  desk: DESKS[index % DESKS.length]!,
  strategy: STRATEGIES[Math.floor(index / 3) % STRATEGIES.length]!,
  month: MONTHS[Math.floor(index / 9) % MONTHS.length]!,
  quantity: (index % 37) + 1,
  notional: ((index * 871) % 900_000) + 25_000,
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
    const value = (filter as { filter?: unknown }).filter;
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
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  @ViewChild('advancedParent') private advancedParent!: ElementRef<HTMLElement>;
  private api: GridApi<Trade> | undefined;
  protected readonly pivotEnabled = signal(false);
  protected readonly requestTrace = signal('Waiting for the first server request…');
  protected readonly columnDefs: ColDef<Trade>[] = [
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
  protected readonly gridOptions: GridOptions<Trade> = {
    rowModelType: 'serverSide',
    enableAdvancedFilter: true,
    advancedFilterBuilderParams: { showMoveButtons: true, minWidth: 520 },
    defaultColDef: { flex: 1, minWidth: 140, sortable: true, filter: true },
    cacheBlockSize: 100,
    getRowId: ({ data }) => data.id,
    ssrmExpandAllAffectsAllRows: true,
    serverSideDatasource: this.datasource(),
  };
  protected ready(api: GridApi<Trade>): void {
    this.api = api;
    api.setGridOption('advancedFilterParent', this.advancedParent.nativeElement);
  }
  protected applyRiskFilter(): void {
    this.api?.setAdvancedFilterModel(RISK_FILTER);
  }
  protected showBuilder(): void {
    this.api?.showAdvancedFilterBuilder();
  }
  protected clearFilter(): void {
    this.api?.setAdvancedFilterModel(null);
  }
  protected togglePivot(): void {
    if (!this.api) return;
    const next = !this.pivotEnabled();
    this.pivotEnabled.set(next);
    this.api.setGridOption('pivotMode', next);
  }
  private datasource(): IServerSideDatasource<Trade> {
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
            ? this.groupRows(rows, groupColumn.field, pivotFields)
            : rows.slice(request.startRow, request.endRow);
          this.requestTrace.set(
            JSON.stringify(
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
            ),
          );
          params.success({
            rowData,
            rowCount: groupColumn?.field ? rowData.length : rows.length,
            ...(pivotFields ? { pivotResultFields: pivotFields } : {}),
          });
        }, 180),
    };
  }
  private groupRows(
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
}
