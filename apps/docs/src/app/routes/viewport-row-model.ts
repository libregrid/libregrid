import { DocsDemoComponent } from '../docs/docs-demo';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridOptions, IViewportDatasource, IViewportDatasourceParams } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import { DocsFeaturePageComponent } from '../docs';

interface Quote { id: string; symbol: string; price: number; updatedAt: string; }

/** A streaming datasource only pushes rows inside the range requested by the Viewport Row Model. */
@Component({
  selector: 'lgr-viewport-row-model-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocsDemoComponent, AgGridAngular, MatCardModule, DocsFeaturePageComponent],
  template: `
    <lgr-docs-feature-page path="viewport">
      <p>The grid only holds the rows on screen; everything else arrives as live updates from your system. Scroll and watch — the feed stays fresh without loading the full dataset.</p>
      <lgr-docs-demo demoId="viewport-grid">
<mat-card appearance="outlined"><mat-card-content><ag-grid-angular style="width:100%;height:520px" [theme]="theme.gridTheme()" [columnDefs]="columnDefs" [gridOptions]="gridOptions" data-testid="viewport-grid" /></mat-card-content></mat-card>
</lgr-docs-demo>
    </lgr-docs-feature-page>
  `,
})
export class ViewportRowModelDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly columnDefs: ColDef<Quote>[] = [{ field: 'id' }, { field: 'symbol' }, { field: 'price', type: 'numericColumn' }, { field: 'updatedAt' }];
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
