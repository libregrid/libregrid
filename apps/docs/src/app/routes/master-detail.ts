import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GetDetailRowDataParams, GetRowIdParams, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import { DocsBackendBoundaryComponent, DocsCodeExampleComponent, DocsDemoGuideComponent, DocsFeaturePageShellComponent, DocsProductionChecklistComponent, type DocsCodeExample } from '../docs';

interface Ticket { id: string; opened: string; subject: string; status: 'Open' | 'Waiting' | 'Resolved'; owner: string; }
interface Account { id: string; customer: string; tier: 'Enterprise' | 'Growth'; health: 'Healthy' | 'Watch'; renewal: string; arr: number; tickets: Ticket[]; }

const ACCOUNTS: Account[] = [
  { id: 'atlas', customer: 'Atlas Trading', tier: 'Enterprise', health: 'Healthy', renewal: '2026-11-18', arr: 420_000, tickets: [{ id: 'a1', opened: 'Aug 18', subject: 'SAML attribute mapping', status: 'Open', owner: 'Nora' }, { id: 'a2', opened: 'Aug 12', subject: 'Monthly usage export', status: 'Resolved', owner: 'James' }] },
  { id: 'beacon', customer: 'Beacon Capital', tier: 'Enterprise', health: 'Watch', renewal: '2026-10-03', arr: 190_000, tickets: [{ id: 'b1', opened: 'Aug 19', subject: 'API rate limit review', status: 'Waiting', owner: 'Inez' }] },
  { id: 'cinder', customer: 'Cinder Health', tier: 'Growth', health: 'Healthy', renewal: '2027-01-12', arr: 126_000, tickets: [{ id: 'c1', opened: 'Aug 15', subject: 'New workspace training', status: 'Resolved', owner: 'Maya' }, { id: 'c2', opened: 'Aug 07', subject: 'Role audit', status: 'Resolved', owner: 'Maya' }, { id: 'c3', opened: 'Jul 29', subject: 'Data retention policy', status: 'Open', owner: 'Arun' }] },
  { id: 'delta', customer: 'Delta Logistics', tier: 'Growth', health: 'Watch', renewal: '2026-09-27', arr: 98_000, tickets: [{ id: 'd1', opened: 'Aug 20', subject: 'Warehouse data sync', status: 'Open', owner: 'Leo' }] },
  { id: 'ember', customer: 'Ember Education', tier: 'Growth', health: 'Healthy', renewal: '2027-03-04', arr: 84_000, tickets: [] },
  { id: 'faraday', customer: 'Faraday Systems', tier: 'Enterprise', health: 'Healthy', renewal: '2026-12-16', arr: 310_000, tickets: [{ id: 'f1', opened: 'Aug 11', subject: 'Sandbox provisioning', status: 'Resolved', owner: 'Jo' }] },
];

const DETAIL_EXAMPLES: readonly DocsCodeExample[] = [
  { id: 'grid', label: 'Grid configuration', language: 'TypeScript', filename: 'accounts-grid.component.ts', description: 'Configure a small, independently sortable child grid for each master row.', code: `const gridOptions: GridOptions<Account> = {
  masterDetail: true,
  keepDetailRows: true,
  keepDetailRowsCount: 3,
  detailCellRendererParams: {
    detailGridOptions: { columnDefs: ticketColumns },
    getDetailRowData: ({ data, successCallback }) => {
      api.get('/accounts/' + data.id + '/tickets')
        .then((result) => successCallback(result.tickets));
    },
  },
};` },
  { id: 'backend', label: 'Backend endpoint', language: 'TypeScript', filename: 'accounts.controller.ts', description: 'Keep the master summary payload lean; fetch operational detail only on expansion.', code: `app.get('/api/accounts/:accountId/tickets', async (request, response) => {
  const tickets = await ticketRepository.forAccount({
    accountId: request.params.accountId,
    actor: request.user,
  });
  response.json({ tickets });
});` },
];

@Component({
  selector: 'lgr-master-detail-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule, DocsBackendBoundaryComponent, DocsCodeExampleComponent, DocsDemoGuideComponent, DocsFeaturePageShellComponent, DocsProductionChecklistComponent],
  styles: `.status { margin:.8rem 0 0; color:var(--mat-sys-on-surface-variant); font-size:.86rem; }`,
  template: `
    <lgr-docs-feature-page-shell
      eyebrow="Account workspace pattern"
      title="Keep the customer record in context while teams investigate"
      summary="Master / Detail turns one compact operational list into focused, lazy-loaded workspaces. Teams scan renewal health, then expand only the account that needs attention."
      [packages]="['@libregrid/master-detail']"
      [values]="values"
    >
      <div featureDemo>
        <mat-card appearance="outlined"><mat-card-content>
          <div class="lgr-actions"><button matButton="tonal" (click)="collapseAll()">Collapse all details</button><button matButton="text" (click)="clearActivity()">Clear activity</button></div>
          <div class="lgr-grid-host"><ag-grid-angular style="height:100%;width:100%" [theme]="theme.gridTheme()" [rowData]="rows" [columnDefs]="columnDefs" [gridOptions]="gridOptions" (gridReady)="ready($event.api)" data-testid="master-detail-grid" /></div>
          <p class="status" aria-live="polite">{{ detailActivity() }}</p>
        </mat-card-content></mat-card>
      </div>
      <lgr-docs-demo-guide featureGuide [steps]="demoSteps" intro="This is intentionally not tree data: each account remains a master row and each expansion mounts a child grid." />
      <div featureImplementation><lgr-docs-code-example heading="Load details only when an account is opened" [examples]="detailExamples" /></div>
      <div featureIntegration><lgr-docs-backend-boundary summary="The summary list and the per-account detail endpoint can evolve independently, keeping the main grid responsive even when child records are large." [clientResponsibilities]="clientResponsibilities" [backendResponsibilities]="backendResponsibilities" [contracts]="contracts" /></div>
      <div featureProduction><lgr-docs-production-checklist [items]="checklist" /></div>
    </lgr-docs-feature-page-shell>
  `,
})
export class MasterDetailDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rows = ACCOUNTS;
  private api: import('ag-grid-community').GridApi<Account> | undefined;
  protected readonly detailActivity = signal('Expand an account to request its ticket detail.');
  protected readonly values = [
    { icon: 'visibility', title: 'Preserve context', description: 'The parent account remains visible while users sort and inspect its work.' },
    { icon: 'speed', title: 'Load on demand', description: 'Only expanded accounts fetch and mount a child grid.' },
    { icon: 'inventory_2', title: 'Bounded memory', description: 'A small detail cache avoids duplicate requests without retaining every child grid.' },
  ];
  protected readonly demoSteps = [
    { title: 'Find an account at risk', instruction: 'Sort Health or Renewal, then expand the Beacon Capital row.', expected: 'A ticket grid appears beneath that account after a short loading state.', icon: 'search' },
    { title: 'Work inside the detail', instruction: 'Sort the ticket Subject or Status columns.', expected: 'Only that account’s child grid changes order.', icon: 'sort' },
    { title: 'Re-open a recent account', instruction: 'Collapse and expand one of the last three accounts.', expected: 'The bounded cache can reuse the mounted detail grid.', icon: 'memory' },
  ];
  protected readonly clientResponsibilities = [
    { title: 'Render summaries', description: 'Show a lightweight account row with a stable master-row ID.' },
    { title: 'Request detail on expansion', description: 'Pass only the account ID to the child-data request and display loading/failure state.' },
  ];
  protected readonly backendResponsibilities = [
    { title: 'Authorize account access', description: 'Validate tenant and actor permissions for both list and detail queries.' },
    { title: 'Return focused child data', description: 'Serve tickets, orders, or audit events independently from the account summary.' },
  ];
  protected readonly contracts = [
    { kind: 'Request', name: 'GET /accounts/:id/tickets', description: 'Lazy request triggered when one master row expands.' },
    { kind: 'Response', name: '{ tickets: Ticket[] }', description: 'Child rows for the independently configured detail grid.' },
    { kind: 'State', name: 'keepDetailRowsCount', description: 'Client-side cache limit; not a substitute for backend caching.' },
  ];
  protected readonly checklist = [
    { title: 'Use stable row IDs', description: 'Detail cache and row refresh depend on a durable master identity.', priority: 'required' as const },
    { title: 'Make loading and empty states explicit', description: 'An account with zero detail rows should not look like a failed request.', priority: 'required' as const },
    { title: 'Set a memory budget', description: 'Choose keepDetailRowsCount based on detail-grid size and usage patterns.', priority: 'recommended' as const },
  ];
  protected readonly detailExamples = DETAIL_EXAMPLES;
  protected readonly columnDefs: ColDef<Account>[] = [
    { field: 'customer', cellRenderer: 'agGroupCellRenderer', minWidth: 220 },
    { field: 'tier', width: 130 }, { field: 'health', width: 130 }, { field: 'renewal', width: 140 },
    { field: 'arr', headerName: 'ARR', type: 'numericColumn', valueFormatter: ({ value }) => value == null ? '' : `$${Number(value).toLocaleString()}` },
  ];
  protected readonly gridOptions: GridOptions<Account> = {
    masterDetail: true, keepDetailRows: true, keepDetailRowsCount: 3, detailRowHeight: 230,
    defaultColDef: { flex: 1, minWidth: 120, sortable: true }, getRowId: ({ data }) => data.id,
    detailCellRendererParams: {
      detailGridOptions: { columnDefs: [{ field: 'opened', width: 110 }, { field: 'subject', flex: 1, minWidth: 220 }, { field: 'status', width: 130, sortable: true }, { field: 'owner', width: 120 }], defaultColDef: { sortable: true, resizable: true }, getRowId: ({ data }: GetRowIdParams<Ticket>) => data.id },
      getDetailRowData: ({ data, successCallback }: GetDetailRowDataParams<Account, Ticket>) => {
        this.detailActivity.set(`Loading ${data.customer} ticket detail…`);
        window.setTimeout(() => { successCallback(data.tickets); this.detailActivity.set(`${data.customer}: loaded ${data.tickets.length} ticket${data.tickets.length === 1 ? '' : 's'}.`); }, 320);
      }, refreshStrategy: 'rows',
    },
    onGridReady: ({ api }) => { this.api = api; },
  };

  protected collapseAll(): void { this.api?.forEachNode((node) => node.expanded && node.setExpanded(false)); }
  protected clearActivity(): void { this.detailActivity.set('Activity cleared. Expand an account to request its ticket detail.'); }
  protected ready(api: import('ag-grid-community').GridApi<Account>): void { this.api = api; }
}
