import { ChangeDetectionStrategy, Component, inject, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridOptions, IServerSideDatasource, GridApi, IServerSideGetRowsParams } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import type {
  ServerSideSelectionProvider,
  SelectionOp,
  SelectionSpec,
} from '@libregrid/server-side-selection';

interface Trade {
  id: string;
  desk: string;
  instrument: string;
  quantity: number;
}

const DESKS = ['Equities', 'Fixed Income', 'Commodities', 'FX'] as const;
const INSTRUMENTS = ['Alpha', 'Beta', 'Gamma', 'Delta'] as const;

const ROW_COUNT = 10_000;
const BLOCK_SIZE = 100;
const LOAD_LATENCY_MS = 10;

function tradeAt(index: number): Trade {
  return {
    id: `trade-${index + 1}`,
    desk: DESKS[index % DESKS.length]!,
    instrument: INSTRUMENTS[index % INSTRUMENTS.length]!,
    quantity: ((index * 7919) % 10_000) + 1,
  };
}

const ALL_ROWS: Trade[] = Array.from({ length: ROW_COUNT }, (_, i) => tradeAt(i));

/**
 * A tiny in-memory implementation of the `ServerSideSelectionProvider`
 * contract, flat (no groups) so the demo focuses on the spec lifecycle:
 * terms accumulate, exceptions override, and the selection view becomes the
 * dataset.
 */
function createDemoProvider() {
  let allTerm = false;
  const additions = new Set<string>();
  const exceptions = new Set<string>();

  const selected = (id: string): boolean =>
    (allTerm || additions.has(id)) && !exceptions.has(id);

  const provider: ServerSideSelectionProvider = {
    async getSpec(): Promise<SelectionSpec> {
      const terms: SelectionSpec['terms'] = [];
      if (allTerm) terms.push({ type: 'all', filter: {} });
      return { terms, selectedCount: ALL_ROWS.filter((row) => selected(row.id)).length };
    },
    async applyOps(params: {
      gridId: string;
      tabId: string;
      ops: SelectionOp[];
    }): Promise<void> {
      for (const op of params.ops) {
        switch (op.op) {
          case 'selectAll':
            allTerm = true;
            exceptions.clear();
            break;
          case 'deselectAll':
            allTerm = false;
            additions.clear();
            exceptions.clear();
            break;
          case 'select':
            for (const id of op.ids) {
              exceptions.delete(id);
              additions.add(id);
            }
            break;
          case 'deselect':
            for (const id of op.ids) {
              additions.delete(id);
              exceptions.add(id);
            }
            break;
        }
      }
    },
    async resolveSelected(params: {
      gridId: string;
      tabId: string;
      rowIds: string[];
      groupRoutes: string[];
    }): Promise<Record<string, boolean>> {
      const result: Record<string, boolean> = {};
      for (const id of params.rowIds) result[id] = selected(id);
      return result;
    },
  };

  return {
    provider,
    isRowSelected: selected,
    selectedRows(): Trade[] {
      return ALL_ROWS.filter((row) => selected(row.id));
    },
  };
}

/** Phase 16 — server-side selection for SSRM, with a footer and the R6 selection view. */
@Component({
  selector: 'lgr-server-side-selection-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule, RouterLink],
  template: `
    <div class="lgr-page">
      <h1>Server-Side Selection</h1>
      <p>
        This grid uses <code>rowModelType: 'serverSide'</code> with
        <code>@libregrid/server-side-selection</code>. The durable selection lives in a
        (here, in-memory) provider; the grid only keeps per-row flags for the rows in its
        datasource cache. Select rows with the checkboxes, use the footer's
        <strong>Select All</strong> / <strong>Deselect All</strong> for the whole spec, and
        <strong>Show All Selected</strong> to make the selection the dataset (R6).
      </p>

      <mat-card appearance="outlined">
        <mat-card-content>
          <div class="lgr-grid-host">
            <ag-grid-angular
              style="width: 100%; height: 100%;"
              [theme]="theme.gridTheme()"
              [columnDefs]="columnDefs"
              [gridOptions]="gridOptions"
              (gridReady)="onGridReady($event)"
              data-testid="ssrm-selection-grid"
            />
          </div>
          <div #footerHost class="lgr-ssrm-selection-footer-host" data-testid="ssrm-selection-footer-host"></div>
        </mat-card-content>
      </mat-card>

      <h2>What's supported</h2>
      <p>
        Terms accumulate (R1), survive filter changes (R2), and exceptions override terms
        (R3). <em>Select All (filtered)</em> clears the in-scope exceptions then appends the
        term (R4); groups are atomic (R5). <em>Show All Selected</em> switches the datasource
        to <code>selected(spec) ∧ filterModel</code> without touching your filters (R6), and the
        header checkbox stays viewport-only (R7). Selection state is re-resolved from the
        provider whenever a block is evicted and requested again.
      </p>
      <p>
        Grouping, sorting, filtering, and pivot request semantics are covered in the
        <a routerLink="/server-side-advanced">advanced SSRM demo</a>.
      </p>
    </div>
  `,
})
export class ServerSideSelectionDemo {
  protected readonly theme = inject(LibreGridThemeService);
  @ViewChild('footerHost', { static: false }) protected footerHost!: ElementRef<HTMLElement>;

  private readonly demo = createDemoProvider();
  private gridApi: GridApi<Trade> | undefined;

  protected readonly columnDefs: ColDef<Trade>[] = [
    // No `checkboxSelection: true` — the new row-selection API already renders
    // one row checkbox in the first column; a column-level checkbox would be a
    // redundant second control for the same selection.
    { field: 'id', minWidth: 120 },
    { field: 'desk', minWidth: 160 },
    { field: 'instrument', minWidth: 140 },
    { field: 'quantity', type: 'numericColumn', minWidth: 130 },
  ];

  protected readonly gridOptions: GridOptions<Trade> = {
    rowModelType: 'serverSide',
    cacheBlockSize: BLOCK_SIZE,
    maxBlocksInCache: 10,
    serverSideInitialRowCount: ROW_COUNT,
    rowSelection: { mode: 'multiRow', selectAll: 'currentPage' },
    pagination: true,
    paginationPageSize: BLOCK_SIZE,
    paginationPageSizeSelector: [50, BLOCK_SIZE, 250],
    defaultColDef: { sortable: true, resizable: true, flex: 1 },
    getRowId: (params) => params.data.id,
    serverSideDatasource: this.datasource(),
    ssrmSelection: {
      provider: this.demo.provider,
      tabId: 'docs-server-side-selection',
      onReady: (svc) => {
        if (this.footerHost) {
          svc.attachFooter(this.footerHost.nativeElement);
        }
      },
    },
  };

  protected onGridReady(event: { api: GridApi<Trade> }): void {
    this.gridApi = event.api;
  }

  private datasource(): IServerSideDatasource<Trade> {
    return {
      getRows: (params: IServerSideGetRowsParams<Trade>) => {
        const viewActive = !!this.gridApi?.getGridOption('ssrmSelectionViewActive');
        const start = params.request.startRow ?? 0;
        let end = Math.min(params.request.endRow ?? ROW_COUNT, ROW_COUNT);
        if (viewActive) {
          // R6: the selection IS the dataset; filters still apply on top.
          const rows = this.demo.selectedRows();
          params.success({ rowData: rows.slice(start, end), rowCount: rows.length });
          return;
        }
        const rowData = Array.from({ length: Math.max(0, end - start) }, (_, offset) =>
          tradeAt(start + offset),
        );
        window.setTimeout(() => params.success({ rowData, rowCount: ROW_COUNT }), LOAD_LATENCY_MS);
      },
    };
  }
}
