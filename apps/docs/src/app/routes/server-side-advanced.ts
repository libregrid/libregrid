import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { evaluateAdvancedFilterModel } from '@libregrid/advanced-filter';
import type { AdvancedFilterModel, ColDef, GridApi, GridOptions, IServerSideDatasource, IServerSideGetRowsRequest } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import { DocsBackendBoundaryComponent, DocsCodeExampleComponent, DocsDemoGuideComponent, DocsFeaturePageShellComponent, DocsProductionChecklistComponent, type DocsCodeExample } from '../docs';

interface Trade { id: string; desk: string; strategy: string; month: string; quantity: number; notional: number; }
const DESKS = ['Equities', 'Fixed Income', 'Commodities'] as const;
const STRATEGIES = ['Arbitrage', 'Macro', 'Momentum'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const;
const TRADES: Trade[] = Array.from({ length: 5_000 }, (_, index) => ({
  id: `trade-${index}`, desk: DESKS[index % DESKS.length]!, strategy: STRATEGIES[Math.floor(index / 3) % STRATEGIES.length]!, month: MONTHS[Math.floor(index / 9) % MONTHS.length]!, quantity: (index % 37) + 1, notional: ((index * 871) % 900_000) + 25_000,
}));

const RISK_FILTER: AdvancedFilterModel = {
  filterType: 'join', type: 'AND', conditions: [
    { filterType: 'text', type: 'equals', colId: 'desk', filter: 'Equities' },
    { filterType: 'number', type: 'greaterThanOrEqual', colId: 'quantity', filter: 20 },
  ],
};

const DATA_SOURCE_EXAMPLES: readonly DocsCodeExample[] = [
  { id: 'angular', label: 'Angular datasource', language: 'TypeScript', filename: 'trades-grid.component.ts', description: 'Put this beside the component that owns the grid.', code: `const datasource: IServerSideDatasource = {
  getRows: async ({ request, success, fail }) => {
    const response = await fetch('/api/trades/query', {
      method: 'POST', body: JSON.stringify(request),
      headers: { 'content-type': 'application/json' },
    });
    if (!response.ok) return fail();
    const result = await response.json();
    success({ rowData: result.rows, rowCount: result.total });
  },
};
api.setGridOption('serverSideDatasource', datasource);` },
  { id: 'backend', label: 'Backend endpoint', language: 'TypeScript', filename: 'trades.controller.ts', description: 'Translate the grid request into your existing query layer.', code: `app.post('/api/trades/query', async (request, response) => {
  const query = request.body; // range, groupKeys, sortModel, filterModel
  const result = await tradeRepository.query({
    start: query.startRow, end: query.endRow,
    groups: query.groupKeys, sort: query.sortModel,
    advancedFilter: query.filterModel,
  });
  response.json({ rows: result.rows, total: result.total });
});` },
];

function isAdvancedFilter(model: unknown): model is AdvancedFilterModel {
  return typeof model === 'object' && model !== null && 'filterType' in model;
}

function filterRows(rows: Trade[], request: IServerSideGetRowsRequest): Trade[] {
  const model = request.filterModel;
  if (isAdvancedFilter(model)) return rows.filter((row) => evaluateAdvancedFilterModel(model, (column) => row[column as keyof Trade]));
  return Object.entries(model ?? {}).reduce((current, [field, filter]) => {
    const value = (filter as { filter?: unknown }).filter;
    return value == null ? current : current.filter((row) => String(row[field as keyof Trade]).toLowerCase().includes(String(value).toLowerCase()));
  }, rows);
}

function sortRows(rows: Trade[], request: IServerSideGetRowsRequest): Trade[] {
  return [...rows].sort((left, right) => request.sortModel.reduce((result, sort) => {
    if (result !== 0) return result;
    const comparison = String(left[sort.colId as keyof Trade]).localeCompare(String(right[sort.colId as keyof Trade]), undefined, { numeric: true });
    return sort.sort === 'desc' ? -comparison : comparison;
  }, 0));
}

/** A production-shaped SSRM demo: advanced filter model, server request, and lazy group results stay in one observable loop. */
@Component({
  selector: 'lgr-server-side-advanced-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule, DocsBackendBoundaryComponent, DocsCodeExampleComponent, DocsDemoGuideComponent, DocsFeaturePageShellComponent, DocsProductionChecklistComponent],
  styles: `
    .actions { display:flex; flex-wrap:wrap; gap:.65rem; margin-bottom:1rem; }
    .demo-card { overflow:hidden; } .trace { margin:0; max-height:18rem; overflow:auto; padding:1rem; background:var(--mat-sys-surface-container); border-top:1px solid var(--mat-sys-outline-variant); font-size:.78rem; line-height:1.5; }
    .trace code { padding:0; border:0; background:transparent; white-space:pre-wrap; }
    .builder { min-height:0; margin-bottom:1rem; } .builder:empty { display:none; }
  `,
  template: `
    <lgr-docs-feature-page-shell
      eyebrow="Server-side analytics"
      title="Let users ask complex questions without loading the warehouse"
      summary="Advanced Filter creates one serializable expression; SSRM forwards it with group, sort, pivot, and range data so your backend performs the work close to the data."
      [packages]="['@libregrid/server-side-row-model', '@libregrid/advanced-filter']"
      [values]="values"
    >
      <div featureDemo>
        <mat-card appearance="outlined" class="demo-card"><mat-card-content>
          <div class="actions">
            <button matButton="filled" (click)="applyRiskFilter()">Apply risk review filter</button>
            <button matButton="tonal" (click)="showBuilder()">Build a custom filter</button>
            <button matButton="text" (click)="clearFilter()">Clear filter</button>
            <button matButton="outlined" (click)="togglePivot()">{{ pivotEnabled() ? 'Leave' : 'Show' }} monthly pivot</button>
          </div>
          <div #advancedParent class="builder"></div>
          <div class="lgr-grid-host"><ag-grid-angular style="width:100%;height:100%" [theme]="theme.gridTheme()" [columnDefs]="columnDefs" [gridOptions]="gridOptions" (gridReady)="ready($event.api)" data-testid="server-side-advanced-grid" /></div>
        </mat-card-content>
        <pre class="trace" aria-live="polite"><code>{{ requestTrace() }}</code></pre></mat-card>
      </div>
      <lgr-docs-demo-guide featureGuide [steps]="demoSteps" intro="The request trace is proof of the frontend/backend hand-off—not a simulated client-side filter." />
      <div featureImplementation><lgr-docs-code-example heading="Connect SSRM to your service" [examples]="dataSourceExamples" /></div>
      <div featureIntegration><lgr-docs-backend-boundary summary="LibreGrid defines the request shape. Your API owns authorization, query planning, aggregation, and data retention." [clientResponsibilities]="clientResponsibilities" [backendResponsibilities]="backendResponsibilities" [contracts]="contracts" /></div>
      <div featureProduction><lgr-docs-production-checklist [items]="checklist" /></div>
    </lgr-docs-feature-page-shell>
  `,
})
export class ServerSideAdvancedDemo {
  protected readonly theme = inject(LibreGridThemeService);
  @ViewChild('advancedParent') private advancedParent!: ElementRef<HTMLElement>;
  private api: GridApi<Trade> | undefined;
  protected readonly pivotEnabled = signal(false);
  protected readonly requestTrace = signal('Waiting for the first server request…');
  protected readonly values = [
    { icon: 'database', title: 'Fast answers at scale', description: 'Only visible blocks and expanded groups are requested.' },
    { icon: 'filter_alt', title: 'Precise self-service', description: 'A single advanced expression survives the client/server boundary.' },
    { icon: 'policy', title: 'Governed data access', description: 'Your API retains authorization and query control.' },
  ];
  protected readonly demoSteps = [
    { title: 'Apply the risk review', instruction: 'Use the primary action to send an AND expression for Equities and quantities of 20 or more.', expected: 'The trace shows filterType: join and the returned groups shrink.', icon: 'filter_alt' },
    { title: 'Expand a desk', instruction: 'Expand a group and then a strategy.', expected: 'Each request carries its groupKeys route; only that branch is loaded.', icon: 'account_tree' },
    { title: 'Pivot by month', instruction: 'Toggle the pivot view after filtering.', expected: 'The backend response declares pivotResultFields for monthly totals.', icon: 'pivot_table_chart' },
  ];
  protected readonly clientResponsibilities = [
    { title: 'Capture intent', description: 'Build the advanced filter and request only the active store block.' },
    { title: 'Render results', description: 'Display groups, leaf rows, loading state, and server-provided pivot fields.' },
  ];
  protected readonly backendResponsibilities = [
    { title: 'Authorize and constrain', description: 'Apply tenancy and policy filters before every customer-supplied expression.' },
    { title: 'Query and aggregate', description: 'Translate grouping, sorting, filters, and pivot into your query engine.' },
  ];
  protected readonly contracts = [
    { kind: 'Request', name: 'IServerSideGetRowsRequest', description: 'Range, route, sort model, filter expression, group and pivot columns.' },
    { kind: 'Response', name: '{ rowData, rowCount }', description: 'A single block of rows plus the total matching the current route.' },
    { kind: 'Response', name: 'pivotResultFields', description: 'Dynamic pivot columns produced by the server.' },
  ];
  protected readonly checklist = [
    { title: 'Enforce authorization on the server', description: 'Never treat a client filter or group route as trusted access control.', priority: 'required' as const },
    { title: 'Bound query cost', description: 'Validate ranges, limit sort columns, and index fields exposed to filtering.', priority: 'required' as const },
    { title: 'Trace request latency', description: 'Record request shape, duration, and store failures to tune the experience.', priority: 'recommended' as const },
  ];
  protected readonly dataSourceExamples = DATA_SOURCE_EXAMPLES;
  protected readonly columnDefs: ColDef<Trade>[] = [
    { field: 'desk', rowGroup: true, hide: true, enableRowGroup: true },
    { field: 'strategy', rowGroup: true, hide: true, enableRowGroup: true },
    { field: 'month', pivot: true, hide: true, enablePivot: true },
    { field: 'quantity', aggFunc: 'sum', enableValue: true, type: 'numericColumn' },
    { field: 'notional', aggFunc: 'sum', enableValue: true, type: 'numericColumn', valueFormatter: ({ value }) => value == null ? '' : `$${Number(value).toLocaleString()}` },
  ];
  protected readonly gridOptions: GridOptions<Trade> = {
    rowModelType: 'serverSide', enableAdvancedFilter: true, advancedFilterBuilderParams: { showMoveButtons: true, minWidth: 520 },
    defaultColDef: { flex: 1, minWidth: 140, sortable: true, filter: true },
    cacheBlockSize: 100, getRowId: ({ data }) => data.id, ssrmExpandAllAffectsAllRows: true, serverSideDatasource: this.datasource(),
  };

  protected ready(api: GridApi<Trade>): void { this.api = api; api.setGridOption('advancedFilterParent', this.advancedParent.nativeElement); }
  protected applyRiskFilter(): void { this.api?.setAdvancedFilterModel(RISK_FILTER); }
  protected showBuilder(): void { this.api?.showAdvancedFilterBuilder(); }
  protected clearFilter(): void { this.api?.setAdvancedFilterModel(null); }
  protected togglePivot(): void { if (!this.api) return; const next = !this.pivotEnabled(); this.pivotEnabled.set(next); this.api.setGridOption('pivotMode', next); }

  private datasource(): IServerSideDatasource<Trade> {
    return { getRows: (params) => window.setTimeout(() => {
      const request = params.request;
      let rows = sortRows(filterRows(TRADES, request), request);
      request.groupKeys.forEach((key, index) => { const field = request.rowGroupCols[index]?.field as keyof Trade | undefined; if (field) rows = rows.filter((row) => String(row[field]) === key); });
      const groupColumn = request.rowGroupCols[request.groupKeys.length];
      const pivotFields = request.pivotMode ? MONTHS.map((month) => `${month}_sum`) : undefined;
      const rowData = groupColumn?.field ? this.groupRows(rows, groupColumn.field, pivotFields) : rows.slice(request.startRow, request.endRow);
      this.requestTrace.set(JSON.stringify({ startRow: request.startRow, endRow: request.endRow, groupKeys: request.groupKeys, sortModel: request.sortModel, filterModel: request.filterModel, pivotMode: request.pivotMode, returnedRows: rowData.length }, null, 2));
      params.success({ rowData, rowCount: groupColumn?.field ? rowData.length : rows.length, ...(pivotFields ? { pivotResultFields: pivotFields } : {}) });
    }, 180) };
  }

  private groupRows(rows: Trade[], field: string, pivotFields: readonly string[] | undefined): Trade[] {
    return [...new Set(rows.map((row) => String(row[field as keyof Trade])))].map((key) => {
      const members = rows.filter((row) => String(row[field as keyof Trade]) === key);
      const group = { id: `group-${field}-${key}`, [field]: key, quantity: members.reduce((sum, row) => sum + row.quantity, 0), notional: members.reduce((sum, row) => sum + row.notional, 0) } as unknown as Trade;
      if (pivotFields) MONTHS.forEach((month) => { (group as unknown as Record<string, number>)[`${month}_sum`] = members.filter((row) => row.month === month).reduce((sum, row) => sum + row.quantity, 0); });
      return group;
    });
  }
}
