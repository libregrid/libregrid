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
    });
  }
  return rows;
}

@Component({
  selector: 'lgr-toolbar-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule, MatButtonModule],
  template: `
    <div class="lgr-page">
      <h1>Toolbar</h1>
      <p>
        The Quick Access Toolbar sits above the grid. Register
        <code>ToolbarModule</code> and list items in the <code>toolbar</code>
        grid option. The Find item needs <code>&#64;libregrid/find</code>; the
        Row Group and Pivot panel items need
        <code>&#64;libregrid/columns-tool-panel</code>.
      </p>

      <mat-card appearance="outlined">
        <mat-card-content>
          <div class="lgr-grid-host">
            <ag-grid-angular
              style="width: 100%; height: 480px;"
              [theme]="theme.gridTheme()"
              [columnDefs]="columnDefs"
              [rowData]="rowData()"
              [gridOptions]="gridOptions"
              (gridReady)="onGridReady($event.api)"
              data-testid="toolbar-grid"
            />
          </div>
        </mat-card-content>
      </mat-card>

      <h2>API</h2>
      <div class="lgr-actions">
        <button mat-stroked-button (click)="resetQuickFilter()">Clear quick filter</button>
      </div>

      <h2>How it works</h2>
      <p>
        Register <code>ToolbarModule</code> and list items in the <code>toolbar</code> grid
        option. The quick filter drives <code>quickFilterText</code>, Find uses
        <code>&#64;libregrid/find</code>, and the Row Group / Pivot items embed the shared
        drop zones — so the toolbar composes from the same features as the side bar.
      </p>
    </div>
  `,
})
export class ToolbarDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = signal<Row[]>(makeRows(40));
  private api: GridApi | undefined;

  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', minWidth: 150 },
    { field: 'region', minWidth: 110 },
    { field: 'product', minWidth: 130 },
    { field: 'sales', type: 'numericColumn', minWidth: 110 },
  ];

  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1 },
    rowGroupPanelShow: 'always',
    pivotMode: false,
    toolbar: {
      alignment: 'left',
      items: [
        'agQuickFilterToolbarItem',
        'agFindToolbarItem',
        'separator',
        'agRowGroupPanelToolbarItem',
        'agPivotPanelToolbarItem',
        'separator',
        { label: 'Export CSV', icon: 'csvExport', action: (params: { api: GridApi }) => params.api.exportDataAsCsv() },
        { label: 'Toggle pivot', icon: 'pivotPanel', action: (params: { api: GridApi }) => params.api.setGridOption('pivotMode', !params.api.getGridOption('pivotMode')) },
      ],
    },
  } as never;

  onGridReady(gridApi: GridApi): void {
    this.api = gridApi;
  }

  resetQuickFilter(): void {
    this.api?.setGridOption('quickFilterText', undefined);
  }
}
