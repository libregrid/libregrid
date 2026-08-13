import {
  BeanStub,
  GROUP_TOTAL_ROW_ID_PREFIX,
  type Column,
  type IFooterService,
  type IRowNode,
  type NamedBean,
  type RowNode,
  type VerticalSection,
  _createRowNodeSibling,
  _getGrandTotalRow,
  _getGroupTotalRowCallback,
} from 'ag-grid-community';

/**
 * Bean `footerSvc`. Backs `groupTotalRow` / `grandTotalRow` — Community's own
 * `ClientSideRowModel.depthFirstSearchRowNodes` and `getTopLevelRowDisplayedIndex`
 * already call `beans.footerSvc?.addTotalRows(...)` / `getTopDisplayIndex(...)`
 * defensively; `FlattenStage` calls `addTotalRows` too, since it (not Community)
 * owns building `rowsToDisplay`.
 *
 * A total row is `node.sibling` — a `RowNode` with `.footer = true` created via
 * Community's own `_createRowNodeSibling` (the exact helper Community uses for
 * pinned-row siblings) and given the id Community's own `getRowNode`/
 * `getSpecialRowNode` already know how to resolve:
 * `GROUP_TOTAL_ROW_ID_PREFIX + groupNode.id` (root's sibling id is therefore
 * `GRAND_TOTAL_ROW_ID` for free, since `rootNode.id === ROOT_NODE_ID`).
 * `RowNode.groupData`'s getter already redirects a `.footer` node to
 * `this.sibling?.groupData`, and `ValueService.displayIgnoresAggData` already
 * gates `groupSuppressBlankHeader` on `node.sibling` existing — both come free
 * once the sibling link is set, no extra work needed here.
 *
 * `getTotalValue`/`doesCellShowTotalPrefix`/`applyTotalPrefix` are declared by
 * Community's `IFooterService` but never called by Community itself (confirmed
 * against the compiled bundle — these three have zero call sites outside this
 * interface's declaration). They exist for a footer-aware cell renderer to use;
 * `GroupCellRenderer` doesn't call them (it has no bean access — see its own
 * docs), it hardcodes the same literal `'Total'` text directly, matching the
 * documented default (ag-grid.com: "the auto group column cell displays
 * 'Total' in footer rows"). Implemented here for interface completeness only.
 *
 * Known gap (documented, not guessed at): `grandTotalRow: 'pinnedTop' |
 * 'pinnedBottom'` is not supported — pinning a total row requires routing it
 * through the pinned row model, a separate seam this PR doesn't touch. Only
 * the inline `'top'` / `'bottom'` values render a total row; see
 * `docs/parity/aggregation.md`.
 *
 * @feature Row Grouping -> Aggregation (Total Rows)
 * @gridOption groupTotalRow
 * @gridOption grandTotalRow
 */
export class FooterService extends BeanStub implements IFooterService, NamedBean {
  beanName = 'footerSvc' as const;

  public addTotalRows(
    startIndex: number,
    node: RowNode,
    callback: (node: RowNode, index: number) => void,
    includeFooterNodes: boolean,
    isRootNode: boolean,
    position: VerticalSection,
  ): number {
    if (!includeFooterNodes) return startIndex;
    // A group's total row only appears while the group itself is expanded
    // (ag-grid.com: "to display when the group is expanded"). The grand
    // total row has no expand/collapse state of its own.
    if (!isRootNode && !node.expanded) return startIndex;

    const desired = isRootNode ? this.getGrandTotalPosition() : this.getGroupTotalPosition(node);
    if (desired !== position) return startIndex;

    callback(this.getOrCreateFooter(node), startIndex);
    return startIndex + 1;
  }

  public getTopDisplayIndex(
    rowsToDisplay: RowNode[],
    topLevelIndex: number,
    _childrenAfterSort: RowNode[],
    getDefaultIndex: (adjustedIndex: number) => number,
  ): number {
    const grandTotalAtTop = this.getGrandTotalPosition() === 'top' && !!rowsToDisplay[0]?.footer;
    return getDefaultIndex(topLevelIndex) + (grandTotalAtTop ? 1 : 0);
  }

  public getTotalValue(_value: unknown): string {
    return 'Total';
  }

  public doesCellShowTotalPrefix(node: IRowNode, col?: Column): boolean {
    return !!node.footer && (col === undefined || (col as { showRowGroup?: unknown }).showRowGroup === true);
  }

  public applyTotalPrefix(value: unknown, formattedValue: string | null, node: IRowNode, col: Column): string {
    if (this.doesCellShowTotalPrefix(node, col)) return this.getTotalValue(value);
    return formattedValue ?? (value == null ? '' : String(value));
  }

  private getGrandTotalPosition(): VerticalSection | undefined {
    const raw = _getGrandTotalRow(this.gos);
    return raw === 'top' || raw === 'bottom' ? raw : undefined;
  }

  private getGroupTotalPosition(node: RowNode): VerticalSection | undefined {
    return _getGroupTotalRowCallback(this.gos)({ node });
  }

  private getOrCreateFooter(node: RowNode): RowNode {
    let footer = node.sibling;
    if (!footer) {
      footer = _createRowNodeSibling(node, this.beans);
      footer.sibling = node;
      node.sibling = footer;
      footer.id = GROUP_TOTAL_ROW_ID_PREFIX + node.id;
      footer.footer = true;
      footer.expanded = false;
      footer.childrenAfterGroup = null;
      footer.childrenAfterFilter = null;
      footer.childrenAfterAggFilter = null;
      footer.childrenAfterSort = null;
      footer.allLeafChildren = null;
    }
    // aggData may have been reassigned (not just mutated) since the footer
    // was created — e.g. by a getGroupRowAgg override — so re-sync the
    // reference every call rather than trusting the snapshot taken at
    // creation time.
    footer.aggData = node.aggData;
    return footer;
  }
}
