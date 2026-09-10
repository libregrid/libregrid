import { BeanStub, _getClientSideRowModel, type NamedBean } from 'ag-grid-community';
import type { AgColumn, RowNode, _IAggregatedChildrenSvc } from 'ag-grid-community';
import { pivotKey } from './pivotKeys';

/**
 * Supplies the children that contribute to a group's aggregation — bean
 * `aggChildrenSvc` (Phase 21, gap-plan A8).
 *
 * Community declares this slot and reads it from `RowNode.getAggregatedChildren`
 * but never provides it, so the public `rowNode.getAggregatedChildren()` call
 * returned `[]` unconditionally before this service existed. The group row value
 * setter depends on it for `GroupRowValueSetterParams.aggregatedChildren`.
 *
 * Semantics follow the `IRowNode.getAggregatedChildren` contract:
 * - leaf groups (holding data rows) → the data rows; non-leaf groups → the child
 *   group rows; leaf (non-group) nodes → an empty array;
 * - `recursive` returns all descendant leaf rows instead of immediate children;
 * - for a pivot result column on a leaf group, only children matching that
 *   column's pivot keys contribute — the same filter `AggregationStage` applies;
 * - Client-Side Row Model only (every other row model returns an empty array).
 *
 * The set of children also matches what the aggregation step actually totals, so
 * a group edit distributes to exactly the rows behind the displayed aggregate:
 * when `suppressAggFilteredOnly` is on, aggregation spans all children (not just
 * the filtered ones), so `aggregatedChildren` follows suit.
 *
 * @feature Row Grouping -> Editing Groups
 */
export class AggregatedChildrenService extends BeanStub implements _IAggregatedChildrenSvc, NamedBean {
  beanName = 'aggChildrenSvc' as const;

  public getAggregatedChildren(
    rowNode: RowNode | null | undefined,
    col: AgColumn | null | undefined,
    recursive = false,
  ): RowNode[] {
    if (!rowNode?.group) return [];
    if (!_getClientSideRowModel(this.beans)) return [];

    const children = this.aggregationChildren(rowNode);
    if (!children?.length) return [];

    const candidates = recursive ? this.collectLeaves(children) : children;
    const keys = this.pivotKeysFor(col);
    if (!keys) return candidates;

    return candidates.filter((child) => child.group
      ? this.collectLeaves(this.aggregationChildren(child) ?? []).some((leaf) => this.matchesPivotKeys(leaf, keys))
      : this.matchesPivotKeys(child, keys));
  }

  /**
   * The children that contribute to a group's aggregation, preferring the
   * aggregated/filtered arrays when those stages have run and the post-group
   * array otherwise. With `suppressAggFilteredOnly` the aggregation stage spans
   * every child, so the same full set is returned here.
   */
  private aggregationChildren(node: RowNode): RowNode[] | null | undefined {
    if (this.gos.get('suppressAggFilteredOnly') === true) {
      // The aggregation stage spans the full post-group set, so the children an
      // edit distributes to must be the same full set — not the filtered one.
      return node.childrenAfterGroup;
    }
    // Aggregate filters run after aggregation and must not change its inputs.
    return node.childrenAfterFilter ?? node.childrenAfterGroup;
  }

  /**
   * The pivot bucket a result column represents, or `null` when `col` is not a
   * pivot result column (or pivot columns are not registered).
   */
  private pivotKeysFor(col: AgColumn | null | undefined): string[] | null {
    const def = col?.getColDef();
    if (!def?.pivotValueColumn) return null;
    const keys = def.pivotKeys;
    if (!keys?.length) return null;
    if ((this.beans.pivotColsSvc?.columns ?? []).length === 0) return null;
    return keys;
  }

  private matchesPivotKeys(child: RowNode, keys: string[]): boolean {
    const pivotCols = this.beans.pivotColsSvc?.columns ?? [];
    return pivotCols.every(
      (pivotCol, index) =>
        pivotKey(this.beans.valueSvc.getValue(pivotCol, child, 'data', true)) === keys[index],
    );
  }

  /** Deepest-first collection of leaf rows below `children` (group rows are not leaves). */
  private collectLeaves(children: RowNode[]): RowNode[] {
    const leaves: RowNode[] = [];
    const visit = (node: RowNode) => {
      const descendants = this.aggregationChildren(node);
      if (node.group && descendants) {
        for (const child of descendants) visit(child);
      } else {
        leaves.push(node);
      }
    };
    for (const child of children) visit(child);
    return leaves;
  }
}
