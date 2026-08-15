import {
  AgColumn,
  BeanStub,
  GROUP_AUTO_COLUMN_ID,
  type ColDef,
  type ColumnEventType,
  type IAutoColService,
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
 * through {@link "./showRowGroupColsValueService"} rather than a field.
 * `multipleColumns`, `groupRows` and `custom` are not yet implemented; see
 * `docs/parity/row-grouping.md`.
 *
 * @feature Row Grouping -> Auto Group Column
 * @gridOption autoGroupColumnDef
 * @gridOption groupDisplayType
 */
export class AutoGenColsService extends BeanStub implements IAutoColService, NamedBean {
  beanName = 'autoColSvc' as const;

  public columns: AgColumn[] = [];

  public postConstruct(): void {
    this.addManagedEventListeners({
      columnRowGroupChanged: (event) => {
        const source = (event as { source?: ColumnEventType }).source ?? 'api';
        this.beans.colModel.refreshCols(false, source);
        this.beans.visibleCols.refresh(source, false);
      },
    });
    this.addManagedPropertyListeners(['autoGroupColumnDef', 'groupDisplayType'], (event) =>
      this.updateColumns(event),
    );
  }

  public override destroy(): void {
    this.destroyColumn();
    super.destroy();
  }

  public refreshCols(_source: ColumnEventType): AgColumn[] | null {
    if (!this.isEnabled()) {
      this.destroyColumn();
      return null;
    }

    if (this.columns[0]) return this.columns;

    const colDef = this.createColDef();
    const colId = colDef.colId as string;
    const col = new AgColumn(colDef, null, colId, false, 'auto-group');
    this.beans.context.createBean(col);
    this.columns = [col];
    return this.columns;
  }

  public updateColumns(
    _event: PropertyChangedEvent | PropertyValueChangedEvent<keyof GridOptions>,
  ): void {
    const col = this.columns[0];
    if (!col) return;
    col.setColDef(this.createColDef(), null, 'api');
  }

  private isEnabled(): boolean {
    // Tree data needs the auto group column even with no row-group columns —
    // the tree hierarchy renders in it. Community's ValueService bypasses the
    // showRowGroup value service for tree rows, so the column's valueGetter
    // must produce group names and leaf keys directly.
    if (this.gos.get('treeData')) return true;
    return (this.beans.rowGroupColsSvc?.columns.length ?? 0) > 0;
  }

  private createColDef(): ColDef {
    const userDef = (this.gos.get('autoGroupColumnDef') ?? {}) as ColDef & { colId?: string };
    const { colId: _ignored, ...overridable } = userDef;
    const isTreeData = this.gos.get('treeData');
    return {
      headerName: 'Group',
      sortable: false,
      resizable: true,
      cellRenderer: 'agGroupCellRenderer',
      valueGetter: (params) =>
        isTreeData
          ? (params.node?.key ?? null)
          : params.node?.group
            ? (params.node.key ?? null)
            : null,
      ...overridable,
      colId: GROUP_AUTO_COLUMN_ID,
      showRowGroup: true,
    };
  }

  private destroyColumn(): void {
    const col = this.columns[0];
    if (!col) return;
    this.columns = [];
    if (col.isAlive()) col.destroy();
  }
}
