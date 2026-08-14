import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GetDetailRowDataParams, GetRowIdParams, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface DetailCall { id: string; direction: string; duration: number; }
interface Call { id: string; path: string[]; customer: string; total: number; calls: DetailCall[]; }
const accounts: Call[] = [
  { id: 'atlas', path: ['Accounts', 'Atlas Trading'], customer: 'Atlas Trading', total: 420, calls: [{ id: 'a1', direction: 'Inbound', duration: 12 }, { id: 'a2', direction: 'Outbound', duration: 18 }] },
  { id: 'beacon', path: ['Accounts', 'Beacon Capital'], customer: 'Beacon Capital', total: 190, calls: [{ id: 'b1', direction: 'Inbound', duration: 6 }] },
];

@Component({ selector: 'lgr-master-detail-demo', changeDetection: ChangeDetectionStrategy.OnPush, imports: [AgGridAngular, MatCardModule], template: `
  <div class="lgr-page"><h1>Master / Detail</h1><p>Expand an account to mount a real independently sortable detail grid. Collapse it to destroy the instance, or enable <code>keepDetailRows</code> to reuse a bounded cache.</p>
  <mat-card appearance="outlined"><mat-card-content><ag-grid-angular style="width:100%;height:540px" [theme]="theme.gridTheme()" [rowData]="rows" [columnDefs]="columnDefs" [gridOptions]="gridOptions" data-testid="master-detail-grid" /></mat-card-content></mat-card></div>
` })
export class MasterDetailDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rows = accounts;
  protected readonly columnDefs: ColDef<Call>[] = [{ field: 'customer', cellRenderer: 'agGroupCellRenderer' }, { field: 'total', type: 'numericColumn' }];
  protected readonly gridOptions: GridOptions<Call> = {
    treeData: true, getDataPath: ({ path }) => path, groupDefaultExpanded: -1,
    masterDetail: true, masterDefaultExpanded: 2, keepDetailRows: true, keepDetailRowsCount: 2, getRowId: ({ data }) => data.id,
    detailRowHeight: 220, defaultColDef: { flex: 1, minWidth: 140 },
    detailCellRendererParams: { detailGridOptions: { columnDefs: [{ field: 'direction', sortable: true }, { field: 'duration', sortable: true }], defaultColDef: { flex: 1 }, getRowId: ({ data }: GetRowIdParams<DetailCall>) => data.id }, getDetailRowData: ({ data, successCallback }: GetDetailRowDataParams<Call, DetailCall>) => window.setTimeout(() => successCallback(data.calls), 25), refreshStrategy: 'rows' },
  };
}
