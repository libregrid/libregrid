import {
  BeanStub,
  _dispatchColumnChangedEvent,
  type NamedBean,
} from 'ag-grid-community';
import type {
  AgColumn,
  ColKey,
  ColumnEventType,
  ColumnState,
  ColumnStateParams,
  IRowGroupColsService,
} from 'ag-grid-community';

function colDefWantsRowGroup(col: AgColumn, colIsNew: boolean): boolean {
  const colDef = col.getColDef() as Record<string, unknown>;
  if (colDef['rowGroup'] === true) return true;
  if (colIsNew && colDef['initialRowGroup'] === true) return true;
  return false;
}

/**
 * Tracks the active row-group columns — bean `rowGroupColsSvc`.
 *
 * Community reads this service directly: the grid role becomes `treegrid`
 * only when `rowGroupColsSvc.columns.length >= 1`, and `_applyColumnState`
 * routes `rowGroup` state through `syncColState`. It also gives the
 * `GroupStage` an authoritative column list (replacing the colDef scan).
 *
 * @feature Row Grouping
 */
export class RowGroupColsService extends BeanStub implements IRowGroupColsService, NamedBean {
  beanName = 'rowGroupColsSvc' as const;

  public columns: AgColumn[] = [];
  private pending: Set<AgColumn> | null = null;
  private staged: AgColumn[] | null = null;

  public get pendingChanged(): Set<AgColumn> | null {
    return this.pending;
  }

  public extractCol(col: AgColumn, colIsNew: boolean): void {
    if (!col.primary) return;
    this.staged ??= [];
    if (colDefWantsRowGroup(col, colIsNew) && !this.staged.includes(col)) {
      this.staged.push(col);
    }
  }

  public commitExtract(source: ColumnEventType): void {
    if (!this.staged) return;
    const staged = this.staged;
    this.staged = null;
    this.replaceActive(staged, source);
  }

  public syncColState(
    column: AgColumn,
    stateItem: ColumnState | null,
    _defaultState: ColumnStateParams | undefined,
    _source: ColumnEventType,
  ): void {
    const has = stateItem && stateItem.rowGroup !== undefined && stateItem.rowGroup !== null;
    const next = has ? stateItem.rowGroup : undefined;
    if (next === undefined) return;

    if (next) {
      if (!column.rowGroupActive) {
        this.activate(column, stateItem?.rowGroupIndex ?? undefined);
        this.markPending(column);
      }
    } else if (column.rowGroupActive) {
      this.deactivate(column);
      this.markPending(column);
    }
  }

  public setColumns(colKeys: ColKey[] | undefined, source: ColumnEventType): void {
    const wanted = (colKeys ?? [])
      .map((key) => this.resolve(key))
      .filter((col): col is AgColumn => !!col);
    for (const col of [...this.columns]) {
      if (!wanted.includes(col)) {
        this.deactivate(col);
        this.markPending(col);
      }
    }
    for (const col of wanted) {
      if (!col.rowGroupActive) {
        this.activate(col);
        this.markPending(col);
      }
    }
    this.sortByIndex(wanted);
    this.dispatchColChange(source);
  }

  public addColumns(keys: (ColKey | null | undefined)[] | undefined, source: ColumnEventType): void {
    for (const key of keys ?? []) {
      const col = this.resolve(key);
      if (!col || col.rowGroupActive) continue;
      this.activate(col);
      this.markPending(col);
    }
    this.dispatchColChange(source);
  }

  public removeColumns(keys: (ColKey | null | undefined)[] | undefined, source: ColumnEventType): void {
    for (const key of keys ?? []) {
      const col = this.resolve(key);
      if (!col || !col.rowGroupActive) continue;
      this.deactivate(col);
      this.markPending(col);
    }
    this.dispatchColChange(source);
  }

  public moveColumn(fromIndex: number, toIndex: number, source: ColumnEventType): void {
    if (fromIndex < 0 || fromIndex >= this.columns.length) return;
    const [col] = this.columns.splice(fromIndex, 1);
    if (!col) return;
    this.columns.splice(Math.min(toIndex, this.columns.length), 0, col);
    this.flushReindex();
    this.markPending(col);
    this.dispatchColChange(source);
  }

  public sortByPendingState(): void {
    this.columns.sort((a, b) => {
      const ai = (a.getColDef().rowGroupIndex as number | null | undefined) ?? Number.MAX_SAFE_INTEGER;
      const bi = (b.getColDef().rowGroupIndex as number | null | undefined) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
    this.flushReindex();
  }

  public restoreColumnOrder(
    incoming: { [colId: string]: ColumnState },
    accumulator: { [colId: string]: ColumnState },
  ): void {
    for (const [colId, state] of Object.entries(incoming)) {
      accumulator[colId] = state;
    }
  }

  public flushReindex(): void {
    this.columns.forEach((col, i) => {
      col.rowGroupActiveIndex = i;
    });
  }

  public dispatchColChange(source: ColumnEventType): void {
    const changed = this.pending ? [...this.pending] : null;
    this.pending = null;
    if (changed?.length) {
      _dispatchColumnChangedEvent(this.beans.eventSvc, 'columnRowGroupChanged', changed, source);
    }
  }

  private resolve(key: ColKey | null | undefined): AgColumn | undefined {
    if (key == null) return undefined;
    const colId = typeof key === 'string' ? key : (key as AgColumn).getColId?.();
    const colModel = this.beans.colModel as unknown as {
      getAllCols?: () => AgColumn[];
      getCols?: () => AgColumn[];
    };
    return (colModel.getAllCols?.() ?? colModel.getCols?.() ?? []).find(
      (column) => column.getColId() === colId,
    );
  }

  private activate(col: AgColumn, index?: number): void {
    if (!col.rowGroupActive) {
      col.rowGroupActive = true;
      if (index != null && index >= 0 && index <= this.columns.length) {
        this.columns.splice(index, 0, col);
      } else if (!this.columns.includes(col)) {
        this.columns.push(col);
      }
    }
    this.flushReindex();
  }

  private deactivate(col: AgColumn): void {
    col.rowGroupActive = false;
    col.rowGroupActiveIndex = -1;
    const i = this.columns.indexOf(col);
    if (i >= 0) this.columns.splice(i, 1);
    this.flushReindex();
  }

  private replaceActive(next: AgColumn[], source: ColumnEventType): void {
    const before = new Set(this.columns);
    for (const col of this.columns) {
      if (!next.includes(col)) this.deactivate(col);
    }
    for (const col of next) this.activate(col);
    this.sortByIndex(next);
    const changed = next.filter((c) => !before.has(c));
    if (changed.length) {
      for (const col of changed) this.markPending(col);
      this.dispatchColChange(source);
    }
  }

  private sortByIndex(order: AgColumn[]): void {
    this.columns.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    this.flushReindex();
  }

  private markPending(col: AgColumn): void {
    this.pending ??= new Set();
    this.pending.add(col);
  }
}
