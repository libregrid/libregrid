// Browser-only mock data. Reloading loses changes. In production, replace the mock
// with an authenticated service that validates and authorises reads and writes.
import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { type GridOptions } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Row {
  product: string;
  price: number;
  quantity: number;
  subtotal: number | string;
}

@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  private readonly discountStore = new Map<string, string>([
    ['row-Bananas-discount', '=C1 * 0.05'],
    ['row-Apples-discount', '=C2 * 0.05'],
    ['row-Cherries-discount', '=C3 * 0.05'],
    ['row-Dates-discount', '=C4 * 0.05'],
    ['row-Elderberries-discount', '=C5 * 0.05'],
  ]);
  protected gridOptions: GridOptions<Row> = {
    columnDefs: [
      { field: 'product' },
      { field: 'price' },
      { field: 'quantity' },
      {
        colId: 'subtotal',
        headerName: 'Subtotal',
        field: 'subtotal',
        allowFormula: true,
        editable: true,
        cellEditorParams: { validateFormulas: true },
      },
      {
        colId: 'discount',
        headerName: 'Discount',
        allowFormula: true,
        cellDataType: 'number',
      },
    ],
    rowData: [
      {
        product: 'Bananas',
        price: 10,
        quantity: 5,
        subtotal: '=B1*C1',
      },
      {
        product: 'Apples',
        price: 47.3,
        quantity: 16,
        subtotal: '=B2*C2',
      },
      {
        product: 'Cherries',
        price: 84.6,
        quantity: 27,
        subtotal: '=B3*C3',
      },
      {
        product: 'Dates',
        price: 31.9,
        quantity: 38,
        subtotal: '=B4*C4',
      },
      {
        product: 'Elderberries',
        price: 69.2,
        quantity: 9,
        subtotal: '=B5*C5',
      },
    ],
    getRowId: (params) => `row-${params.data.product}`,
    formulaDataSource: {
      getFormula: ({ column, rowNode }) =>
        this.discountStore.get(`${rowNode.id}-${column.getColId()}`),
      setFormula: ({ column, rowNode, formula }) => {
        const key = `${rowNode.id}-${column.getColId()}`;
        if (formula === undefined) this.discountStore.delete(key);
        else this.discountStore.set(key, formula);
      },
    },
    formulaFuncs: {
      MARKUP: {
        func: (params: { values: Iterable<unknown> }) => {
          const values = [...params.values];
          const base = values[0];
          return typeof base === 'number' ? base * 1.2 : base;
        },
      },
    },
    cellSelection: { handle: { mode: 'fill' } },
  };
}
