import {
  AgColumn,
  BeanStub,
  GROUP_AUTO_COLUMN_ID,
  type ColDef,
  _getClientSideRowModel,
  type ColumnEventType,
  type IAutoColService,
  type IRowNode,
  type NamedBean,
  type PropertyChangedEvent,
  type PropertyValueChangedEvent,
  type GridOptions,
} from 'ag-grid-community';

/**
 * Generates the single auto group column shown when row grouping is active
 * — bean `autoColSvc`. Community's `ColumnModel.refreshCols` calls
 * `autoColSvc?.refreshCols(source)` unconditionally and splices whatever it
 * returns ahead of the user's columns (`baseSingleColService.ts` /
 * `columnModel.ts` — same seam `selectionColSvc` uses for the checkbox
 * column). Registering under this exact bean name is the entire
 * integration; there is no other wiring step.
 *
 * Ships `groupDisplayType: 'singleColumn'`, the default — one column shows
 * every group level via `column.showRowGroup`, which routes cell values
 * through {@link "./showRowGroupColsValueService"} rather than a field — and
 * `'multipleColumns'`, which generates one column per row-group column, each
 * with `showRowGroup` set to its source column's id and a colId of
 * `ag-Grid-AutoColumn-<sourceColId>`. `groupRows` and `custom` are not yet
 * implemented; see `docs/parity/row-grouping.md`.
 *
 * With `groupHideColumnsUntilExpanded` (multiple columns, client-side row
 * model only) Community's `getColsToShow` keeps an auto column only while
 * `isVisible()` is true, so this service owns that flag: the first column is
 * always visible and each further one shows once at least one group of the
 * preceding level is expanded. It is re-evaluated on every `modelUpdated`,
 * which every expand/collapse and regroup path ends in.
 *
 * @feature Row Grouping -> Auto Group Column
 * @gridOption autoGroupColumnDef
 * @gridOption groupDisplayType
 * @gridOption groupHideColumnsUntilExpanded
 */
export class AutoGenColsService extends BeanStub implements IAutoColService, NamedBean {
  beanName = 'autoColSvc' as const;

  public columns: AgColumn[] = [];

  private wasHiding = false;

  public postConstruct(): void {
    this.addManagedEventListeners({
      columnRowGroupChanged: (event) => {
        const source = (event as { source?: ColumnEventType }).source ?? 'api';
        this.beans.colModel.refreshCols(false, source);
        this.beans.visibleCols.refresh(source, false);
      },
    });
    this.addManagedEventListeners({ modelUpdated: () => this.syncHiddenColumns('api') });
    this.addManagedPropertyListeners(['groupHideColumnsUntilExpanded'], () =>
      this.syncHiddenColumns('api'),
    );
    this.addManagedPropertyListeners(['autoGroupColumnDef', 'groupDisplayType'], (event) =>
      this.updateColumns(event),
    );
  }

  public override destroy(): void {
    this.destroyColumns();
    super.destroy();
  }

  public refreshCols(_source: ColumnEventType): AgColumn[] | null {
    if (!this.isEnabled()) {
      this.destroyColumns();
      return null;
    }

    const defs = this.createColDefs();
    const existing = new Map(this.columns.map((col) => [col.getColId(), col]));
    const next = defs.map((def) => {
      const colId = def.colId as string;
      const kept = existing.get(colId);
      if (kept) {
        existing.delete(colId);
        return kept;
      }
      const col = new AgColumn(def, null, colId, false, 'auto-group');
      this.beans.context.createBean(col);
      return col;
    });
    for (const stale of existing.values()) if (stale.isAlive()) stale.destroy();

    this.applyVisibility(next, 'api');

    const unchanged =
      next.length === this.columns.length && next.every((col, i) => col === this.columns[i]);
    if (!unchanged) this.columns = next;
    return this.columns;
  }

  public updateColumns(
    _event: PropertyChangedEvent | PropertyValueChangedEvent<keyof GridOptions>,
  ): void {
    if (this.columns.length === 0) return;
    const defs = this.createColDefs();
    // A groupDisplayType switch changes the column set; rebuild through the
    // normal refresh path rather than patching colDefs in place.
    if (
      defs.length !== this.columns.length ||
      defs.some((d, i) => d.colId !== this.columns[i]!.getColId())
    ) {
      this.beans.colModel.refreshCols(false, 'api');
      this.beans.visibleCols.refresh('api', false);
      return;
    }
    this.columns.forEach((col, i) => col.setColDef(defs[i]!, null, 'api'));
  }

  private isEnabled(): boolean {
    // Tree data needs the auto group column even with no row-group columns —
    // the tree hierarchy renders in it. Community's ValueService bypasses the
    // showRowGroup value service for tree rows, so the column's valueGetter
    // must produce group names and leaf keys directly.
    if (this.gos.get('treeData')) return true;
    return (this.beans.rowGroupColsSvc?.columns.length ?? 0) > 0;
  }

  private isHidingUntilExpanded(): boolean {
    return (
      !!this.gos.get('groupHideColumnsUntilExpanded') &&
      this.isMultipleColumns() &&
      this.gos.get('rowModelType') !== 'serverSide' &&
      this.gos.get('rowModelType') !== 'viewport' &&
      this.gos.get('rowModelType') !== 'infinite'
    );
  }

  /** Sets each auto column's visibility; returns whether any changed. */
  private applyVisibility(columns: AgColumn[], source: ColumnEventType): boolean {
    let changed = false;
    const hiding = this.isHidingUntilExpanded();
    // Outside the feature the user owns auto-column visibility; only undo
    // our own hiding once, when the feature is switched off.
    const wasHiding = this.wasHiding;
    this.wasHiding = hiding;
    if (!hiding && !wasHiding) return false;
    const expandedLevels = hiding ? this.getExpandedLevels() : null;
    columns.forEach((col, i) => {
      const visible = !expandedLevels || i === 0 || expandedLevels.has(i - 1);
      if (col.isVisible() === visible) return;
      col.setVisible(visible, source);
      changed = true;
    });
    return changed;
  }

  private syncHiddenColumns(source: ColumnEventType): void {
    if (this.columns.length === 0) return;
    if (this.applyVisibility(this.columns, source)) {
      this.beans.visibleCols.refresh(source, false);
    }
  }

  /** Levels that hold at least one expanded group. */
  private getExpandedLevels(): Set<number> {
    const levels = new Set<number>();
    const root = _getClientSideRowModel(this.beans)?.rootNode;
    if (!root) return levels;
    const max = this.columns.length - 1;
    const walk = (node: IRowNode) => {
      for (const child of node.childrenAfterGroup ?? []) {
        if (!child.group) continue;
        if (child.expanded) levels.add(child.level);
        if (child.level < max) walk(child);
      }
    };
    walk(root);
    return levels;
  }

  private isMultipleColumns(): boolean {
    // Tree data always renders its hierarchy in the one auto group column.
    return (
      this.gos.get('groupDisplayType') === 'multipleColumns' &&
      !this.gos.get('treeData') &&
      (this.beans.rowGroupColsSvc?.columns.length ?? 0) > 0
    );
  }

  private createColDefs(): ColDef[] {
    if (!this.isMultipleColumns()) return [this.createColDef()];
    return this.beans.rowGroupColsSvc!.columns.map((source) => this.createColDef(source));
  }

  private createColDef(source?: AgColumn): ColDef {
    const userDef = (this.gos.get('autoGroupColumnDef') ?? {}) as ColDef & { colId?: string };
    const { colId: _ignored, ...overridable } = userDef;
    const isTreeData = this.gos.get('treeData');
    const sourceId = source?.getColId();
    return {
      headerName: source ? this.getSourceHeaderName(source) : 'Group',
      sortable: false,
      resizable: true,
      cellRenderer: 'agGroupCellRenderer',
      valueGetter: (params) =>
        isTreeData
          ? (params.node?.key ?? null)
          : params.node?.group &&
              (sourceId == null || params.node.rowGroupColumn?.getColId() === sourceId)
            ? (params.node.key ?? null)
            : null,
      ...overridable,
      colId: sourceId == null ? GROUP_AUTO_COLUMN_ID : `${GROUP_AUTO_COLUMN_ID}-${sourceId}`,
      showRowGroup: sourceId ?? true,
    };
  }

  private getSourceHeaderName(source: AgColumn): string {
    const name = this.beans.colNames?.getDisplayNameForColumn(source, 'header');
    if (name) return name;
    const def = source.getColDef();
    return def.headerName ?? def.field ?? source.getColId();
  }

  private destroyColumns(): void {
    const cols = this.columns;
    this.columns = [];
    for (const col of cols) if (col.isAlive()) col.destroy();
  }
}
