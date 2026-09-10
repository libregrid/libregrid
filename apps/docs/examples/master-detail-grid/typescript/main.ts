// Browser-only mock data. Reloading loses changes. In production, replace the mock
// with an authenticated service that validates and authorises reads and writes.
import type {
  GridApi,
  ColDef,
  GetDetailRowDataParams,
  GetRowIdParams,
  GridOptions,
} from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { MasterDetailModule } from '@libregrid/master-detail';
ModuleRegistry.registerModules([AllCommunityModule, MasterDetailModule]);
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
    arr: 420000,
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
    arr: 190000,
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
    arr: 126000,
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
    arr: 98000,
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
    arr: 84000,
    tickets: [],
  },
  {
    id: 'faraday',
    customer: 'Faraday Systems',
    tier: 'Enterprise',
    health: 'Healthy',
    renewal: '2026-12-16',
    arr: 310000,
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
const rows = ACCOUNTS;
let gridApi: GridApi<Account> | undefined;
let detailActivity = 'Expand an account to request its ticket detail.';
const columnDefs: ColDef<Account>[] = [
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
const gridOptions: GridOptions<Account> = {
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
      detailActivity = `Loading ${data.customer} ticket detail…`;
      render();
      window.setTimeout(() => {
        successCallback(data.tickets);
        detailActivity = `${data.customer}: loaded ${data.tickets.length} ticket${data.tickets.length === 1 ? '' : 's'}.`;
        render();
      }, 320);
    },
    refreshStrategy: 'rows',
  },
  onGridReady: ({ api }) => {
    gridApi = api;
  },
};
function collapseAll(): void {
  gridApi?.forEachNode((node) => node.expanded && node.setExpanded(false));
}
function clearActivity(): void {
  detailActivity = 'Activity cleared. Expand an account to request its ticket detail.';
  render();
}
function ready(api: GridApi<Account>): void {
  gridApi = api;
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
function render(): void {
  document.querySelector('#status-detailActivity')!.textContent =
    detailActivity == null ? '' : String(detailActivity);
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  collapseAll();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  clearActivity();
  render();
});
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
  rowData: rows,
  onGridReady: (event) => {
    ready(event.api);
    render();
  },
});
render();
