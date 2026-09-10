// Browser-only mock data. Reloading loses changes. In production, replace the mock
// with an authenticated service that validates and authorises reads and writes.
import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type {
  ColDef,
  GridOptions,
  IViewportDatasource,
  IViewportDatasourceParams,
} from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Quote {
  id: string;
  symbol: string;
  price: number;
  updatedAt: string;
}
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly columnDefs: ColDef<Quote>[] = [
    { field: 'id' },
    { field: 'symbol' },
    { field: 'price', type: 'numericColumn' },
    { field: 'updatedAt' },
  ];
  protected readonly gridOptions: GridOptions<Quote> = {
    rowModelType: 'viewport',
    viewportRowModelPageSize: 20,
    viewportRowModelBufferSize: 10,
    defaultColDef: { flex: 1, minWidth: 120 },
    getRowId: ({ data }) => data.id,
    viewportDatasource: this.datasource(),
  };
  private datasource(): IViewportDatasource {
    let timer: number | undefined;
    let params: IViewportDatasourceParams<Quote> | undefined;
    const quote = (index: number): Quote => ({
      id: `quote-${index}`,
      symbol: ['LGR', 'GRID', 'FLOW'][index % 3]!,
      price: 100 + ((index * 13 + Date.now() / 1000) % 50),
      updatedAt: new Date().toLocaleTimeString(),
    });
    return {
      init: (initParams) => {
        params = initParams;
        initParams.setRowCount(2_000);
        timer = window.setInterval(
          () =>
            params?.setRowData(
              Object.fromEntries(
                Array.from({ length: 30 }, (_, offset) => [offset, quote(offset)]),
              ),
            ),
          750,
        );
      },
      setViewportRange: (first, last) =>
        params?.setRowData(
          Object.fromEntries(
            Array.from({ length: last - first + 1 }, (_, offset) => [
              first + offset,
              quote(first + offset),
            ]),
          ),
        ),
      destroy: () => {
        if (timer) window.clearInterval(timer);
      },
    };
  }
}
