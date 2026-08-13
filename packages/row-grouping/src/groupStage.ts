import {
  BeanStub,
  RowNode as RowNodeClass,
  ROOT_NODE_ID,
  type AgColumn,
  type GridOptions,
  type _IRowNodeGroupStage,
  type NamedBean,
  type RefreshModelParams,
  _getClientSideRowModel,
  _forEachChangedGroupDepthFirst,
  _addGridCommonParams,
} from 'ag-grid-community';
import type { InitialGroupOrderComparator, IsGroupOpenByDefault, RowNode } from 'ag-grid-community';

export class GroupStage extends BeanStub implements _IRowNodeGroupStage, NamedBean {
  beanName = 'groupStage' as const;

  readonly step = 'group' as const;
  readonly refreshProps: (keyof GridOptions)[] | null = [
    'groupDefaultExpanded',
    'isGroupOpenByDefault',
    'initialGroupOrderComparator',
    'groupDisplayType',
    'groupAllowUnbalanced',
    'groupMaintainOrder',
    'groupSuppressBlankHeader',
  ];

  readonly treeData = false;
  readonly grouping = true;
  readonly hasTreeData = false;
  readonly hasRowGrouping = true;

  /**
   * `id -> group RowNode` for the tree built by the most recent `execute()`.
   * Backs `getNonLeaf`, which `ClientSideRowModel.getRowNode` falls back to
   * for any id `nodeManager` doesn't recognise (group nodes never go through
   * `nodeManager`) — required for `api.getRowNode(GROUP_TOTAL_ROW_ID_PREFIX +
   * groupId)` to resolve the group a total row belongs to.
   */
  private nonLeafsById = new Map<string, RowNode>();

  public execute(params: RefreshModelParams): boolean | undefined {
    const csrm = _getClientSideRowModel(this.beans);
    const rootNode = csrm?.rootNode;
    if (!rootNode) return;

    // Group nodes are rebuilt after data changes. Preserve their expansion by
    // deterministic ID; newly introduced groups still use the configured default.
    const previousExpansion = params.rowDataUpdated
      ? new Map([...this.nonLeafsById].map(([id, node]) => [id, !!node.expanded]))
      : undefined;
    this.nonLeafsById = new Map();
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

    this.createGroupTree(rootNode, rowGroupCols, previousExpansion);
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

  public getNonLeaf(id: string): RowNode | undefined {
    return this.nonLeafsById.get(id);
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

  /**
   * `isGroupOpenByDefault`, when provided, takes priority over
   * `groupDefaultExpanded` — the two are documented as mutually exclusive
   * (AG Grid docs: "Only one of `groupDefaultExpanded` and
   * `isGroupOpenByDefault` should be used").
   */
  private isGroupExpandedByDefault(
    rowNode: RowNode,
    rowGroupColumn: AgColumn,
    level: number,
    field: string,
    key: string,
  ): boolean {
    const isOpenByDefault = this.gos.get('isGroupOpenByDefault') as IsGroupOpenByDefault | undefined;
    if (isOpenByDefault) {
      return !!isOpenByDefault(
        _addGridCommonParams(this.gos, { rowNode, rowGroupColumn, level, field, key }),
      );
    }
    const defaultExpanded = this.gos.get('groupDefaultExpanded');
    if (defaultExpanded === -1) return true;
    if (typeof defaultExpanded === 'number') return level < defaultExpanded;
    return false;
  }

  private createGroupTree(
    rootNode: RowNode,
    rowGroupCols: AgColumn[],
    previousExpansion?: ReadonlyMap<string, boolean>,
  ) {
    const leafNodes = rootNode.allLeafChildren ?? [];
    const allowUnbalanced = this.gos.get('groupAllowUnbalanced') === true;

    const buildLevel = (
      nodes: RowNode[],
      level: number,
      parentNode: RowNode | null,
    ): RowNode[] => {
      if (level >= rowGroupCols.length) {
        // Leaf rows: stamp .parent/.level so display-layer seams that walk
        // up the tree (e.g. showOpenedGroup, groupHideOpenParents in
        // ShowRowGroupColsValueService) can reach the owning group.
        for (const leaf of nodes) {
          leaf.parent = parentNode;
          leaf.level = level;
          leaf.uiLevel = level;
        }
        return nodes;
      }

      const col = rowGroupCols[level]!;
      const colId = col.getColId();
      const field = col.getColDef().field ?? colId;
      const buckets = new Map<string, RowNode[]>();
      // groupAllowUnbalanced: a row with no value at this level attaches
      // directly under parentNode instead of joining a (Blanks) bucket and
      // descending further — an "unbalanced" leaf that stops early.
      const unbalanced: RowNode[] = [];

      for (const node of nodes) {
        const raw = node.data?.[field];
        if (allowUnbalanced && (raw == null || raw === '')) {
          unbalanced.push(node);
          continue;
        }
        const key = raw == null ? '' : String(raw);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.push(node);
        } else {
          buckets.set(key, [node]);
        }
      }

      const groupNodes: RowNode[] = [];
      const parentId = parentNode?.id ?? ROOT_NODE_ID;
      for (const [key, children] of buckets) {
        const groupNode = new RowNodeClass(this.beans);
        groupNode.group = true;
        groupNode.key = key;
        groupNode.id = `${parentId}-${colId}-${key}`;
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
        groupNode.expanded =
          previousExpansion?.get(groupNode.id) ??
          this.isGroupExpandedByDefault(groupNode, col, level, field, key);
        this.nonLeafsById.set(groupNode.id, groupNode);
        groupNodes.push(groupNode);
      }

      for (const node of unbalanced) {
        node.parent = parentNode;
        node.level = level;
        node.uiLevel = level;
        groupNodes.push(node);
      }

      // initialGroupOrderComparator: structural order at tree-build time,
      // before filtering/aggregation exist to compare on (AG Grid docs:
      // "executes before filtering and aggregation"). GroupSortStage later
      // re-derives this same structural order whenever there is no active
      // column sort at a level.
      const orderComparator = this.gos.get('initialGroupOrderComparator') as
        | InitialGroupOrderComparator
        | undefined;
      if (orderComparator) {
        groupNodes.sort((nodeA, nodeB) =>
          orderComparator(_addGridCommonParams(this.gos, { nodeA, nodeB })),
        );
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
