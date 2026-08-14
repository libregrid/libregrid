import {
  BeanStub,
  _dispatchColumnChangedEvent,
  type NamedBean,
} from 'ag-grid-community';
import type {
  AgColumn,
  ColAggFunc,
  ColKey,
  ColumnEventType,
  ColumnState,
  ColumnStateParams,
  IValueColsService,
} from 'ag-grid-community';

function colDefWantsValue(col: AgColumn, colIsNew: boolean): { aggFunc: ColAggFunc } | null {
  const colDef = col.getColDef() as Record<string, unknown>;
  const declared = (colDef['aggFunc'] as ColAggFunc) ??
    (colIsNew ? ((colDef['initialAggFunc'] as ColAggFunc) ?? undefined) : undefined);
  if (declared != null) return { aggFunc: declared };
  if (colDef['enableValue'] === true) {
    return { aggFunc: (colDef['defaultAggFunc'] as ColAggFunc) ?? 'sum' };
  }
  return null;
}

/**
 * Tracks the active value (aggregation) columns — bean `valueColsSvc`.
 *
 * Community's column machinery calls `extractCol`/`commitExtract` during
 * column builds and `syncColState` when column state is applied; this service
 * mirrors those hooks so `col.aggFunc` and `aggregationActive` stay in sync,
 * which is what `_applyColumnState` needs for `setColumnAggFunc` to work.
 *
 * @feature Row Grouping -> Aggregation
 */
export class ValueColsService extends BeanStub implements IValueColsService, NamedBean {
  beanName = 'valueColsSvc' as const;

  public columns: AgColumn[] = [];
  private pending: Set<AgColumn> | null = null;
  private staged: AgColumn[] | null = null;

  public get pendingChanged(): Set<AgColumn> | null {
    return this.pending;
  }

  public extractCol(col: AgColumn, colIsNew: boolean): void {
    if (!col.primary) return;
    this.staged ??= [];
    const wanted = colDefWantsValue(col, colIsNew);
    if (wanted) {
      col.aggFunc = wanted.aggFunc;
      if (!this.staged.includes(col)) this.staged.push(col);
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
    defaultState: ColumnStateParams | undefined,
    _source: ColumnEventType,
  ): void {
    const has = stateItem && stateItem.aggFunc !== undefined;
    const fallback = !has && defaultState?.aggFunc !== undefined ? defaultState.aggFunc : undefined;
    const next = has ? stateItem.aggFunc : fallback;
    if (next === undefined) return;

    if (next == null) {
      if (column.aggFunc != null) {
        column.aggFunc = null;
        this.deactivate(column);
        this.markPending(column);
      }
      return;
    }

    if (column.aggFunc !== next) {
      column.aggFunc = next;
      this.markPending(column);
    }
    this.activate(column);
  }

  public setColumnAggFunc(key: ColKey | undefined, aggFunc: ColAggFunc, source: ColumnEventType): void {
    const col = this.resolve(key);
    if (!col) return;
    if (aggFunc == null) {
      col.aggFunc = null;
      this.deactivate(col);
    } else {
      col.aggFunc = aggFunc;
      this.activate(col);
    }
    this.markPending(col);
    this.dispatchColChange(source);
  }

  public setColumns(colKeys: ColKey[] | undefined, source: ColumnEventType): void {
    const wanted = new Set(
      (colKeys ?? [])
        .map((key) => this.resolve(key))
        .filter((col): col is AgColumn => !!col)
        .map((col) => col.getColId()),
    );
    for (const col of [...this.columns]) {
      if (!wanted.has(col.getColId())) {
        col.aggFunc = null;
        this.deactivate(col);
        this.markPending(col);
      }
    }
    for (const colId of wanted) {
      const col = this.columns.find((c) => c.getColId() === colId) ?? this.resolve(colId);
      if (col && !col.aggregationActive) {
        col.aggFunc ??= colDefWantsValue(col, false)?.aggFunc ?? 'sum';
        this.activate(col);
        this.markPending(col);
      }
    }
    this.dispatchColChange(source);
  }

  public addColumns(keys: (ColKey | null | undefined)[] | undefined, source: ColumnEventType): void {
    for (const key of keys ?? []) {
      const col = this.resolve(key);
      if (!col || col.aggregationActive) continue;
      col.aggFunc ??= colDefWantsValue(col, false)?.aggFunc ?? 'sum';
      this.activate(col);
      this.markPending(col);
    }
    this.dispatchColChange(source);
  }

  public removeColumns(keys: (ColKey | null | undefined)[] | undefined, source: ColumnEventType): void {
    for (const key of keys ?? []) {
      const col = this.resolve(key);
      if (!col || !col.aggregationActive) continue;
      col.aggFunc = null;
      this.deactivate(col);
      this.markPending(col);
    }
    this.dispatchColChange(source);
  }

  public sortByPendingState(): void {
    this.columns.sort((a, b) => {
      const ai = (a.getColDef().valueIndex as number | null | undefined) ?? Number.MAX_SAFE_INTEGER;
      const bi = (b.getColDef().valueIndex as number | null | undefined) ?? Number.MAX_SAFE_INTEGER;
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
      col.aggregationActiveIndex = i;
    });
  }

  public dispatchColChange(source: ColumnEventType): void {
    const changed = this.pending ? [...this.pending] : null;
    this.pending = null;
    if (changed?.length) {
      _dispatchColumnChangedEvent(this.beans.eventSvc, 'columnValueChanged', changed, source);
    }
  }

  private resolve(key: ColKey | null | undefined): AgColumn | undefined {
    if (key == null) return undefined;
    const colId = typeof key === 'string' ? key : (key as AgColumn).getColId?.();
    // Pivot mode parks primary columns from `getCols()`; values must remain
    // mutable through their stable primary column IDs. The fallback maintains
    // compatibility with lightweight column-model adapters.
    const colModel = this.beans.colModel as unknown as {
      getAllCols?: () => AgColumn[];
      getCols?: () => AgColumn[];
    };
    return (colModel.getAllCols?.() ?? colModel.getCols?.() ?? []).find(
      (column) => column.getColId() === colId,
    );
  }

  private activate(col: AgColumn): void {
    if (!col.aggregationActive) {
      col.aggregationActive = true;
      if (!this.columns.includes(col)) this.columns.push(col);
    }
    col.aggregationActiveIndex = this.columns.indexOf(col);
  }

  private deactivate(col: AgColumn): void {
    col.aggregationActive = false;
    col.aggregationActiveIndex = -1;
    const i = this.columns.indexOf(col);
    if (i >= 0) this.columns.splice(i, 1);
  }

  private replaceActive(next: AgColumn[], source: ColumnEventType): void {
    const before = new Set(this.columns);
    for (const col of this.columns) {
      if (!next.includes(col)) this.deactivate(col);
    }
    for (const col of next) this.activate(col);
    this.flushReindex();
    const changed = next.filter((c) => !before.has(c));
    if (changed.length) {
      for (const col of changed) this.markPending(col);
      this.dispatchColChange(source);
    }
  }

  private markPending(col: AgColumn): void {
    this.pending ??= new Set();
    this.pending.add(col);
  }
}
