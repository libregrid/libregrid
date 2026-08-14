import { BeanStub, _getClientSideRowModel, _getServerSideRowModel, type NamedBean, type RowNode } from 'ag-grid-community';
import type { GridApi, IExpansionService, RowCtrl, RowGroupExpansionState } from 'ag-grid-community';

/**
 * Implements the `expansionSvc` seam — bean `expansionSvc`.
 *
 * `RowNode.setExpanded`/`.expanded`/`.isExpandable()` all delegate to this
 * bean (`rowNode.ts`: `this.beans.expansionSvc?.setExpanded(...)`,
 * `expansionSvc ? expansionSvc.isExpanded(this) : ...`). Without it,
 * `setExpanded` is a silent no-op — this is the seam that makes the group
 * cell renderer's expand/collapse affordance actually do anything.
 *
 * `expandAll`/`resetExpansion`/`getExpansionState`/`setExpansionState` are
 * minimal, correct-by-construction defaults; PR 2.4 owns the public
 * `expandAll`/`collapseAll` API and "expansion state survives sort, filter
 * and data update" acceptance criterion, and may need to revisit these
 * (state persistence here keys off `RowNode.id`, which GroupStage does not
 * yet stamp on group nodes — see `docs/parity/row-grouping.md`).
 *
 * @feature Row Grouping -> Auto Group Column
 */
export class ExpansionService
  extends BeanStub
  implements IExpansionService<RowGroupExpansionState>, NamedBean
{
  beanName = 'expansionSvc' as const;

  public setExpanded(
    rowNode: RowNode,
    expanded: boolean,
    _e?: MouseEvent | KeyboardEvent,
    _forceSync?: boolean,
  ): void {
    if (this.isExpanded(rowNode) === expanded) return;
    rowNode.expanded = expanded;
    rowNode.dispatchRowEvent('expandedChanged');
    const ssrmListener = this.beans as typeof this.beans & { ssrmExpandListener?: { onGroupExpanded(node: RowNode, state: boolean): void } };
    ssrmListener.ssrmExpandListener?.onGroupExpanded(rowNode, expanded);
    this.onGroupExpandedOrCollapsed();
  }

  public isExpanded(rowNode: RowNode): boolean {
    if (rowNode.level === -1) return true;
    return !!(rowNode as unknown as { _expanded?: boolean })._expanded;
  }

  public isExpandable(rowNode: RowNode): boolean {
    return !!rowNode.master || (!!rowNode.group && (!!rowNode.childrenAfterGroup?.length || !!(rowNode as unknown as { __lgrSsrmRoute?: string[] }).__lgrSsrmRoute));
  }

  public onGroupExpandedOrCollapsed(): void {
    _getClientSideRowModel(this.beans)?.refreshModel({ step: 'map' });
    _getServerSideRowModel(this.beans)?.resetRowHeights();
  }

  public addExpandedCss(classes: string[], rowNode: RowNode): void {
    if (!rowNode.group) return;
    classes.push(this.isExpanded(rowNode) ? 'ag-row-group-expanded' : 'ag-row-group-contracted');
  }

  public getRowExpandedListeners(
    _rowCtrl: RowCtrl,
  ): { expandedChanged: () => void; hasChildrenChanged: () => void } {
    return { expandedChanged: () => undefined, hasChildrenChanged: () => undefined };
  }

  public expandAll(value: boolean): void {
    const ssrm = _getServerSideRowModel(this.beans);
    if (ssrm?.hierarchical) {
      (ssrm as typeof ssrm & { setAllExpanded(value: boolean): void }).setAllExpanded(value);
      return;
    }
    this.forEachGroup((node) => {
      node.expanded = value;
    });
    this.onGroupExpandedOrCollapsed();
  }

  /**
   * "Reset all group expansion to defaults, as determined by
   * groupDefaultExpanded [or] isGroupOpenByDefault" (`_CsrmSsrmSharedGridApi.
   * resetRowGroupExpansion` doc comment) — defaults are computed once, at
   * tree-build time, by `GroupStage.isGroupExpandedByDefault`. The only way
   * to re-apply them is to have GroupStage rebuild the tree; there's no
   * separate stored "default" to copy back from.
   */
  public resetExpansion(): void {
    _getClientSideRowModel(this.beans)?.refreshModel({ step: 'group' });
  }

  public getExpansionState(): RowGroupExpansionState {
    const expandedRowGroupIds: string[] = [];
    this.forEachGroup((node) => {
      if (this.isExpanded(node) && node.id != null) expandedRowGroupIds.push(node.id);
    });
    return { expandedRowGroupIds };
  }

  public setExpansionState(state: RowGroupExpansionState, _source: 'gridInitializing' | 'api'): void {
    const ids = new Set(state.expandedRowGroupIds ?? []);
    this.forEachGroup((node) => {
      node.expanded = node.id != null && ids.has(node.id);
    });
    this.onGroupExpandedOrCollapsed();
  }

  public setDetailsExpansionState(_detailGridApi: GridApi): void {
    // Master/detail — Phase 10.
  }

  private forEachGroup(fn: (node: RowNode) => void): void {
    const rootNode = _getClientSideRowModel(this.beans)?.rootNode;
    if (!rootNode) return;
    const walk = (node: RowNode) => {
      if (node.group) fn(node);
      for (const child of node.childrenAfterGroup ?? []) walk(child);
    };
    walk(rootNode);
  }
}
