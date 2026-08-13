import {
  BeanStub,
  type _IRowNodeFlattenStage,
  type GridOptions,
  type NamedBean,
  type RowNode,
  _getClientSideRowModel,
} from 'ag-grid-community';

export class FlattenStage extends BeanStub implements _IRowNodeFlattenStage, NamedBean {
  beanName = 'flattenStage' as const;

  readonly step = 'map' as const;
  readonly refreshProps: (keyof GridOptions)[] | null = [
    'groupHideOpenParents',
    'groupHideParentOfSingleChild',
  ];

  public execute(): RowNode[] {
    const csrm = _getClientSideRowModel(this.beans);
    const rootNode = csrm?.rootNode;
    if (!rootNode) return [];

    const result: RowNode[] = [];
    this.flatten(rootNode, result);
    return result;
  }

  /**
   * `groupHideParentOfSingleChild`: collapses a chain of groups whose only
   * child is itself a lone group (or, for `'leafGroupsOnly'`, whose only
   * child is a leaf) down to the node that should actually represent the
   * branch — its own row is never emitted.
   */
  private resolveDisplayNode(node: RowNode): RowNode {
    const mode = this.gos.get('groupHideParentOfSingleChild');
    if (!mode) return node;

    let current = node;
    while (current.group) {
      const children =
        current.childrenAfterAggFilter ?? current.childrenAfterFilter ?? current.childrenAfterGroup;
      if (children?.length !== 1) break;
      const only = children[0]!;
      const hide = mode === true || (mode === 'leafGroupsOnly' && !only.group);
      if (!hide) break;
      current = only;
    }
    return current;
  }

  private flatten(node: RowNode, out: RowNode[]): void {
    const children = node.childrenAfterAggFilter ?? node.childrenAfterFilter ?? node.childrenAfterGroup;
    if (!children) return;

    const hideOpenParents = this.gos.get('groupHideOpenParents') === true;

    for (const rawChild of children) {
      const child = rawChild.group ? this.resolveDisplayNode(rawChild) : rawChild;

      if (!child.group) {
        out.push(child);
        continue;
      }

      // groupHideOpenParents: an expanded group's own row is hidden; its
      // value reappears on the first child via
      // ShowRowGroupColsValueService.getDisplayedNode.
      if (!(hideOpenParents && child.expanded)) {
        out.push(child);
      }
      if (child.expanded) this.flatten(child, out);
    }
  }
}
