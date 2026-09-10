import { BeanStub, _getClientSideRowModel, type NamedBean } from 'ag-grid-community';
import type {
  AgColumn,
  GroupRowEditableCallback,
  GroupRowEditableCallbackParams,
  GroupRowValueSetterParams,
  IRowNode,
  RowNode,
  _IRowGroupingEditValueSvc,
} from 'ag-grid-community';
import { applyDistributionPlan, resolveDistributionPlan } from './distributeGroupValue';

/**
 * Group row value editing — bean `rowGroupingEditValueSvc` (Phase 21, gap-plan A8).
 *
 * Community declares this seam and calls it from two places, but never provides
 * an implementation:
 * - `isCellEditable` routes a group row with `colDef.groupRowEditable` set
 *   through `isGroupCellEditable`, so without this bean a group cell can never
 *   start an edit;
 * - `ValueService.setDataValue` routes a group row through `setGroupDataValue`,
 *   where `undefined` means "no group row value setter is configured — use the
 *   normal path" and a boolean reports whether children changed.
 *
 * This service also owns `refreshAfterGroupEdit`: when that option is true, an
 * edit to a grouped column value re-evaluates the grouping hierarchy so the row
 * moves to the correct group. The option is validated against the `RowGrouping`
 * and `TreeData` module names, not `RowGroupingEdit`.
 *
 * @feature Row Grouping -> Editing Groups
 */
export class RowGroupingEditService extends BeanStub implements _IRowGroupingEditValueSvc, NamedBean {
  beanName = 'rowGroupingEditValueSvc' as const;

  public postConstruct(): void {
    this.addManagedEventListeners({
      cellValueChanged: (event) => this.onCellValueChanged(event as unknown as { column?: AgColumn | null }),
    });
  }

  /**
   * Called when `groupRowEditable` is defined on the column. Evaluates the
   * callback and checks whether the distribution strategy suppresses the edit
   * (`groupRowValueSetter: false`, or a per-aggFunc entry of `false`/`null`).
   */
  public isGroupCellEditable(rowNode: IRowNode, column: AgColumn): boolean {
    const colDef = column?.getColDef() as Record<string, unknown> | undefined;
    if (!colDef) return false;
    const editable = colDef['groupRowEditable'];
    if (editable == null) return false;
    // A suppressed distribution makes the cell non-editable even when
    // `groupRowEditable` is true (documented override).
    if (!resolveDistributionPlan(column, colDef)) return false;
    if (typeof editable === 'boolean') return editable;
    if (typeof editable !== 'function') return false;

    const params = this.gos.addCommon({
      node: rowNode as RowNode,
      data: (rowNode as RowNode).data,
      column,
      colDef: column.getColDef(),
    }) as unknown as GroupRowEditableCallbackParams;

    return (editable as GroupRowEditableCallback)(params) === true;
  }

  /**
   * Resolves and executes the group row value setter for a group row edit.
   * Returns `undefined` when neither `groupRowValueSetter` nor `groupRowEditable`
   * is configured, so the caller keeps the normal value path.
   */
  public setGroupDataValue(
    rowNode: RowNode,
    column: AgColumn,
    newValue: unknown,
    oldValue: unknown,
    eventSource: string | undefined,
    valueChanged: boolean,
  ): boolean | undefined {
    const colDef = column?.getColDef() as Record<string, unknown> | undefined;
    if (!colDef) return undefined;
    if (colDef['groupRowValueSetter'] == null && colDef['groupRowEditable'] == null) return undefined;

    const plan = resolveDistributionPlan(column, colDef);
    if (!plan) return false;

    const params = this.gos.addCommon({
      column,
      colDef: column.getColDef(),
      oldValue,
      newValue,
      node: rowNode,
      data: rowNode.data,
      eventSource,
      valueChanged,
      aggregatedChildren: this.beans.aggChildrenSvc?.getAggregatedChildren(rowNode, column) ?? [],
    }) as unknown as GroupRowValueSetterParams;

    return applyDistributionPlan(params, plan);
  }

  /**
   * `refreshAfterGroupEdit` — re-evaluate the grouping hierarchy after an edit so
   * the row lands in the correct group. `step: 'group'` runs the full downstream
   * pipeline (filter → aggregate → sort → map); `rowDataUpdated` preserves group
   * expansion by deterministic ID, matching a data-driven rebuild.
   */
  private onCellValueChanged(event: { column?: AgColumn | null }): void {
    if (this.gos.get('refreshAfterGroupEdit') !== true) return;
    if (!this.affectsGrouping(event.column ?? null)) return;
    const csrm = _getClientSideRowModel(this.beans);
    csrm?.refreshModel({ step: 'group', rowDataUpdated: true });
  }

  /**
   * Row grouping regroups only when an active row-group column changed. Tree data
   * derives its hierarchy from the row data itself (`getDataPath` reads the whole
   * row), so any edit may re-path it.
   */
  private affectsGrouping(column: AgColumn | null): boolean {
    if (this.gos.get('treeData') === true) return true;
    if (!column) return false;
    if (this.beans.rowGroupColsSvc?.columns.includes(column)) return true;
    const candidate = column as unknown as { rowGroupActive?: boolean; isRowGroupActive?: () => boolean };
    return candidate.rowGroupActive === true || candidate.isRowGroupActive?.() === true;
  }
}
