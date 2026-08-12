import {
  BeanStub,
  type NamedBean,
  type GridOptions,
  type _IRowNodeFilterStage,
  _getClientSideRowModel,
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
 * PR 2.2 ships the minimal recursive version; PR 2.5 extends it with
 * `groupAggFiltering` (filtering groups by their aggregate values).
 *
 * @feature Row Grouping
 */
export class GroupFilterStage extends BeanStub implements _IRowNodeFilterStage, NamedBean {
  beanName = 'groupFilterStage' as const;

  readonly step = 'filter' as const;
  readonly refreshProps: (keyof GridOptions)[] | null = null;

  public execute(_changedPath: ChangedPath | undefined): void {
    const rootNode = _getClientSideRowModel(this.beans)?.rootNode;
    if (!rootNode) return;

    const fm = this.beans.filterManager as
      | { isChildFilterPresent(): boolean; doesRowPassFilter(row: RowNode): boolean }
      | undefined;
    const active = !!fm?.isChildFilterPresent();

    const filterChildren = (node: RowNode): RowNode[] => {
      const children = node.childrenAfterGroup ?? [];
      if (!active) return children;
      const out: RowNode[] = [];
      for (const child of children) {
        if (child.group) {
          const survivors = filterChildren(child);
          child.childrenAfterFilter = survivors;
          if (survivors.length > 0) out.push(child);
        } else if (fm!.doesRowPassFilter(child)) {
          out.push(child);
        }
      }
      return out;
    };

    rootNode.childrenAfterFilter = filterChildren(rootNode);
  }
}
