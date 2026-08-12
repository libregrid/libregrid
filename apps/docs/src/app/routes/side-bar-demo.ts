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
  selector: 'lgr-side-bar-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule, MatButtonModule],
  template: `
    <div class="lgr-page">
      <h1>Side Bar</h1>
      <p>
        The side bar hosts tool panels. This demo shows a stub panel —
        the real panels (columns, filters) arrive in Phases 3 and 6.
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
              data-testid="side-bar-grid"
            />
          </div>
        </mat-card-content>
      </mat-card>

      <h2>API</h2>
      <div class="lgr-actions">
        <button mat-stroked-button (click)="toggleSideBar()">Toggle side bar</button>
        <button mat-stroked-button (click)="openPanel()">Open stub panel</button>
        <button mat-stroked-button (click)="closePanel()">Close panel</button>
        <button mat-stroked-button (click)="setPosition('left')">Left</button>
        <button mat-stroked-button (click)="setPosition('right')">Right</button>
        <button mat-stroked-button (click)="setButtonsHidden(true)">Hide panel buttons</button>
        <button mat-stroked-button (click)="setButtonsHidden(false)">Show panel buttons</button>
      </div>

      <p>
        <strong>State:</strong> visible={{ isVisible() }}, openPanel={{ openPanelId() ?? 'none' }}
      </p>

      <h2>How it works</h2>
      <p>
        The side bar is provided by <code>&#64;libregrid/side-bar</code> (SideBarModule).
        It registers a <code>sideBar</code> bean that manages state and a
        <code>AG-SIDE-BAR</code> component selector for the UI shell.
        Feature packages register tool panels via <code>registerToolPanel()</code>.
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
    toolPanels: [
      {
        id: 'stub',
        labelKey: 'stub',
        labelDefault: 'Stub Panel',
        iconKey: 'columns',
        width: 200,
        minWidth: 160,
        maxWidth: 280,
      },
    ],
    defaultToolPanel: 'stub',
  };

  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', minWidth: 160 },
    { field: 'region', minWidth: 110 },
    { field: 'product', minWidth: 130 },
    { field: 'sales', type: 'numericColumn', minWidth: 110 },
    { field: 'units', type: 'numericColumn', minWidth: 100 },
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

  openPanel(): void {
    this.api?.openToolPanel('stub');
    this.openPanelId.set('stub');
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
