import {
  BeanStub,
  type NamedBean,
  type GridOptions,
  type _IRowNodeFilterAggregateStage,
  _getClientSideRowModel,
  _forEachChangedGroupDepthFirst,
} from 'ag-grid-community';
import type { ChangedPath, RowNode } from 'ag-grid-community';

/**
 * Maintains `childrenAfterAggFilter` and, when
 * `suppressAggFilteredOnly: true`, re-aggregates every group over its full
 * (unfiltered) child set so totals ignore filtering.
 *
 * Bean `filterAggStage`, step `'filter_aggregates'`.
 *
 * @feature Row Grouping -> Aggregation
 * @gridOption suppressAggFilteredOnly
 */
export class FilterAggregateStage extends BeanStub
  implements _IRowNodeFilterAggregateStage, NamedBean
{
  beanName = 'filterAggStage' as const;

  readonly step = 'filter_aggregates' as const;
  readonly refreshProps: (keyof GridOptions)[] | null = ['suppressAggFilteredOnly'];

  public execute(_changedPath: ChangedPath | undefined): void {
    const csrm = _getClientSideRowModel(this.beans);
    const rootNode = csrm?.rootNode;
    if (!rootNode) return;

    const suppressAggFilteredOnly = this.gos.get('suppressAggFilteredOnly') === true;
    const aggStage = this.beans.aggStage as
      | { aggregateNodeOver(node: RowNode, children: RowNode[]): void }
      | undefined;

    const reaggregated = new Set<RowNode>();
    _forEachChangedGroupDepthFirst(rootNode, csrm.hierarchical ?? true, null, (node) => {
      const allChildren = node.childrenAfterGroup;
      if (!allChildren) return;
      node.childrenAfterAggFilter = node.childrenAfterFilter ?? allChildren;

      if (!suppressAggFilteredOnly || !aggStage) return;
      const filterTrimmed =
        node.childrenAfterFilter && node.childrenAfterFilter.length !== allChildren.length;
      if (filterTrimmed && !reaggregated.has(node)) {
        reaggregated.add(node);
        aggStage.aggregateNodeOver(node, allChildren);
      }
    });
  }
}
