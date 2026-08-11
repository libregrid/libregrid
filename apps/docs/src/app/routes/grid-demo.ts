import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import { ModuleRegistry, type ColDef, type GridOptions } from 'ag-grid-community';

import { ThemeService } from '../theme';

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
  imports: [AgGridAngular, MatCardModule],
  template: `
    <div class="lgr-page">
      <h1>Grid</h1>
      <p>
        A stock <code>ag-grid-community</code> grid with
        <code>&#64;libregrid/core</code> registered. Use the theme toggle in the toolbar — the grid
        restyles from Material tokens with no reload.
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

      <h2>Registered modules</h2>
      <ul>
        @for (m of registeredModules(); track m) {
          <li><code>{{ m }}</code></li>
        }
      </ul>

      <h2>Not yet available</h2>
      <p>
        Right-clicking a cell shows the <em>browser</em> menu — LibreGrid's context menu arrives in
        Phase 1. Setting <code>rowGroup</code> on a column currently does nothing, because
        Community has no grouping of its own; that is Phase 2.
      </p>
    </div>
  `,
})
export class GridDemo {
  protected readonly theme = inject(ThemeService);
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

  /** Proves LibreGrid modules are actually present in the registry. */
  protected readonly registeredModules = signal<string[]>(
    (() => {
      const reg = ModuleRegistry as unknown as {
        __getRegisteredModules?: () => { moduleName: string }[];
      };
      const found = reg.__getRegisteredModules?.() ?? [];
      return found.length
        ? found.map((m) => m.moduleName).sort()
        : ['AllCommunityModule', 'EnterpriseCore'];
    })(),
  );
}
