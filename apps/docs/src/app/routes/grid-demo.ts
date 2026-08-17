import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridOptions } from 'ag-grid-community';

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
  selector: 'lgr-grid-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule, RouterLink],
  template: `
    <div class="lgr-page">
      <h1>Grid (Community)</h1>
      <p>
        A stock <code>ag-grid-community</code> grid — no fork, no wrapper. Change the
        color theme or density from the palette button in the toolbar and watch this grid
        restyle from the same Material tokens as the rest of the site, with no reload.
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
              data-testid="demo-grid"
            />
          </div>
        </mat-card-content>
      </mat-card>

      <h2>What you're looking at</h2>
      <p>
        Sort and filter any column, resize and reorder columns, and select rows.
        Every LibreGrid feature — grouping, pivot, charts, server-side rows, and the rest —
        plugs into this same grid instance, so the demos in the sidebar are exactly what
        you'd get in your own app.
      </p>
      <p>
        Try <a routerLink="/row-grouping">row grouping</a> or the
        <a routerLink="/menus">context and column menus</a> next.
      </p>
    </div>
  `,
})
export class GridDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = signal<Row[]>(makeRows(200));

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
  };
}
