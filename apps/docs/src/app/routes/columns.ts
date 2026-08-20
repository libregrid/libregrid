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
  sales: number;
  units: number;
  internalId: number;
}

const COUNTRIES = ['United States', 'France', 'Japan', 'Brazil', 'Germany'] as const;
const REGIONS = ['North', 'South', 'East', 'West'] as const;
const PRODUCTS = ['Widget', 'Gadget', 'Doohickey'] as const;

function makeRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    country: COUNTRIES[index % COUNTRIES.length]!,
    region: REGIONS[index % REGIONS.length]!,
    product: PRODUCTS[index % PRODUCTS.length]!,
    sales: ((index * 7_919) % 10_000) + 100,
    units: ((index * 31) % 50) + 1,
    internalId: index,
  }));
}

@Component({
  selector: 'lgr-columns-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule],
  styles: `
    .lgr-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
  `,
  template: `
    <div class="lgr-page">
      <h1>Columns</h1>
      <p>
        The Columns tool panel synchronizes visibility, row groups, and value
        columns through the grid's public column APIs, including functional
        pivot controls.
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
              data-testid="columns-grid"
            />
          </div>
        </mat-card-content>
      </mat-card>

      <div class="lgr-actions">
        <button mat-stroked-button (click)="openColumns()">Open Columns panel</button>
        <button mat-stroked-button (click)="openChooser()">Open column chooser</button>
        <button mat-stroked-button (click)="closeChooser()">Close column chooser</button>
      </div>

      <h2>How it works</h2>
      <p>
        <code>&#64;libregrid/columns-tool-panel</code> registers the standard
        <code>columns</code> tool panel with the side bar. The
        chooser uses that same panel implementation through
        <code>api.showColumnChooser()</code>.
      </p>
      <p>
        Use the checkboxes to change visibility. The Row Groups and Values
        sections offer buttons as a keyboard-accessible alternative to drag and
        drop. The <strong>Column Labels (Pivot)</strong> and
        <strong>Pivot Mode</strong> sections change the live pivot model.
      </p>
    </div>
  `,
})
export class ColumnsDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = makeRows(50);
  private api: GridApi | undefined;

  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country', enableRowGroup: true, minWidth: 160 },
    { field: 'region', enableRowGroup: true, enablePivot: true, minWidth: 110 },
    { field: 'product', minWidth: 130 },
    { field: 'sales', enableValue: true, type: 'numericColumn', minWidth: 110 },
    { field: 'units', enableValue: true, type: 'numericColumn', minWidth: 100 },
    { field: 'internalId', hide: true, suppressColumnsToolPanel: true },
  ];

  protected readonly gridOptions: GridOptions<Row> = {
    defaultColDef: { flex: 1, filter: true, resizable: true, sortable: true },
    sideBar: { toolPanels: ['columns'], defaultToolPanel: 'columns' },
    rowGroupPanelShow: 'onlyWhenGrouping',
  };

  onGridReady(api: GridApi): void {
    this.api = api;
  }

  openColumns(): void {
    this.api?.openToolPanel('columns');
  }

  openChooser(): void {
    this.api?.showColumnChooser();
  }

  closeChooser(): void {
    this.api?.hideColumnChooser();
  }
}
