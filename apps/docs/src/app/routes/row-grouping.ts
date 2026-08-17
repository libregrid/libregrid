import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridOptions } from 'ag-grid-community';

import { LibreGridThemeService } from '@libregrid/material';

interface Row {
  country: string;
  city: string;
  product: string;
  sales: number;
}

const COUNTRIES = ['United States', 'France', 'Japan', 'Brazil', 'Germany'] as const;
const CITIES: Record<string, string[]> = {
  'United States': ['New York', 'Los Angeles', 'Chicago'],
  France: ['Paris', 'Lyon', 'Marseille'],
  Japan: ['Tokyo', 'Osaka', 'Kyoto'],
  Brazil: ['São Paulo', 'Rio de Janeiro', 'Brasília'],
  Germany: ['Berlin', 'Munich', 'Hamburg'],
};
const PRODUCTS = ['Widget', 'Gadget', 'Doohickey'] as const;

function makeRows(n: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) {
    const country = COUNTRIES[i % COUNTRIES.length]!;
    const cityPool = CITIES[country]!;
    rows.push({
      country,
      city: cityPool[i % cityPool.length]!,
      product: PRODUCTS[i % PRODUCTS.length]!,
      sales: Math.round(((i * 7919) % 10000) + 100),
    });
  }
  return rows;
}

@Component({
  selector: 'lgr-row-grouping',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule],
  template: `
    <div class="lgr-page">
      <h1>Row Grouping</h1>
      <p>
        Data is grouped by <strong>country</strong>
        (and <strong>city</strong> when expanded) via
        <code>rowGroup: true</code> on the column definition.
      </p>

      <mat-card appearance="outlined">
        <mat-card-content>
          <div class="lgr-grid-host">
            <ag-grid-angular
              style="width: 100%; height: 500px;"
              [theme]="theme.gridTheme()"
              [columnDefs]="columnDefs"
              [rowData]="rowData"
              [gridOptions]="gridOptions"
              data-testid="row-grouping-grid"
            />
          </div>
        </mat-card-content>
      </mat-card>

      <h2>How it works</h2>
      <p>
        Register <code>&#64;libregrid/row-grouping</code> and set
        <code>rowGroup: true</code> on a column — the rest is automatic. Click the
        chevron (or press <kbd>&#8629;</kbd>) to expand and collapse groups.
      </p>
      <p>
        Aggregation uses the same <code>aggFunc</code> options you already know
        (<code>sum</code>, <code>min</code>, <code>max</code>, <code>count</code>,
        <code>avg</code>, <code>first</code>, <code>last</code>). The
        <code>sales</code> column aggregates with <code>aggFunc: 'sum'</code>, and
        a <strong>Total</strong> row appears at the bottom of every group
        (<code>groupTotalRow: 'bottom'</code>) plus a grand total at the very bottom
        (<code>grandTotalRow: 'bottom'</code>).
      </p>
      <p>
        The trailing <strong>% of Total</strong> column reads the same
        <code>sales</code> field with
        <code>showValuesAs: 'percentOfGrandTotal'</code>, turning each cell into a
        share of the grid-wide total independently of the column next to it.
      </p>
    </div>
  `,
})
export class RowGroupingDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = makeRows(50);

  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', rowGroup: true },
    { field: 'city', rowGroup: true },
    { field: 'product', minWidth: 140 },
    { field: 'sales', aggFunc: 'sum', sort: 'desc', type: 'numericColumn', minWidth: 120 },
    {
      field: 'sales',
      colId: 'salesShare',
      headerName: '% of Total',
      showValuesAs: 'percentOfGrandTotal',
      type: 'numericColumn',
      minWidth: 120,
      valueFormatter: (params) => (params.value == null ? '' : `${(Number(params.value) * 100).toFixed(1)}%`),
    },
  ];

  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { flex: 1, minWidth: 120 },
    groupDefaultExpanded: 1,
    autoGroupColumnDef: { headerName: 'Location', minWidth: 240 },
    groupTotalRow: 'bottom',
    grandTotalRow: 'bottom',
    suppressAggFuncInHeader: true,
  };
}
