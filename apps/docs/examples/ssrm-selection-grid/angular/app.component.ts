// Browser-only mock data. Reloading loses changes. In production, replace the mock
// with an authenticated service that validates and authorises reads and writes.
import type { ElementRef } from '@angular/core';
import { Component, ViewChild } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type {
  ColDef,
  FilterModel,
  GridOptions,
  IServerSideDatasource,
  GridApi,
  IServerSideGetRowsParams,
} from 'ag-grid-community';
import type {
  ServerSideSelectionProvider,
  SelectionOp,
  SelectionSpec,
} from '@libregrid/server-side-selection';
import { themeQuartz } from 'ag-grid-community';
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
function filterMatches(row: Trade, filterModel: unknown): boolean {
  if (
    !filterModel ||
    typeof filterModel !== 'object' ||
    ('filterType' in filterModel && !Object.keys(filterModel).some((key) => key in row))
  )
    return true;
  return Object.entries(filterModel ?? {}).every(([field, raw]) => {
    const filter = raw as { filter?: unknown; type?: string };
    const actual = String(row[field as keyof Trade]).toLowerCase();
    const expected = String(filter.filter ?? '').toLowerCase();
    if (!expected) return true;
    return filter.type === 'equals' ? actual === expected : actual.includes(expected);
  });
}
function createDemoProvider() {
  const terms: FilterModel[] = [];
  const additions = new Set<string>();
  const exceptions = new Set<string>();

  const selected = (id: string): boolean =>
    (additions.has(id) ||
      terms.some((filter) =>
        filterMatches(ALL_ROWS[Number(id.replace('trade-', '')) - 1]!, filter),
      )) &&
    !exceptions.has(id);

  const provider: ServerSideSelectionProvider = {
    async getSpec(): Promise<SelectionSpec> {
      return {
        terms: terms.map((filter) => ({ type: 'all', filter: structuredClone(filter) })),
        selectedCount: ALL_ROWS.filter((row) => selected(row.id)).length,
      };
    },
    async applyOps(params: { gridId: string; tabId: string; ops: SelectionOp[] }): Promise<void> {
      for (const op of params.ops) {
        switch (op.op) {
          case 'selectAll':
            // R4: re-selecting a filtered term clears only its in-scope row exceptions.
            for (const row of ALL_ROWS)
              if (filterMatches(row, op.filter)) exceptions.delete(row.id);
            if (!terms.some((term) => JSON.stringify(term) === JSON.stringify(op.filter))) {
              terms.push(structuredClone(op.filter));
            }
            break;
          case 'deselectAll':
            terms.length = 0;
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
    selectedRows(filterModel?: unknown): Trade[] {
      return ALL_ROWS.filter((row) => selected(row.id) && filterMatches(row, filterModel));
    },
  };
}
@Component({
  selector: 'example-app',
  imports: [AgGridAngular, MatFormFieldModule, MatInputModule],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
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
  protected applyDeskFilter(value: string): void {
    this.gridApi?.setFilterModel(
      value.trim() ? { desk: { filterType: 'text', type: 'equals', filter: value.trim() } } : {},
    );
  }
  private datasource(): IServerSideDatasource<Trade> {
    return {
      getRows: (params: IServerSideGetRowsParams<Trade>) => {
        const viewActive = !!this.gridApi?.getGridOption('ssrmSelectionViewActive');
        const start = params.request.startRow ?? 0;
        const end = params.request.endRow ?? ROW_COUNT;
        const matchingRows = ALL_ROWS.filter((row) =>
          filterMatches(row, params.request.filterModel),
        );
        if (viewActive) {
          // R6: the selection IS the dataset; filters still apply on top.
          const rows = this.demo.selectedRows(params.request.filterModel);
          params.success({ rowData: rows.slice(start, end), rowCount: rows.length });
          return;
        }
        const rowData = matchingRows.slice(start, end);
        window.setTimeout(
          () => params.success({ rowData, rowCount: matchingRows.length }),
          LOAD_LATENCY_MS,
        );
      },
    };
  }
}
