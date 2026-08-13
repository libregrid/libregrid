import {
  BeanStub,
  type GridOptions,
  type NamedBean,
  type PostSortRows,
  type RowNode,
  type _ChangedRowNodes,
  type _IRowNodeSortStage,
  _getClientSideRowModel,
  _addGridCommonParams,
} from 'ag-grid-community';
import type { ChangedPath } from 'ag-grid-community';

/**
 * Bean `groupSortStage`. Community's own `sortStage` sorts only
 * `rootNode`'s direct children — it has no idea group rows have their own
 * child arrays. Once grouping is active, CSRM stops calling `sortStage`
 * entirely and calls this bean instead (`clientSideRowModel.ts`:
 * `const stage = this.hierarchical && beans.groupSortStage || beans.sortStage`),
 * so this stage owns the root level too, not just recursion into subgroups.
 *
 * Runs after `filterAggStage` in the real pipeline order (`group -> filter ->
 * aggregate -> filter_aggregates -> sort -> map`), confirmed against
 * `ClientSideRowModel.refreshModel` — the phase doc's prose order differs and
 * should not be trusted over the source.
 *
 * With no column sort active, each level keeps the structural order GroupStage
 * already produced (data-insertion order, or `initialGroupOrderComparator` if
 * configured) — this stage does not re-derive that order itself, it just
 * carries `childrenAfterAggFilter` through to `childrenAfterSort` unchanged.
 *
 * @feature Row Grouping -> Sorting
 * @gridOption initialGroupOrderComparator (via GroupStage; carried through here)
 */
export class GroupSortStage extends BeanStub implements _IRowNodeSortStage, NamedBean {
  beanName = 'groupSortStage' as const;

  readonly step = 'sort' as const;
  readonly refreshProps: (keyof GridOptions)[] = ['postSortRows', 'accentedSort'];

  public execute(_changedPath: ChangedPath | undefined, _changedRowNodes: _ChangedRowNodes | undefined): void {
    const csrm = _getClientSideRowModel(this.beans);
    const rootNode = csrm?.rootNode;
    if (!rootNode) return;

    const { sortSvc, rowNodeSorter } = this.beans;
    const sortOptions = sortSvc?.getSortOptions() ?? [];
    const hasSortOptions = sortOptions.length > 0;
    const postSortFunc = this.gos.get('postSortRows') as PostSortRows | undefined;

    const sortLevel = (node: RowNode): void => {
      const source = node.childrenAfterAggFilter;
      if (!source) return;
      const sorted =
        hasSortOptions && rowNodeSorter
          ? rowNodeSorter.doFullSortInPlace(source.slice(), sortOptions)
          : source.slice();
      node.childrenAfterSort = sorted;
      this.updateAfterSort(node);
      for (const child of sorted) {
        if (child.group) sortLevel(child);
      }
    };

    sortLevel(rootNode);
    postSortFunc?.(_addGridCommonParams(this.gos, { nodes: rootNode.childrenAfterSort ?? [] }));
  }

  /** Mirrors Community's own (unexported) `updateRowNodeAfterSort` from `sortStage.ts`, per level. */
  private updateAfterSort(node: RowNode): void {
    const childrenAfterSort = node.childrenAfterSort;
    const sibling = node.sibling;
    if (sibling) sibling.childrenAfterSort = childrenAfterSort;
    if (!childrenAfterSort) return;

    for (let i = 0, last = childrenAfterSort.length - 1; i <= last; i++) {
      const child = childrenAfterSort[i]!;
      const first = i === 0;
      const isLast = i === last;
      if (child.firstChild !== first) {
        child.firstChild = first;
        child.dispatchRowEvent('firstChildChanged');
      }
      if (child.lastChild !== isLast) {
        child.lastChild = isLast;
        child.dispatchRowEvent('lastChildChanged');
      }
      if (child.childIndex !== i) {
        child.childIndex = i;
        child.dispatchRowEvent('childIndexChanged');
      }
    }
  }
}
