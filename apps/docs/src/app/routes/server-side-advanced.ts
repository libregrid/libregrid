import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridApi, GridOptions, IServerSideDatasource, IServerSideGetRowsRequest } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface Trade { id: string; desk: string; strategy: string; month: string; quantity: number; }
const DESKS = ['Equities', 'Fixed Income', 'Commodities'] as const;
const STRATEGIES = ['Arbitrage', 'Macro', 'Momentum'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar'] as const;
const TRADES: Trade[] = Array.from({ length: 180 }, (_, index) => ({
  id: `analytical-${index}`, desk: DESKS[index % DESKS.length]!, strategy: STRATEGIES[Math.floor(index / 3) % STRATEGIES.length]!, month: MONTHS[Math.floor(index / 9) % MONTHS.length]!, quantity: (index % 17) + 1,
}));

function filterRows(rows: Trade[], request: IServerSideGetRowsRequest): Trade[] {
  return Object.entries(request.filterModel ?? {}).reduce((current, [field, filter]) => {
    const value = (filter as { filter?: unknown }).filter;
    return value == null ? current : current.filter((row) => String(row[field as keyof Trade]).toLowerCase().includes(String(value).toLowerCase()));
  }, rows);
}

function sortRows(rows: Trade[], request: IServerSideGetRowsRequest): Trade[] {
  const sort = request.sortModel[0];
  if (!sort) return rows;
  return [...rows].sort((left, right) => {
    const result = String(left[sort.colId as keyof Trade]).localeCompare(String(right[sort.colId as keyof Trade]), undefined, { numeric: true });
    return sort.sort === 'desc' ? -result : result;
  });
}

/** A real in-browser analytical server: it groups, filters, sorts and pivots solely from SSRM requests. */
@Component({
  selector: 'lgr-server-side-advanced-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule],
  template: `
    <div class="lgr-page">
      <h1>SSRM analytical stores</h1>
      <p>The server owns filtering, sorting, grouping, aggregation, and pivot results. Expand a group to lazily request only that route; no aggregate is calculated in the browser.</p>
      <p><button mat-stroked-button (click)="filterEquities()">Filter Equities</button> <button mat-stroked-button (click)="clearFilter()">Clear filter</button> <button mat-stroked-button (click)="togglePivot()">Toggle server pivot</button></p>
      <mat-card appearance="outlined"><mat-card-content><ag-grid-angular style="width:100%;height:520px" [theme]="theme.gridTheme()" [columnDefs]="columnDefs" [gridOptions]="gridOptions" (gridReady)="ready($event.api)" data-testid="server-side-advanced-grid" /></mat-card-content></mat-card>
      <h2>Request contract</h2>
      <p>Every datasource call carries <code>rowGroupCols</code>, <code>groupKeys</code>, <code>valueCols</code>, <code>pivotCols</code>, <code>pivotMode</code>, <code>filterModel</code>, and <code>sortModel</code>. The response supplies aggregate values and <code>pivotResultFields</code>.</p>
    </div>
  `,
})
export class ServerSideAdvancedDemo {
  protected readonly theme = inject(LibreGridThemeService);
  private api: GridApi<Trade> | undefined;
  protected readonly columnDefs: ColDef<Trade>[] = [
    { field: 'desk', rowGroup: true, hide: true, enableRowGroup: true },
    { field: 'strategy', rowGroup: true, hide: true, enableRowGroup: true },
    { field: 'month', pivot: true, hide: true, enablePivot: true },
    { field: 'quantity', aggFunc: 'sum', enableValue: true, type: 'numericColumn', sortable: true, filter: true },
  ];
  protected readonly gridOptions: GridOptions<Trade> = {
    rowModelType: 'serverSide',
    defaultColDef: { flex: 1, minWidth: 140, sortable: true, filter: true },
    getRowId: ({ data }) => data.id,
    ssrmExpandAllAffectsAllRows: true,
    serverSideDatasource: this.datasource(),
  };

  ready(api: GridApi<Trade>): void { this.api = api; }
  filterEquities(): void { this.api?.setFilterModel({ desk: { filterType: 'text', type: 'contains', filter: 'Equities' } }); }
  clearFilter(): void { this.api?.setFilterModel(null); }
  togglePivot(): void { if (this.api) this.api.setGridOption('pivotMode', !this.api.getGridOption('pivotMode')); }

  private datasource(): IServerSideDatasource<Trade> {
    return { getRows: (params) => window.setTimeout(() => {
      const request = params.request;
      let rows = sortRows(filterRows(TRADES, request), request);
      const groupColumns = request.rowGroupCols;
      request.groupKeys.forEach((key, index) => { const field = groupColumns[index]?.field as keyof Trade; if (field) rows = rows.filter((row) => String(row[field]) === key); });
      const groupColumn = groupColumns[request.groupKeys.length];
      const pivotFields = request.pivotMode ? MONTHS.map((month) => `${month}_sum`) : undefined;
      if (groupColumn?.field) {
        const keys = [...new Set(rows.map((row) => String(row[groupColumn.field as keyof Trade])))];
        const rowData = keys.map((key) => {
          const members = rows.filter((row) => String(row[groupColumn.field as keyof Trade]) === key);
          const aggregate: Record<string, string | number> = { [groupColumn.field!]: key, quantity: members.reduce((sum, row) => sum + row.quantity, 0) };
          if (pivotFields) MONTHS.forEach((month) => { aggregate[`${month}_sum`] = members.filter((row) => row.month === month).reduce((sum, row) => sum + row.quantity, 0); });
          return aggregate as unknown as Trade;
        });
        params.success({ rowData, rowCount: rowData.length, ...(pivotFields ? { pivotResultFields: pivotFields } : {}) });
      } else {
        params.success({ rowData: rows, rowCount: rows.length, ...(pivotFields ? { pivotResultFields: pivotFields } : {}) });
      }
    }, 30) };
  }
}
