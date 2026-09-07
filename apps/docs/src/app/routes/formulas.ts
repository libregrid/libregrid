import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import { type GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import { DocsFeaturePageComponent } from '../docs';

interface Row {
  product: string;
  price: number;
  quantity: number;
  subtotal: number | string;
}

const PRODUCTS = ['Bananas', 'Apples', 'Cherries', 'Dates', 'Elderberries'] as const;

function makeRows(): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < PRODUCTS.length; i++) {
    rows.push({
      product: PRODUCTS[i]!,
      price: Math.round(((i * 373) % 900) + 100) / 10,
      quantity: ((i * 11) % 40) + 5,
      subtotal: `=B${i + 1}*C${i + 1}`,
    });
  }
  return rows;
}

@Component({
  selector: 'lgr-formulas-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule, DocsFeaturePageComponent],
  styles: `
    .lgr-formula-log {
      margin: 8px 0 24px;
      padding-left: 20px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      color: light-dark(#3d3d3d, #e0e0e0);
    }
    .lgr-formula-log-empty {
      list-style: none;
      margin-left: -20px;
      font-style: italic;
      color: light-dark(#5a5759, #b8b5b9);
    }
  `,
  template: `
    <lgr-docs-feature-page path="formulas">
      <p>
        Formulas are spreadsheet-style expressions typed into cells. The
        <strong>Subtotal</strong> column holds <code>=B1*C1</code>-style
        formulas — double-click a subtotal cell to edit it in the tokenising
        formula editor (function autocomplete included; live validation is on
        for the Tax column). Drag the fill handle of a subtotal cell down and
        watch relative references shift. <code>markup</code> demonstrates a
        custom function registered through <code>formulaFuncs</code>, and the
        <strong>Discount</strong> column reads its formula from an external
        <code>formulaDataSource</code> store.
      </p>
      <ag-grid-angular
        [theme]="theme.gridTheme()"
        [gridOptions]="gridOptions"
        class="ag-theme-quartz"
        style="height: 360px; width: 100%"
      />
      <h2>How it works</h2>
      <ul class="lgr-formula-log">
        <li>Columns with <code>allowFormula: true</code> resolve <code>=…</code> cell values through the formula engine.</li>
        <li>References use A1 notation (<code>B2</code>, <code>$A$1</code>); ranges look like <code>A1:B10</code>.</li>
        <li>Stored formulas use a long-hand col/row-ID form so references survive row and column moves.</li>
        <li>Custom functions: <code>formulaFuncs: &#123; MARKUP: &#123; func: (params) => … &#125; &#125;</code>.</li>
      </ul>
    </lgr-docs-feature-page>
  `,
})
export class FormulasDemo {
  protected readonly theme = inject(LibreGridThemeService);

  // External formula store for the Discount column (formulas without a field).
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
    rowData: makeRows(),
    getRowId: (params) => `row-${params.data.product}`,
    formulaDataSource: {
      getFormula: ({ column, rowNode }) => this.discountStore.get(`${rowNode.id}-${column.getColId()}`),
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
