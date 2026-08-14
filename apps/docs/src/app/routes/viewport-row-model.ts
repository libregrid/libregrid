import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridOptions, IViewportDatasource, IViewportDatasourceParams } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface Quote { id: string; symbol: string; price: number; updatedAt: string; }

/** A streaming datasource only pushes rows inside the range requested by the Viewport Row Model. */
@Component({
  selector: 'lgr-viewport-row-model-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule],
  template: `
    <div class="lgr-page"><h1>Viewport Row Model</h1>
      <p>This model is for live feeds: the grid reports its buffered visible range and the datasource pushes updates for those absolute row indices. It does not issue SSRM requests or retain an unbounded client cache.</p>
      <mat-card appearance="outlined"><mat-card-content><ag-grid-angular style="width:100%;height:520px" [theme]="theme.gridTheme()" [columnDefs]="columnDefs" [gridOptions]="gridOptions" data-testid="viewport-grid" /></mat-card-content></mat-card>
    </div>
  `,
})
export class ViewportRowModelDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly columnDefs: ColDef<Quote>[] = [{ field: 'id' }, { field: 'symbol' }, { field: 'price' }, { field: 'updatedAt' }];
  protected readonly gridOptions: GridOptions<Quote> = { rowModelType: 'viewport', viewportRowModelPageSize: 20, viewportRowModelBufferSize: 10, defaultColDef: { flex: 1, minWidth: 120 }, getRowId: ({ data }) => data.id, viewportDatasource: this.datasource() };
  private datasource(): IViewportDatasource {
    let timer: number | undefined;
    let params: IViewportDatasourceParams<Quote> | undefined;
    const quote = (index: number): Quote => ({ id: `quote-${index}`, symbol: ['LGR', 'GRID', 'FLOW'][index % 3]!, price: 100 + ((index * 13 + Date.now() / 1000) % 50), updatedAt: new Date().toLocaleTimeString() });
    return {
      init: (initParams) => { params = initParams; initParams.setRowCount(2_000); timer = window.setInterval(() => params?.setRowData(Object.fromEntries(Array.from({ length: 30 }, (_, offset) => [offset, quote(offset)]))), 750); },
      setViewportRange: (first, last) => params?.setRowData(Object.fromEntries(Array.from({ length: last - first + 1 }, (_, offset) => [first + offset, quote(first + offset)]))),
      destroy: () => { if (timer) window.clearInterval(timer); },
    };
  }
}
