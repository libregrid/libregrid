import {
  BeanStub,
  RowNode as RowNodeClass,
  type GridOptions,
  type _IRowNodeGroupStage,
  type NamedBean,
  type RefreshModelParams,
  _getClientSideRowModel,
  _forEachChangedGroupDepthFirst,
} from 'ag-grid-community';
import type { RowNode } from 'ag-grid-community';

export class GroupStage extends BeanStub implements _IRowNodeGroupStage, NamedBean {
  beanName = 'groupStage' as const;

  readonly step = 'group' as const;
  readonly refreshProps: (keyof GridOptions)[] | null = [
    'groupDefaultExpanded',
    'groupDisplayType',
    'groupAllowUnbalanced',
    'groupMaintainOrder',
    'groupSuppressBlankHeader',
  ];

  readonly treeData = false;
  readonly grouping = true;
  readonly hasTreeData = false;
  readonly hasRowGrouping = true;

  public execute(params: RefreshModelParams): boolean | undefined {
    const csrm = _getClientSideRowModel(this.beans);
    const rootNode = csrm?.rootNode;
    if (!rootNode) return;

    const svcCols = this.beans.rowGroupColsSvc?.columns ?? [];
    const rowGroupCols =
      svcCols.length > 0
        ? svcCols
        : (this.beans.colModel.getCols() ?? []).filter(
            (c) =>
              c.rowGroupActive ||
              (c.getColDef() as Record<string, unknown>).rowGroup === true,
          );
    if (rowGroupCols.length === 0) {
      csrm.hierarchical = false;
      rootNode.childrenAfterGroup = rootNode.allLeafChildren;
      rootNode.allChildrenCount = rootNode.allLeafChildren?.length ?? 0;
      _forEachChangedGroupDepthFirst(rootNode, false, params.changedPath, () => {});
      return;
    }

    this.createGroupTree(rootNode, rowGroupCols);
    // CSRM leaves this flag to the group stage: downstream stages and the
    // changed-node traversal branch on it (clientSideRowModel.hierarchical).
    csrm.hierarchical = true;
    return true;
  }

  public getNestedDataGetter() {
    return undefined;
  }

  public onPropChange(_changedProps: ReadonlySet<keyof GridOptions>): boolean {
    return false;
  }

  public extractData(): RowNode['data'][] {
    return [];
  }

  public getNonLeaf(_id: string): RowNode | undefined {
    return undefined;
  }

  public loadLeafs(node: RowNode): RowNode[] | null {
    return (
      node.childrenAfterGroup?.flatMap((child) =>
        child.group ? this.loadLeafs(child) ?? [] : [child],
      ) ?? null
    );
  }

  public loadGroupData(node: RowNode): Record<string, unknown> | null {
    if (!node.group) return null;
    return node._groupData ?? null;
  }

  public clearNonLeafs(): void {}

  public invalidateGroupCols(): void {
    const csrm = _getClientSideRowModel(this.beans);
    if (csrm) csrm.refreshModel({ step: 'group' });
  }

  private isGroupExpandedByDefault(level: number): boolean {
    const defaultExpanded = this.gos.get('groupDefaultExpanded');
    if (defaultExpanded === -1) return true;
    if (typeof defaultExpanded === 'number') return level < defaultExpanded;
    return false;
  }

  private createGroupTree(
    rootNode: RowNode,
    rowGroupCols: { getColId: () => string; getColDef: () => { field?: string } }[],
  ) {
    const leafNodes = rootNode.allLeafChildren ?? [];

    const buildLevel = (
      nodes: RowNode[],
      level: number,
      parentNode: RowNode | null,
    ): RowNode[] => {
      if (level >= rowGroupCols.length) return nodes;

      const col = rowGroupCols[level]!;
      const colId = col.getColId();
      const field = col.getColDef().field ?? colId;
      const buckets = new Map<string, RowNode[]>();

      for (const node of nodes) {
        const raw = node.data?.[field];
        const key = raw == null ? '' : String(raw);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.push(node);
        } else {
          buckets.set(key, [node]);
        }
      }

      const groupNodes: RowNode[] = [];
      for (const [key, children] of buckets) {
        const groupNode = new RowNodeClass(this.beans);
        groupNode.group = true;
        groupNode.key = key;
        groupNode.level = level;
        groupNode.uiLevel = level;
        groupNode.rowGroupIndex = level;
        groupNode.field = field;
        groupNode.parent = parentNode;
        groupNode.childrenAfterGroup = buildLevel(children, level + 1, groupNode);
        groupNode.allChildrenCount =
          groupNode.childrenAfterGroup?.reduce(
            (sum, c) => sum + (c.allChildrenCount ?? 1),
            0,
          ) ?? 0;
        groupNode.sourceRowIndex = -1;
        groupNode.stub = false;
        groupNode.footer = false;
        groupNode.expanded = this.isGroupExpandedByDefault(level);
        groupNodes.push(groupNode);
      }

      for (let i = 0; i < groupNodes.length; i++) {
        groupNodes[i]!.firstChild = i === 0;
        groupNodes[i]!.lastChild = i === groupNodes.length - 1;
        groupNodes[i]!.childIndex = i;
      }

      return groupNodes;
    };

    rootNode.childrenAfterGroup = buildLevel(leafNodes, 0, rootNode);
    rootNode.allChildrenCount =
      rootNode.childrenAfterGroup?.reduce(
        (sum, c) => sum + (c.allChildrenCount ?? 1),
        0,
      ) ?? 0;
  }
}
