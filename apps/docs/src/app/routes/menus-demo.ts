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

/**
 * Custom menu item component (MenuItemDef.menuItem): shows the live row count
 * and boldens itself while active. configureDefaults() keeps the grid's
 * styling and interaction handling.
 */
class RowStatusMenuItem {
  private gui: HTMLElement | undefined;
  private onItemActivated: (() => void) | undefined;

  public agInit(params: { onItemActivated: () => void; api: GridApi }): void {
    this.onItemActivated = params.onItemActivated;
    this.gui = document.createElement('span');
    this.gui.textContent = 'Displayed rows: ' + String(params.api.getDisplayedRowCount());
  }

  public configureDefaults(): boolean {
    return true;
  }

  public setActive(active: boolean): void {
    if (this.gui) this.gui.style.fontWeight = active ? '700' : '500';
  }

  public select(): void {
    this.onItemActivated?.();
  }

  public getGui(): HTMLElement {
    return this.gui ?? document.createElement('span');
  }
}

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
              style="width: 100%; height: 100%;"
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
        <button matButton="tonal" (click)="showContextMenu()">Show context menu</button>
        <button matButton="tonal" (click)="hidePopupMenu()">Hide popup menu</button>
        <button matButton="tonal" (click)="setContextMenuSuppressed(true)">Suppress context menu</button>
        <button matButton="tonal" (click)="setContextMenuSuppressed(false)">Enable context menu</button>
      </div>
      <p><strong>Last menu action:</strong> {{ lastAction() }}</p>

      <h2>How it works</h2>
      <p>
        Register <code>ContextMenuModule</code> and <code>ColumnMenuModule</code> from
        <code>&#64;libregrid/menu</code> and the menus appear — right-click for the context
        menu, or use the icon in a column header for the column menu.
      </p>
      <p>
        Menu items come from an extensible registry, so other LibreGrid packages (and your own
        app) contribute items without forking the menu. This demo adds an <em>Inspect Cell</em>
        action and a live row-count item on top of the defaults.
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
      ...(params.defaultItems ?? []),
      'separator',
      {
        name: 'Inspect Cell',
        action: () => this.lastAction.set(String(params.value ?? 'empty')),
      },
      {
        name: 'Clear Inspection',
        action: () => this.lastAction.set('none'),
      },
      {
        name: 'Row status (custom component)',
        menuItem: RowStatusMenuItem,
        suppressCloseOnSelect: true,
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
