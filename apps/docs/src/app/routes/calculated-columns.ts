import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import {
  ModuleRegistry,
  type CalculatedColumnExpressionChangedEvent,
  type CalculatedColumnValidationStateChangedEvent,
  type GridOptions,
} from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ColumnMenuModule, ContextMenuModule } from '@libregrid/menu';
import { CalculatedColumnsModule } from '@libregrid/calculated-columns';
import { LibreGridThemeService } from '@libregrid/material';

ModuleRegistry.registerModules([AllCommunityModule, ColumnMenuModule, ContextMenuModule, CalculatedColumnsModule]);

interface Row {
  product: string;
  revenue: number;
  cost: number;
  units: number;
}

const PRODUCTS = ['Widget', 'Gadget', 'Gizmo', 'Doohickey', 'Thingamajig'] as const;

function makeRows(): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < PRODUCTS.length; i++) {
    rows.push({
      product: PRODUCTS[i]!,
      revenue: Math.round(((i * 1723) % 9000) + 1000),
      cost: Math.round(((i * 919) % 4000) + 400),
      units: ((i * 7) % 60) + 12,
    });
  }
  return rows;
}

@Component({
  selector: 'lgr-calculated-columns-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule],
  styles: `
    .lgr-calc-log {
      margin: 8px 0 24px;
      padding-left: 20px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      color: light-dark(#3d3d3d, #e0e0e0);
    }
    .lgr-calc-log-empty {
      list-style: none;
      margin-left: -20px;
      font-style: italic;
      color: light-dark(#5a5759, #b8b5b9);
    }
  `,
  template: `
    <div class="lgr-page">
      <h1>Calculated Columns</h1>
      <p>
        Calculated columns are read-only, derived values that are not stored in
        row data. <strong>Profit</strong> and <strong>Unit Price</strong> below
        are declared in code; open the header menu on any column and choose
        <strong>Add Calculated Column</strong> to create one live — the dialog
        offers column, function and operator pickers plus autocomplete.
        Calculated columns are always read-only: Community's edit and paste
        paths refuse them.
      </p>
      <ag-grid-angular
        [theme]="theme.gridTheme()"
        [gridOptions]="gridOptions"
        class="ag-theme-quartz"
        style="height: 360px; width: 100%"
      />
      <h2>Events</h2>
      @if (log().length === 0) {
        <ul class="lgr-calc-log lgr-calc-log-empty"><li>No events yet — add or edit a calculated column.</li></ul>
      } @else {
        <ul class="lgr-calc-log">
          @for (entry of log(); track $index) {
            <li>{{ entry }}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class CalculatedColumnsDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly log = signal<string[]>([]);

  protected gridOptions: GridOptions<Row> = {
    columnDefs: [
      { field: 'product' },
      { field: 'revenue' },
      { field: 'cost' },
      { field: 'units' },
      {
        colId: 'profit',
        headerName: 'Profit',
        calculatedExpression: '[revenue] - [cost]',
        cellDataType: 'number',
        aggFunc: 'sum',
        sortable: true,
        filter: true,
      },
      {
        colId: 'unitPrice',
        headerName: 'Unit Price',
        calculatedExpression: 'IF([units] > 0, [revenue] / [units], 0)',
        cellDataType: 'number',
      },
    ],
    rowData: makeRows(),
    calculatedColumns: true,
    getRowId: (params) => `row-${params.data.product}`,
    onGridReady: (params) => {
      const api = params.api;
      this.pushEvent('grid ready — open a header menu to add a calculated column');
      api.addEventListener('calculatedColumnCreated', (event) => {
        this.pushEvent(`calculatedColumnCreated: [${event.column.getColId()}]`);
      });
      api.addEventListener('calculatedColumnRemoved', (event) => {
        this.pushEvent(`calculatedColumnRemoved: [${event.column.getColId()}]`);
      });
      api.addEventListener('calculatedColumnExpressionChanged', (event: CalculatedColumnExpressionChangedEvent) => {
        this.pushEvent(`calculatedColumnExpressionChanged: [${event.column.getColId()}] "${event.oldExpression}" → "${event.expression}"`);
      });
      api.addEventListener('calculatedColumnValidationStateChanged', (event: CalculatedColumnValidationStateChangedEvent) => {
        this.pushEvent(
          `calculatedColumnValidationStateChanged: [${event.column.getColId()}] ${event.valid ? 'valid' : `invalid (${event.reason ?? 'unknown'})`}`,
        );
      });
    },
  };

  private pushEvent(entry: string): void {
    this.log.update((entries) => [...entries, entry].slice(-8));
  }
}
