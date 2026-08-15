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
    'treeData',
    'getDataPath',
    'treeDataChildrenField',
    'treeDataParentIdField',
    'treeDataDisplayType',
    'groupDefaultExpanded',
    'isGroupOpenByDefault',
    'initialGroupOrderComparator',
    'groupDisplayType',
    'groupAllowUnbalanced',
    'groupMaintainOrder',
    'groupSuppressBlankHeader',
  ];

  get treeData(): boolean { return this.gos.get('treeData') === true; }
  get grouping(): boolean { return !this.treeData; }
  readonly hasTreeData = true;
  readonly hasRowGrouping = true;

  /**
   * `id -> group RowNode` for the tree built by the most recent `execute()`.
   * Backs `getNonLeaf`, which `ClientSideRowModel.getRowNode` falls back to
   * for any id `nodeManager` doesn't recognise (group nodes never go through
   * `nodeManager`) — required for `api.getRowNode(GROUP_TOTAL_ROW_ID_PREFIX +
   * groupId)` to resolve the group a total row belongs to.
   */
  private nonLeafsById = new Map<string, RowNode>();

  public postConstruct(): void {
    if (typeof HTMLElement === 'undefined') return;
    this.addManagedEventListeners({ rowDragEnd: (event) => {
      if (!this.treeData) return;
      const drag = event as unknown as { node?: RowNode; nodes?: RowNode[]; overNode?: RowNode };
      const target = drag.overNode;
      if (!target) return;
      for (const node of drag.nodes?.length ? drag.nodes : drag.node ? [drag.node] : []) this.reparentTreeNode(node, target);
    } });
  }

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
    if (this.treeData) {
      this.createTreeDataTree(rootNode, previousExpansion);
      csrm.hierarchical = true;
      return true;
    }
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
    const field = this.gos.get('treeDataChildrenField');
    if (typeof field !== 'string' || field.length === 0) return undefined;
    return (data: Record<string, unknown>) => this.readField(data, field) as Record<string, unknown>[] | null | undefined;
  }

  public onPropChange(_changedProps: ReadonlySet<keyof GridOptions>): boolean {
    return false;
  }

  public extractData(): RowNode['data'][] {
    const rootNode = _getClientSideRowModel(this.beans)?.rootNode;
    return this.loadLeafs(rootNode ?? ({} as RowNode))?.flatMap((node) => node.data == null ? [] : [node.data]) ?? [];
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

  /**
   * Tree Data uses the same RowNode hierarchy as column grouping. The only
   * difference is how parent/child links are sourced: explicit paths, nested
   * child arrays, or parent IDs rather than column-value buckets.
   */
  private createTreeDataTree(rootNode: RowNode, previousExpansion?: ReadonlyMap<string, boolean>): void {
    const sourceNodes = rootNode.allLeafChildren ?? [];
    const childField = this.gos.get('treeDataChildrenField');
    const parentIdField = this.gos.get('treeDataParentIdField');
    let roots: RowNode[];

    if (typeof childField === 'string' && childField.length > 0) {
      roots = sourceNodes.map((node) => this.materialiseNestedNode(node, childField));
    } else if (typeof parentIdField === 'string' && parentIdField.length > 0) {
      roots = this.materialiseParentIdTree(sourceNodes, parentIdField);
    } else {
      roots = this.materialisePathTree(sourceNodes);
    }

    const finish = (node: RowNode, parent: RowNode, level: number): number => {
      node.parent = parent;
      node.level = level;
      node.uiLevel = level;
      node.rowGroupIndex = level;
      const children = node.childrenAfterGroup ?? [];
      node.group = children.length > 0;
      node.leafGroup = node.group && !children.some((child) => (child.childrenAfterGroup?.length ?? 0) > 0);
      node.allChildrenCount = children.reduce((sum, child) => sum + finish(child, node, level + 1), 0);
      if (!node.group) node.allChildrenCount = 1;
      node.firstChild = false;
      node.lastChild = false;
      if (node.group) {
        node.expanded = previousExpansion?.get(node.id ?? '') ?? this.isTreeNodeExpandedByDefault(node);
        if (node.id) this.nonLeafsById.set(node.id, node);
      }
      this.beans.masterDetailSvc?.setMaster(node, node.master !== true, false);
      for (let index = 0; index < children.length; index += 1) {
        children[index]!.firstChild = index === 0;
        children[index]!.lastChild = index === children.length - 1;
        children[index]!.childIndex = index;
      }
      return node.allChildrenCount;
    };
    rootNode.childrenAfterGroup = roots;
    rootNode.allChildrenCount = roots.reduce((sum, node) => sum + finish(node, rootNode, 0), 0);
  }

  private materialisePathTree(sourceNodes: RowNode[]): RowNode[] {
    const getPath = this.gos.get('getDataPath') as ((data: Record<string, unknown>) => string[] | undefined) | undefined;
    const roots: RowNode[] = [];
    const branches = new Map<string, RowNode>();
    for (const source of sourceNodes) {
      const rawPath = getPath?.(source.data ?? {}) ?? [];
      const path = rawPath.map(String).filter((part) => part.length > 0);
      if (path.length === 0) {
        // A malformed path must not hang or disappear: keep the row as a root.
        roots.push(source);
        continue;
      }
      let parent: RowNode | undefined;
      let pathId = '';
      for (let index = 0; index < path.length; index += 1) {
        const key = path[index]!;
        pathId = `${pathId}/${key}`;
        let node = branches.get(pathId);
        const terminal = index === path.length - 1;
        if (!node) {
          node = terminal ? source : this.createTreeFiller(pathId, key);
          if (terminal) {
            // The auto group column renders tree leaf names from node.key (the
            // showRowGroup value service is bypassed for tree rows).
            source.key = key;
            source.field = 'treeData';
          }
          branches.set(pathId, node);
          if (parent) (parent.childrenAfterGroup ??= []).push(node);
          else roots.push(node);
        } else if (terminal && node !== source) {
          // An explicit row can replace a filler for the same path while
          // retaining any descendants already attached to that filler.
          source.childrenAfterGroup = node.childrenAfterGroup;
          source.key = key;
          source.field = 'treeData';
          const grandparent = node.parent;
          if (grandparent?.childrenAfterGroup) {
            const indexOfFiller = grandparent.childrenAfterGroup.indexOf(node);
            if (indexOfFiller >= 0) grandparent.childrenAfterGroup[indexOfFiller] = source;
          } else {
            const indexOfRoot = roots.indexOf(node);
            if (indexOfRoot >= 0) roots[indexOfRoot] = source;
          }
          branches.set(pathId, source);
          node = source;
        }
        node.parent = parent ?? null;
        parent = node;
      }
    }
    return roots;
  }

  private materialiseNestedNode(node: RowNode, childField: string): RowNode {
    const children = this.readField(node.data ?? {}, childField);
    if (Array.isArray(children)) {
      node.childrenAfterGroup = children.map((data, index) => this.materialiseNestedNode(this.createTreeDataNode(data, index), childField));
    } else {
      node.childrenAfterGroup = [];
    }
    return node;
  }

  private materialiseParentIdTree(sourceNodes: RowNode[], parentIdField: string): RowNode[] {
    const byId = new Map<string, RowNode>();
    for (const node of sourceNodes) {
      if (node.id) byId.set(node.id, node);
      node.childrenAfterGroup = [];
    }
    const roots: RowNode[] = [];
    for (const node of sourceNodes) {
      const parentId = this.readField(node.data ?? {}, parentIdField);
      const parent = parentId == null ? undefined : byId.get(String(parentId));
      if (!parent || parent === node || this.wouldCreateCycle(node, parent) || this.parentChainContains(node, parent, parentIdField, byId)) {
        if (parentId != null) this.warnInvalidTree(`Ignoring invalid tree parent for '${node.id ?? 'unknown'}'.`);
        roots.push(node);
      } else {
        parent.childrenAfterGroup?.push(node);
      }
    }
    return roots;
  }

  private createTreeFiller(pathId: string, key: string): RowNode {
    const node = new RowNodeClass(this.beans);
    node.id = `tree-filler:${pathId}`;
    node.key = key;
    node.field = 'treeData';
    node.data = undefined;
    node.childrenAfterGroup = [];
    node.sourceRowIndex = -1;
    return node;
  }

  private createTreeDataNode(data: Record<string, unknown>, index: number): RowNode {
    const node = new RowNodeClass(this.beans);
    const getRowId = this.gos.get('getRowId') as ((params: { data: Record<string, unknown>; level: number }) => string) | undefined;
    // Avoid calling RowNode.setDataAndId here: nested source rows are
    // materialised before the client node manager registers them. The shared
    // stage still honours getRowId when it is present.
    node.data = data;
    node.id = getRowId?.({ data, level: 0 }) ?? String(index);
    node.sourceRowIndex = index;
    return node;
  }

  private isTreeNodeExpandedByDefault(node: RowNode): boolean {
    const open = this.gos.get('isGroupOpenByDefault') as IsGroupOpenByDefault | undefined;
    if (open) return !!open(_addGridCommonParams(this.gos, { rowNode: node, rowGroupColumn: null as unknown as AgColumn, level: node.level, field: node.field ?? 'treeData', key: node.key ?? '' }));
    const defaultExpanded = this.gos.get('groupDefaultExpanded');
    return defaultExpanded === -1 || (typeof defaultExpanded === 'number' && node.level < defaultExpanded);
  }

  private readField(data: Record<string, unknown>, field: string): unknown {
    return field.split('.').reduce<unknown>((value, part) => value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, data);
  }

  private wouldCreateCycle(node: RowNode, parent: RowNode): boolean {
    const seen = new Set<RowNode>([node]);
    let current: RowNode | null | undefined = parent;
    while (current) {
      if (seen.has(current)) return true;
      seen.add(current);
      current = current.parent;
    }
    return false;
  }

  private parentChainContains(node: RowNode, parent: RowNode, field: string, nodes: ReadonlyMap<string, RowNode>): boolean {
    const seen = new Set<string>();
    let current: RowNode | undefined = parent;
    while (current?.id && !seen.has(current.id)) {
      if (current === node) return true;
      seen.add(current.id);
      const parentId = this.readField(current.data ?? {}, field);
      current = parentId == null ? undefined : nodes.get(String(parentId));
    }
    return false;
  }

  private warnInvalidTree(message: string): void {
    // Diagnostic rather than an exception: malformed parent IDs must never
    // create an infinite traversal or make the rest of the grid unusable.
    console.warn(`LibreGrid Tree Data: ${message}`);
  }

  private reparentTreeNode(node: RowNode, target: RowNode): void {
    if (!node.data || !target.data || node === target || this.wouldCreateCycle(node, target)) return;
    const childrenField = this.gos.get('treeDataChildrenField');
    const parentIdField = this.gos.get('treeDataParentIdField');
    if (typeof childrenField === 'string' && childrenField) {
      const oldChildren = node.parent?.data ? this.readField(node.parent.data, childrenField) : undefined;
      if (Array.isArray(oldChildren)) { const index = oldChildren.indexOf(node.data); if (index >= 0) oldChildren.splice(index, 1); }
      let targetChildren = this.readField(target.data, childrenField);
      if (!Array.isArray(targetChildren)) { targetChildren = []; this.writeField(target.data, childrenField, targetChildren); }
      (targetChildren as Record<string, unknown>[]).push(node.data);
    } else if (typeof parentIdField === 'string' && parentIdField) {
      this.writeField(node.data, parentIdField, target.id);
    } else {
      const getPath = this.gos.get('getDataPath') as ((data: Record<string, unknown>) => string[]) | undefined;
      const path = getPath?.(node.data) ?? [];
      const targetPath = getPath?.(target.data) ?? [];
      if (Array.isArray((node.data as Record<string, unknown>).path) && path.length && targetPath.length) (node.data as Record<string, unknown>).path = [...targetPath, path.at(-1)!];
    }
    node.parent = target;
    target.expanded = true;
    _getClientSideRowModel(this.beans)?.refreshModel({ step: 'group', rowDataUpdated: true });
  }

  private writeField(data: Record<string, unknown>, field: string, value: unknown): void {
    const keys = field.split('.'); let current = data;
    for (const key of keys.slice(0, -1)) { const next = current[key]; if (!next || typeof next !== 'object') current[key] = {}; current = current[key] as Record<string, unknown>; }
    current[keys.at(-1)!] = value;
  }
}
