import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { type ColDef, type GridOptions, type GridApi } from 'ag-grid-community';

import { LibreGridThemeService } from '@libregrid/material';

interface Row {
  country: string;
  region: string;
  product: string;
  sales: number;
  units: number;
}

const COUNTRIES = ['United States', 'France', 'Japan', 'Brazil', 'Germany'] as const;
const REGIONS = ['North', 'South', 'East', 'West'] as const;
const PRODUCTS = ['Widget', 'Gadget', 'Doohickey'] as const;

function makeRows(n: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      country: COUNTRIES[i % COUNTRIES.length]!,
      region: REGIONS[i % REGIONS.length]!,
      product: PRODUCTS[i % PRODUCTS.length]!,
      sales: Math.round(((i * 7919) % 10000) + 100),
      units: ((i * 31) % 50) + 1,
    });
  }
  return rows;
}

@Component({
  selector: 'lgr-menus-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule, MatButtonModule],
  template: `
    <div class="lgr-page">
      <h1>Menus</h1>
      <p>
        Right-click a cell to open the <strong>context menu</strong>.
        Click the menu icon in a column header for the <strong>column menu</strong>.
      </p>

      <mat-card appearance="outlined">
        <mat-card-content>
          <div class="lgr-grid-host">
            <ag-grid-angular
              style="width: 100%; height: 500px;"
              [theme]="theme.gridTheme()"
              [columnDefs]="columnDefs"
              [rowData]="rowData()"
              [gridOptions]="gridOptions"
              (gridReady)="onGridReady($event.api)"
              data-testid="menus-grid"
            />
          </div>
        </mat-card-content>
      </mat-card>

      <h2>API</h2>
      <div class="lgr-actions">
        <button mat-stroked-button (click)="showContextMenu()">Show context menu</button>
        <button mat-stroked-button (click)="hidePopupMenu()">Hide popup menu</button>
        <button mat-stroked-button (click)="setContextMenuSuppressed(true)">Suppress context menu</button>
        <button mat-stroked-button (click)="setContextMenuSuppressed(false)">Enable context menu</button>
      </div>
      <p><strong>Last menu action:</strong> {{ lastAction() }}</p>

      <h2>How it works</h2>
      <p>
        The context menu is provided by <code>&#64;libregrid/menu</code> (ContextMenuModule).
        It registers a <code>contextMenuSvc</code> bean that Community's CellCtrl calls
        on right-click. Menu items come from an extensible registry — later phases
        contribute items without editing this package.
      </p>
      <p>
        The column menu is provided by ColumnMenuModule. It registers a
        <code>colMenuFactory</code> bean that builds the menu content.
      </p>
    </div>
  `,
  styles: `
    .lgr-actions { display: flex; gap: 8px; margin: 8px 0; }
  `,
})
export class MenusDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = signal<Row[]>(makeRows(50));
  protected readonly lastAction = signal('none');
  protected readonly suppressContextMenu = signal(false);
  private api: GridApi | null = null;

  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', minWidth: 160 },
    { field: 'region', minWidth: 110 },
    { field: 'product', minWidth: 130 },
    { field: 'sales', type: 'numericColumn', minWidth: 110 },
    { field: 'units', type: 'numericColumn', minWidth: 100 },
  ];

  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1 },
    rowSelection: { mode: 'multiRow' },
    getContextMenuItems: (params) => [
      {
        name: 'Inspect Cell',
        action: () => this.lastAction.set(String(params.value ?? 'empty')),
      },
      {
        name: 'Clear Inspection',
        action: () => this.lastAction.set('none'),
      },
    ],
    allowContextMenuWithControlKey: true,
  };

  onGridReady(gridApi: GridApi): void {
    this.api = gridApi;
  }

  showContextMenu(): void {
    this.api?.showContextMenu();
  }

  hidePopupMenu(): void {
    this.api?.hidePopupMenu();
  }

  setContextMenuSuppressed(suppressed: boolean): void {
    this.api?.setGridOption('suppressContextMenu', suppressed);
    this.suppressContextMenu.set(suppressed);
  }
}
