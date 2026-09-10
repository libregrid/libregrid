// Browser-only mock data. Reloading loses changes. In production, replace the mock
// with an authenticated service that validates and authorises reads and writes.
import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type {
  GridApi,
  ColDef,
  GetDetailRowDataParams,
  GetRowIdParams,
  GridOptions,
} from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Ticket {
  id: string;
  opened: string;
  subject: string;
  status: 'Open' | 'Waiting' | 'Resolved';
  owner: string;
}
interface Account {
  id: string;
  customer: string;
  tier: 'Enterprise' | 'Growth';
  health: 'Healthy' | 'Watch';
  renewal: string;
  arr: number;
  tickets: Ticket[];
}
const ACCOUNTS: Account[] = [
  {
    id: 'atlas',
    customer: 'Atlas Trading',
    tier: 'Enterprise',
    health: 'Healthy',
    renewal: '2026-11-18',
    arr: 420_000,
    tickets: [
      {
        id: 'a1',
        opened: 'Aug 18',
        subject: 'SAML attribute mapping',
        status: 'Open',
        owner: 'Nora',
      },
      {
        id: 'a2',
        opened: 'Aug 12',
        subject: 'Monthly usage export',
        status: 'Resolved',
        owner: 'James',
      },
    ],
  },
  {
    id: 'beacon',
    customer: 'Beacon Capital',
    tier: 'Enterprise',
    health: 'Watch',
    renewal: '2026-10-03',
    arr: 190_000,
    tickets: [
      {
        id: 'b1',
        opened: 'Aug 19',
        subject: 'API rate limit review',
        status: 'Waiting',
        owner: 'Inez',
      },
    ],
  },
  {
    id: 'cinder',
    customer: 'Cinder Health',
    tier: 'Growth',
    health: 'Healthy',
    renewal: '2027-01-12',
    arr: 126_000,
    tickets: [
      {
        id: 'c1',
        opened: 'Aug 15',
        subject: 'New workspace training',
        status: 'Resolved',
        owner: 'Maya',
      },
      { id: 'c2', opened: 'Aug 07', subject: 'Role audit', status: 'Resolved', owner: 'Maya' },
      {
        id: 'c3',
        opened: 'Jul 29',
        subject: 'Data retention policy',
        status: 'Open',
        owner: 'Arun',
      },
    ],
  },
  {
    id: 'delta',
    customer: 'Delta Logistics',
    tier: 'Growth',
    health: 'Watch',
    renewal: '2026-09-27',
    arr: 98_000,
    tickets: [
      { id: 'd1', opened: 'Aug 20', subject: 'Warehouse data sync', status: 'Open', owner: 'Leo' },
    ],
  },
  {
    id: 'ember',
    customer: 'Ember Education',
    tier: 'Growth',
    health: 'Healthy',
    renewal: '2027-03-04',
    arr: 84_000,
    tickets: [],
  },
  {
    id: 'faraday',
    customer: 'Faraday Systems',
    tier: 'Enterprise',
    health: 'Healthy',
    renewal: '2026-12-16',
    arr: 310_000,
    tickets: [
      {
        id: 'f1',
        opened: 'Aug 11',
        subject: 'Sandbox provisioning',
        status: 'Resolved',
        owner: 'Jo',
      },
    ],
  },
];
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly rows = ACCOUNTS;
  private api: GridApi<Account> | undefined;
  protected readonly detailActivity = signal('Expand an account to request its ticket detail.');
  protected readonly columnDefs: ColDef<Account>[] = [
    { field: 'customer', cellRenderer: 'agGroupCellRenderer', minWidth: 220 },
    { field: 'tier', width: 130 },
    { field: 'health', width: 130 },
    { field: 'renewal', width: 140 },
    {
      field: 'arr',
      headerName: 'ARR',
      type: 'numericColumn',
      valueFormatter: ({ value }) => (value == null ? '' : `$${Number(value).toLocaleString()}`),
    },
  ];
  protected readonly gridOptions: GridOptions<Account> = {
    masterDetail: true,
    isRowMaster: () => true,
    keepDetailRows: true,
    keepDetailRowsCount: 3,
    detailRowHeight: 230,
    defaultColDef: { flex: 1, minWidth: 120, sortable: true },
    getRowId: ({ data }) => data.id,
    detailCellRendererParams: {
      detailGridOptions: {
        columnDefs: [
          { field: 'opened', width: 110 },
          { field: 'subject', flex: 1, minWidth: 220 },
          { field: 'status', width: 130, sortable: true },
          { field: 'owner', width: 120 },
        ],
        defaultColDef: { sortable: true, resizable: true },
        getRowId: ({ data }: GetRowIdParams<Ticket>) => data.id,
      },
      getDetailRowData: ({ data, successCallback }: GetDetailRowDataParams<Account, Ticket>) => {
        this.detailActivity.set(`Loading ${data.customer} ticket detail…`);
        window.setTimeout(() => {
          successCallback(data.tickets);
          this.detailActivity.set(
            `${data.customer}: loaded ${data.tickets.length} ticket${data.tickets.length === 1 ? '' : 's'}.`,
          );
        }, 320);
      },
      refreshStrategy: 'rows',
    },
    onGridReady: ({ api }) => {
      this.api = api;
    },
  };
  protected collapseAll(): void {
    this.api?.forEachNode((node) => node.expanded && node.setExpanded(false));
  }
  protected clearActivity(): void {
    this.detailActivity.set('Activity cleared. Expand an account to request its ticket detail.');
  }
  protected ready(api: GridApi<Account>): void {
    this.api = api;
    // Community's client-side model does not call the MasterDetail service
    // until a model refresh. Mark the initial nodes before that refresh so
    // the shared flatten stage can render each account as an expandable
    // master row from the first paint.
    queueMicrotask(() => {
      api.forEachNode((node) => {
        node.master = true;
      });
      api.refreshClientSideRowModel('map');
    });
  }
}
