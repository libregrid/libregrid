import { BeanStub, _dispatchColumnChangedEvent, type NamedBean } from 'ag-grid-community';
import type {
  AgColumn,
  ColKey,
  ColumnEventType,
  ColumnState,
  ColumnStateParams,
  IPivotColsService,
} from 'ag-grid-community';

function wantsPivot(col: AgColumn, colIsNew: boolean): boolean {
  const def = col.getColDef() as Record<string, unknown>;
  return def['pivot'] === true || (colIsNew && def['initialPivot'] === true);
}

/** Tracks the primary columns that define the pivot axis. */
export class PivotColsService extends BeanStub implements IPivotColsService, NamedBean {
  public beanName = 'pivotColsSvc' as const;
  public columns: AgColumn[] = [];
  private pending: Set<AgColumn> | null = null;
  private staged: AgColumn[] | null = null;

  public get pendingChanged(): Set<AgColumn> | null { return this.pending; }

  public extractCol(column: AgColumn, colIsNew: boolean): void {
    if (!column.primary || !wantsPivot(column, colIsNew)) return;
    this.staged ??= [];
    if (!this.staged.includes(column)) this.staged.push(column);
  }

  public commitExtract(source: ColumnEventType): void {
    if (!this.staged) return;
    const next = this.staged;
    this.staged = null;
    this.replace(next, source);
  }

  public syncColState(column: AgColumn, state: ColumnState | null, defaultState: ColumnStateParams | undefined): void {
    const next = state?.pivot ?? defaultState?.pivot;
    if (next === undefined || !column.primary) return;
    if (next) {
      if (!column.pivotActive) {
        this.activate(column, state?.pivotIndex ?? undefined);
        this.mark(column);
      }
    } else if (column.pivotActive) {
      this.deactivate(column);
      this.mark(column);
    }
  }

  public setColumns(keys: ColKey[] | undefined, source: ColumnEventType): void {
    const next = (keys ?? []).map((key) => this.resolve(key)).filter((col): col is AgColumn => !!col);
    for (const col of [...this.columns]) if (!next.includes(col)) { this.deactivate(col); this.mark(col); }
    for (const col of next) if (!col.pivotActive) { this.activate(col); this.mark(col); }
    this.order(next);
    this.dispatchColChange(source);
  }

  public addColumns(keys: (ColKey | null | undefined)[] | undefined, source: ColumnEventType): void {
    for (const key of keys ?? []) {
      const col = this.resolve(key);
      if (col && !col.pivotActive) { this.activate(col); this.mark(col); }
    }
    this.dispatchColChange(source);
  }

  public removeColumns(keys: (ColKey | null | undefined)[] | undefined, source: ColumnEventType): void {
    for (const key of keys ?? []) {
      const col = this.resolve(key);
      if (col?.pivotActive) { this.deactivate(col); this.mark(col); }
    }
    this.dispatchColChange(source);
  }

  public sortByPendingState(): void {
    this.columns.sort((a, b) => ((a.getColDef().pivotIndex as number | undefined) ?? Number.MAX_SAFE_INTEGER) - ((b.getColDef().pivotIndex as number | undefined) ?? Number.MAX_SAFE_INTEGER));
    this.flushReindex();
  }

  public restoreColumnOrder(incoming: { [colId: string]: ColumnState }, accumulator: { [colId: string]: ColumnState }): void {
    Object.assign(accumulator, incoming);
  }

  public flushReindex(): void { this.columns.forEach((column, index) => { column.pivotActiveIndex = index; }); }
  public isStrictColumnOrder(): boolean { return this.gos.get('pivotPanelSuppressSort') === true; }
  public hasInteractivePivotSort(): boolean { return this.columns.some((column) => column.pivotSort != null); }
  public reRankByPivotGroupOrder(_defs: AgColumn[], stickyOrder: string[]): string[] { return stickyOrder; }

  public dispatchColChange(source: ColumnEventType): void {
    const changed = this.pending ? [...this.pending] : null;
    this.pending = null;
    if (changed?.length) _dispatchColumnChangedEvent(this.beans.eventSvc, 'columnPivotChanged', changed, source);
  }

  private resolve(key: ColKey | null | undefined): AgColumn | undefined {
    if (key == null) return undefined;
    const id = typeof key === 'string' ? key : (key as AgColumn).getColId?.();
    // While pivot results are displayed, primary columns are parked outside
    // `getCols()`; `getAllCols()` retains them for the public mutation APIs.
    return this.beans.colModel.getAllCols().find((column) => column.getColId() === id);
  }
  private activate(column: AgColumn, index?: number): void {
    column.pivotActive = true;
    if (!this.columns.includes(column)) this.columns.splice(index != null && index >= 0 ? Math.min(index, this.columns.length) : this.columns.length, 0, column);
    this.flushReindex();
  }
  private deactivate(column: AgColumn): void {
    column.pivotActive = false;
    column.pivotActiveIndex = -1;
    const index = this.columns.indexOf(column);
    if (index >= 0) this.columns.splice(index, 1);
    this.flushReindex();
  }
  private replace(next: AgColumn[], source: ColumnEventType): void {
    for (const column of [...this.columns]) if (!next.includes(column)) { this.deactivate(column); this.mark(column); }
    for (const column of next) if (!column.pivotActive) { this.activate(column); this.mark(column); }
    this.order(next);
    this.dispatchColChange(source);
  }
  private order(next: AgColumn[]): void { this.columns.sort((a, b) => next.indexOf(a) - next.indexOf(b)); this.flushReindex(); }
  private mark(column: AgColumn): void { this.pending ??= new Set(); this.pending.add(column); }
}
