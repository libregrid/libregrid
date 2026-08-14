import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface Row { country: string; region: string; product: string; sales: number; }
const rows: Row[] = [
  { country: 'United Kingdom', region: 'Europe', product: 'Widget', sales: 120 },
  { country: 'United States', region: 'Americas', product: 'Gadget', sales: 240 },
  { country: 'Germany', region: 'Europe', product: 'Widget', sales: 180 },
  { country: 'Japan', region: 'Asia', product: 'Doohickey', sales: 300 },
];

@Component({
  selector: 'lgr-filters-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule],
  template: `
    <div class="lgr-page">
      <h1>Filters</h1>
      <p>Set Filter, Multi Filter, and the v34-compatible Filters Tool Panel share serialisable models that can be passed to a server-side datasource in Phase 9.</p>
      <mat-card appearance="outlined"><mat-card-content><div class="lgr-grid-host">
        <ag-grid-angular style="width:100%;height:480px" [theme]="theme.gridTheme()" [columnDefs]="columnDefs" [rowData]="rowData" [gridOptions]="gridOptions" (gridReady)="onGridReady($event.api)" data-testid="filters-grid" />
      </div></mat-card-content></mat-card>
      <p><button mat-stroked-button (click)="openFilters()">Open Filters panel</button></p>
      <h2>Try it</h2>
      <p>Use Country’s checkbox Set Filter, then open the panel to search, expand cards, and stage global Clear/Apply actions. Region demonstrates Multi Filter’s accordion composition.</p>
    </div>
  `,
})
export class FiltersDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = rows;
  private api: GridApi | undefined;
  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', filter: 'agSetColumnFilter', filterParams: { values: rows.map((row) => row.country), buttons: ['apply', 'clear', 'cancel'] } },
    { field: 'region', filter: 'agMultiColumnFilter', filterParams: { filters: [{ title: 'Contains', filter: 'agTextColumnFilter', display: 'accordion' }, { title: 'Allowed regions', filter: 'agSetColumnFilter', display: 'subMenu', filterParams: { values: ['Europe', 'Americas', 'Asia'] } }] } },
    { field: 'product', filter: 'agSetColumnFilter' },
    { field: 'sales', filter: 'agNumberColumnFilter', suppressFiltersToolPanel: true },
  ];
  protected readonly gridOptions: GridOptions<Row> = { defaultColDef: { flex: 1, filter: true, sortable: true }, sideBar: { toolPanels: ['filters'], defaultToolPanel: 'filters' } };
  onGridReady(api: GridApi): void { this.api = api; }
  openFilters(): void { this.api?.openToolPanel('filters'); }
}
