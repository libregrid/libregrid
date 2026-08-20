import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface Row {
  country: string;
  region: string;
  product: string;
  status: string;
  sales: number;
}

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Japan',
  'Brazil',
] as const;
const REGIONS: Record<string, string> = {
  'United States': 'Americas',
  'United Kingdom': 'Europe',
  Germany: 'Europe',
  France: 'Europe',
  Japan: 'Asia',
  Brazil: 'Americas',
};
const PRODUCTS = ['Widget', 'Gadget', 'Doohickey', 'Thingamabob'] as const;
const STATUSES = ['Draft', 'Pending', 'Approved'] as const;

function makeRows(): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < 40; i++) {
    const country = COUNTRIES[i % COUNTRIES.length]!;
    rows.push({
      country,
      region: REGIONS[country]!,
      product: PRODUCTS[i % PRODUCTS.length]!,
      status: STATUSES[i % STATUSES.length]!,
      sales: ((i * 7_919) % 10_000) + 100,
    });
  }
  return rows;
}

const ROWS = makeRows();

@Component({
  selector: 'lgr-filters-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule],
  template: `
    <div class="lgr-page">
      <h1>Filters</h1>
      <p>
        Every filter card offers a <strong>Simple Filter</strong> and a
        <strong>Selection Filter</strong> mode, and the panel shares serialisable models with the
        grid so a filter you build here can be passed straight to a server-side datasource.
      </p>

      <mat-card appearance="outlined">
        <mat-card-content>
          <div class="lgr-grid-host">
            <ag-grid-angular
              style="width: 100%; height: 100%;"
              [theme]="theme.gridTheme()"
              [columnDefs]="columnDefs"
              [rowData]="rowData"
              [gridOptions]="gridOptions"
              (gridReady)="onGridReady($event.api)"
              data-testid="filters-grid"
            />
          </div>
        </mat-card-content>
      </mat-card>

      <div class="lgr-actions">
        <button matButton="tonal" (click)="openFilters()">Open Filters panel</button>
      </div>

      <h2>Try it</h2>
      <p>
        Open the Filters panel and click <strong>Add Filter</strong> to pick a column from the
        type-ahead. Every card defaults to <strong>Simple Filter</strong> (operator + value, plus an
        AND/OR second condition once you type a value) and can switch to
        <strong>Selection Filter</strong> via its filter-type dropdown. Commit or discard with the
        pinned <strong>Apply</strong>/<strong>Cancel</strong> row.
      </p>
    </div>
  `,
})
export class FiltersDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = ROWS;
  private api: GridApi | undefined;

  protected readonly columnDefs: ColDef<Row>[] = [
    {
      field: 'country',
      filter: 'agSelectableColumnFilter',
      filterParams: {
        filters: [
          { name: 'Simple Filter', filter: 'agTextColumnFilter' },
          {
            name: 'Selection Filter',
            filter: 'agSetColumnFilter',
            filterParams: { values: COUNTRIES, buttons: ['apply', 'clear', 'cancel'] },
          },
        ],
      },
    },
    {
      field: 'region',
      filter: 'agSelectableColumnFilter',
      filterParams: {
        filters: [
          { name: 'Simple Filter', filter: 'agTextColumnFilter' },
          {
            name: 'Selection Filter',
            filter: 'agSetColumnFilter',
            filterParams: { values: ['Europe', 'Americas', 'Asia'] },
          },
        ],
      },
    },
    {
      field: 'product',
      filter: 'agSelectableColumnFilter',
      filterParams: {
        filters: [
          { name: 'Simple Filter', filter: 'agTextColumnFilter' },
          {
            name: 'Selection Filter',
            filter: 'agSetColumnFilter',
            filterParams: { values: PRODUCTS },
          },
        ],
      },
    },
    {
      field: 'status',
      filter: 'agSelectableColumnFilter',
      filterParams: {
        filters: [
          { name: 'Simple Filter', filter: 'agTextColumnFilter' },
          {
            name: 'Selection Filter',
            filter: 'agSetColumnFilter',
            filterParams: { values: STATUSES },
          },
        ],
      },
    },
    {
      field: 'sales',
      filter: 'agNumberColumnFilter',
      type: 'numericColumn',
      suppressFiltersToolPanel: true,
    },
  ];

  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { flex: 1, filter: true, sortable: true },
    sideBar: { toolPanels: ['filters'], defaultToolPanel: 'filters' },
  };

  onGridReady(api: GridApi): void {
    this.api = api;
  }

  openFilters(): void {
    this.api?.openToolPanel('filters');
  }
}
