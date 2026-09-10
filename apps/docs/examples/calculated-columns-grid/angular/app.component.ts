import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  type CalculatedColumnExpressionChangedEvent,
  type CalculatedColumnValidationStateChangedEvent,
  type GridOptions,
} from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Row {
  product: string;
  revenue: number;
  cost: number;
  units: number;
}

@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
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
    rowData: [
      {
        product: 'Widget',
        revenue: 1000,
        cost: 400,
        units: 12,
      },
      {
        product: 'Gadget',
        revenue: 2723,
        cost: 1319,
        units: 19,
      },
      {
        product: 'Gizmo',
        revenue: 4446,
        cost: 2238,
        units: 26,
      },
      {
        product: 'Doohickey',
        revenue: 6169,
        cost: 3157,
        units: 33,
      },
      {
        product: 'Thingamajig',
        revenue: 7892,
        cost: 4076,
        units: 40,
      },
    ],
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
      api.addEventListener(
        'calculatedColumnExpressionChanged',
        (event: CalculatedColumnExpressionChangedEvent) => {
          this.pushEvent(
            `calculatedColumnExpressionChanged: [${event.column.getColId()}] "${event.oldExpression}" → "${event.expression}"`,
          );
        },
      );
      api.addEventListener(
        'calculatedColumnValidationStateChanged',
        (event: CalculatedColumnValidationStateChangedEvent) => {
          this.pushEvent(
            `calculatedColumnValidationStateChanged: [${event.column.getColId()}] ${event.valid ? 'valid' : `invalid (${event.reason ?? 'unknown'})`}`,
          );
        },
      );
    },
  };
  private pushEvent(entry: string): void {
    this.log.update((entries) => [...entries, entry].slice(-8));
  }
}
