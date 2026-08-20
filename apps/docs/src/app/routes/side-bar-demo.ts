import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { type ColDef, type GridOptions, type GridApi, type SideBarDef } from 'ag-grid-community';

import { LibreGridThemeService } from '@libregrid/material';

interface Row {
  country: string;
  region: string;
  product: string;
  sales: number;
  units: number;
  category: string;
  discount: number;
  stock: number;
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
      category: PRODUCTS[(i + 1) % PRODUCTS.length]!,
      discount: (i * 7) % 30,
      stock: ((i * 53) % 200) + 10,
    });
  }
  return rows;
}

@Component({
  selector: 'lgr-side-bar-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule, MatButtonModule],
  template: `
    <div class="lgr-page">
      <h1>Side Bar</h1>
      <p>
        The side bar hosts tool panels. Register the
        <code>ColumnsToolPanelModule</code> and
        <code>FiltersToolPanelModule</code> modules and list the panel ids in
        <code>sideBar.toolPanels</code>. This demo opens the real Columns and
        Filters panels.
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
              data-testid="side-bar-grid"
            />
          </div>
        </mat-card-content>
      </mat-card>

      <h2>API</h2>
      <div class="lgr-actions">
        <button matButton="tonal" (click)="toggleSideBar()">Toggle side bar</button>
        <button matButton="tonal" (click)="openPanel('columns')">Open columns panel</button>
        <button matButton="tonal" (click)="openPanel('filters')">Open filters panel</button>
        <button matButton="tonal" (click)="closePanel()">Close panel</button>
        <button matButton="tonal" (click)="setPosition('left')">Left</button>
        <button matButton="tonal" (click)="setPosition('right')">Right</button>
        <button matButton="tonal" (click)="setButtonsHidden(true)">Hide panel buttons</button>
        <button matButton="tonal" (click)="setButtonsHidden(false)">Show panel buttons</button>
      </div>

      <p>
        <strong>State:</strong> visible={{ isVisible() }}, openPanel={{ openPanelId() ?? 'none' }}
      </p>

      <h2>How it works</h2>
      <p>
        Register <code>&#64;libregrid/side-bar</code> and list the panel ids in
        <code>sideBar.toolPanels</code>. Feature packages contribute their own panels, so
        <em>Columns</em> and <em>Filters</em> appear here automatically once their modules
        are installed.
      </p>
    </div>
  `,
  styles: `
    .lgr-actions { display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap; }
  `,
})
export class SideBarDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = signal<Row[]>(makeRows(50));
  protected readonly isVisible = signal(false);
  protected readonly openPanelId = signal<string | null>(null);
  protected readonly buttonsHidden = signal(false);
  private api: GridApi | null = null;

  private readonly sideBarDef: SideBarDef = {
    toolPanels: ['columns', 'filters'],
    defaultToolPanel: 'columns',
  };

  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', enableRowGroup: true, minWidth: 160 },
    { field: 'region', enableRowGroup: true, enablePivot: true, minWidth: 110 },
    { field: 'product', enableRowGroup: true, minWidth: 130 },
    { field: 'sales', enableValue: true, type: 'numericColumn', minWidth: 110 },
    { field: 'units', enableValue: true, type: 'numericColumn', minWidth: 100 },
    { field: 'category', enablePivot: true, minWidth: 150 },
    { field: 'discount', enableValue: true, type: 'numericColumn', minWidth: 130 },
    { field: 'stock', type: 'numericColumn', minWidth: 130 },
  ];

  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1 },
    sideBar: this.sideBarDef,
  };

  onGridReady(gridApi: GridApi): void {
    this.api = gridApi;
    this.isVisible.set(gridApi.isSideBarVisible());
    this.openPanelId.set(gridApi.getOpenedToolPanel());
  }

  toggleSideBar(): void {
    const current = this.api?.isSideBarVisible() ?? false;
    this.api?.setSideBarVisible(!current);
    this.isVisible.set(!current);
  }

  openPanel(id: string): void {
    this.api?.openToolPanel(id);
    this.openPanelId.set(id);
  }

  closePanel(): void {
    this.api?.closeToolPanel();
    this.openPanelId.set(null);
  }

  setPosition(position: 'left' | 'right'): void {
    this.api?.setSideBarPosition(position);
  }

  setButtonsHidden(hidden: boolean): void {
    this.buttonsHidden.set(hidden);
    this.api?.setGridOption('sideBar', {
      ...this.sideBarDef,
      hideButtons: hidden,
    });
  }
}
