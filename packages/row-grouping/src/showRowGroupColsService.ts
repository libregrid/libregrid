import { BeanStub, type AgColumn, type NamedBean, type SortDirection } from 'ag-grid-community';
import type { IShowRowGroupColsService } from 'ag-grid-community';

/**
 * Tracks which column currently displays which row-group source column —
 * bean `showRowGroupCols`. `AgColumn.showRowGroupCol` ("the display group
 * col that shows this (source) column; set by `showRowGroupCols` on
 * refresh" — Community's own doc comment) is stamped here on every
 * `columnRowGroupChanged`, and Community's core reads it back directly
 * (`agColumn.ts` → `isRowGroupDisplayed`).
 *
 * Single-column mode only: the one auto-group column shows every active
 * row-group source column. `interleaveSortedColumns`,
 * `fillCoupledSortIndexMap` and `isGroupSortMixed` back the row-group-panel
 * coupled-sort UI (PR 2.5) — minimal, order-preserving defaults for now.
 *
 * @feature Row Grouping -> Auto Group Column
 */
export class ShowRowGroupColsService extends BeanStub implements IShowRowGroupColsService, NamedBean {
  beanName = 'showRowGroupCols' as const;

  public columns: AgColumn[] = [];

  public postConstruct(): void {
    this.addManagedEventListeners({ columnRowGroupChanged: () => this.refresh() });
  }

  public refresh(): void {
    const autoCols = this.beans.autoColSvc?.columns ?? [];
    this.columns = autoCols;
    const displayCol = autoCols[0] ?? null;
    for (const source of this.beans.rowGroupColsSvc?.columns ?? []) {
      source.showRowGroupCol = displayCol;
    }
  }

  public getSourceColumnsForGroupColumn(groupCol: AgColumn): AgColumn[] | null {
    if (!this.columns.includes(groupCol)) return null;
    const cols = this.beans.rowGroupColsSvc?.columns;
    return cols && cols.length > 0 ? cols : null;
  }

  public isRowGroupDisplayed(column: AgColumn, colId: string): boolean {
    if (!column.rowGroupActive) return false;
    return column.showRowGroupCol?.getColId() === colId;
  }

  public interleaveSortedColumns(sorted: AgColumn[]): AgColumn[] {
    return sorted;
  }

  public fillCoupledSortIndexMap(_sortedCols: AgColumn[], _map: Map<AgColumn, number>): number {
    return 0;
  }

  public isGroupSortMixed(_column: AgColumn, _direction: SortDirection): boolean {
    return false;
  }
}
