import {
  BeanStub,
  type NamedBean,
  type GridOptions,
  type _IRowNodeFilterStage,
  type FilterManager,
  _getClientSideRowModel,
  _getGroupAggFiltering,
} from 'ag-grid-community';
import type { ChangedPath, RowNode } from 'ag-grid-community';

/**
 * Applies the active filter to a grouped tree — bean `groupFilterStage`.
 *
 * Community's own `filterStage` only filters the root's children; in a
 * hierarchical grid the CSRM routes filtering here instead
 * (`this.hierarchical && beans.groupFilterStage || beans.filterStage`).
 * A group survives when any of its descendants passes the filter.
 *
 * PR 2.5 adds `groupAggFiltering`: reuses Community's own
 * `FilterManager.doesRowPassAggregateFilters` — the seam that already exists
 * for this purpose (`filterManager.updateAggFiltering()` tracks whether it's
 * active; `isAggregateFilterPresent()` gates it) — to test a *group's own*
 * aggregated value against the active column filters. Per ag-grid.com: "When
 * a group row passes a filter with groupAggFiltering enabled, it also
 * includes all of its descendent rows in the filtered results." The docs
 * don't specify the fail case; the interpretation here (not independently
 * verifiable — Enterprise source is off-limits per G1) is that a group whose
 * own aggregate doesn't pass simply falls through to normal per-leaf
 * filtering rather than being excluded outright, so aggregate-filtering is
 * purely an *additional* way for a subtree to survive.
 *
 * Discovered empirically (confirmed against the compiled bundle): once a
 * filter sits on a column FilterManager considers aggregatable, it can
 * register *only* in the "aggregate" bucket (`isAggregateFilterPresent`),
 * not the "child" one (`isColumnFilterPresent`) — and both
 * `doesRowPassFilter`/`doesRowPassAggregateFilters` "pass by default" when
 * their own bucket is empty (they only ever return `false`, never `true`,
 * from a guard clause). So on a leaf, `doesRowPassFilter` alone can silently
 * no-op — a leaf must pass *both* checks; whichever bucket is actually
 * populated does the real work, and the other is a harmless default-pass.
 *
 * @feature Row Grouping
 * @gridOption groupAggFiltering
 */
export class GroupFilterStage extends BeanStub implements _IRowNodeFilterStage, NamedBean {
  beanName = 'groupFilterStage' as const;

  readonly step = 'filter' as const;
  readonly refreshProps: (keyof GridOptions)[] | null = ['groupAggFiltering'];

  public execute(_changedPath: ChangedPath | undefined): void {
    const rootNode = _getClientSideRowModel(this.beans)?.rootNode;
    if (!rootNode) return;

    const fm = this.beans.filterManager as FilterManager | undefined;
    // isChildFilterPresent() alone misses a filter that only registered in
    // the aggregate bucket — the top-level gate must be the union.
    const active = !!fm?.isAnyFilterPresent();
    const aggFilterCb = _getGroupAggFiltering(this.gos);

    const passesLeafFilter = (row: RowNode): boolean =>
      fm!.doesRowPassFilter(row) && fm!.doesRowPassAggregateFilters({ rowNode: row });

    const filterChildren = (node: RowNode): RowNode[] => {
      const children = node.childrenAfterGroup ?? [];
      if (!active) {
        for (const child of children) {
          if (child.group) child.childrenAfterFilter = filterChildren(child);
        }
        return children;
      }
      const out: RowNode[] = [];
      for (const child of children) {
        if (child.group) {
          if (aggFilterCb?.({ node: child }) && fm!.doesRowPassAggregateFilters({ rowNode: child })) {
            child.childrenAfterFilter = child.childrenAfterGroup;
            out.push(child);
            continue;
          }
          const survivors = filterChildren(child);
          child.childrenAfterFilter = survivors;
          if (survivors.length > 0) out.push(child);
        } else if (passesLeafFilter(child)) {
          out.push(child);
        }
      }
      return out;
    };

    rootNode.childrenAfterFilter = filterChildren(rootNode);
  }
}
