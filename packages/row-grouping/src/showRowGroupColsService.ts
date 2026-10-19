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
 * In single-column mode the one auto-group column shows every active
 * row-group source column; in `multipleColumns` mode each auto-group column
 * (its `showRowGroup` is a source column id) shows just that source column.
 * `interleaveSortedColumns`,
 * `fillCoupledSortIndexMap` and `isGroupSortMixed` back the row-group-panel
 * coupled-sort UI (PR 2.5) — minimal, order-preserving defaults for now.
 *
 * @feature Row Grouping -> Auto Group Column
 */
export class ShowRowGroupColsService
  extends BeanStub
  implements IShowRowGroupColsService, NamedBean
{
  beanName = 'showRowGroupCols' as const;

  public columns: AgColumn[] = [];

  public postConstruct(): void {
    this.addManagedEventListeners({ columnRowGroupChanged: () => this.refresh() });
  }

  public refresh(): void {
    // groupDisplayType 'custom' has no auto column: the application's own
    // columns carrying showRowGroup play that role.
    const autoCols = this.beans.autoColSvc?.columns ?? [];
    const customCols =
      autoCols.length === 0 && this.gos.get('groupDisplayType') === 'custom'
        ? (this.beans.colModel?.getCols?.() ?? []).filter((col) => col.getColDef?.().showRowGroup)
        : [];
    const displayCols = autoCols.length > 0 ? autoCols : customCols;
    this.columns = displayCols;
    for (const source of this.beans.rowGroupColsSvc?.columns ?? []) {
      source.showRowGroupCol =
        displayCols.find((col) => col.getColDef?.().showRowGroup === source.getColId()) ??
        displayCols.find((col) => col.getColDef?.().showRowGroup === true) ??
        displayCols[0] ??
        null;
    }
  }

  public getShowRowGroupCol(id: string): AgColumn | undefined {
    const source = this.beans.rowGroupColsSvc?.columns.find((col) => col.getColId() === id);
    return source?.showRowGroupCol ?? undefined;
  }

  public getSourceColumnsForGroupColumn(groupCol: AgColumn): AgColumn[] | null {
    if (!this.columns.includes(groupCol)) return null;
    const cols = this.beans.rowGroupColsSvc?.columns;
    if (!cols || cols.length === 0) return null;
    const showRowGroup = groupCol.getColDef?.().showRowGroup;
    if (typeof showRowGroup !== 'string') return cols;
    const matching = cols.filter((col) => col.getColId() === showRowGroup);
    return matching.length > 0 ? matching : null;
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
