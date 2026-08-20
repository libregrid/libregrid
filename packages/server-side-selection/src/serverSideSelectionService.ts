import {
  BaseSelectionService,
  _getGroupSelection,
  _getGroupSelectsDescendants,
  _getRowSelectionMode,
  _isMultiRowSelection,
  _isRowSelection,
  _isUsingNewRowSelectionAPI,
  type ChangedPath,
  type GridApi,
  type GridOptions,
  type IRowNode,
  type ISetNodesSelectedParams,
  type RowNode,
  type RowSelectionMode,
  type SelectAllMode,
  type SelectionEventSourceType,
} from 'ag-grid-community';
import { SsrmSelectionService } from './ssrmSelectionService';

/**
 * The SSRM row model as seen by the selection service: the loaded-row
 * traversal seams. `forEachNodeAfterFilter` is the Phase-16 addition to
 * `@libregrid/server-side-row-model`. Structural typing keeps this package
 * coupled to the contract, not the class.
 */
interface SsrmRowModel {
  forEachNode(callback: (node: RowNode, index: number) => void): void;
  forEachNodeAfterFilter(callback: (node: IRowNode<unknown>, index: number) => void): void;
  getRowNode(id: string): RowNode | undefined;
  getRow(index: number): RowNode | undefined;
}

/**
 * `ISetNodesSelectedParams` plus the service-internal `keepDescendants`
 * flag (the community interface does not carry it; only internal paths do).
 */
interface SsrmSetNodesSelectedParams extends ISetNodesSelectedParams {
  keepDescendants?: boolean;
}

/**
 * The `selectionSvc` bean for server-side row model grids.
 *
 * Community's `RowSelectionModule` registers its `SelectionService` only for
 * the `clientSide`/`infinite`/`viewport` row models. A server-side grid
 * therefore boots with no `selectionSvc` bean, and every selection seam —
 * the checkbox column, the header select-all, row clicks, keyboard
 * selection, and the `setNodesSelected`/`selectAll` API family — is a silent
 * no-op. This service fills that seam: it extends the community
 * `BaseSelectionService` (the row-model-agnostic mechanics — the
 * `selectRowNode` flip with its per-node global `rowSelected`, the
 * `isRowSelectable` pass, the checkbox component, the select-all feature)
 * and implements the row-model-specific parts over the rows the SSRM
 * currently has loaded.
 *
 * Durable selection state lives elsewhere by design: the SSRM working copy
 * (purged with evicted blocks) and the server-side spec owned by
 * `SsrmSelectionService`. This service is the view over whatever the grid
 * has in memory — and the event source the spec's op capture listens to.
 */
export class ServerSideSelectionService extends BaseSelectionService {
  public beanName = 'selectionSvc' as const;

  private mode: RowSelectionMode = 'multiRow';
  private groupSelectsDescendants = false;
  private groupSelectsFiltered = false;

  // Selection batch: while depth > 0, `selectionChanged` is coalesced into one
  // pending event (carrying the first source seen) and flushed when the
  // outermost batch ends.
  private selectionBatchDepth = 0;
  private pendingSelectionChanged = false;
  private pendingSelectionSource: SelectionEventSourceType | null = null;

  /** The feature service (op capture, spec lifecycle, footer, selection
   *  view). A managed sub-bean: wired, constructed, and destroyed with this
   *  service — it has no `BeanCollection` slot of its own. */
  private ssrmSelectionSvc!: SsrmSelectionService;

  private get ssrm(): SsrmRowModel {
    return this.beans.rowModel as unknown as SsrmRowModel;
  }

  public getSsrmSelectionService(): SsrmSelectionService {
    return this.ssrmSelectionSvc;
  }

  public override postConstruct(): void {
    super.postConstruct();
    this.ssrmSelectionSvc = this.createManagedBean(new SsrmSelectionService());
    const { gos } = this;
    this.mode = _getRowSelectionMode(gos) ?? 'multiRow';
    this.groupSelectsDescendants = _getGroupSelectsDescendants(gos);
    this.groupSelectsFiltered = _getGroupSelection(gos) === 'filteredDescendants';
    this.addManagedPropertyListeners(
      ['groupSelectsChildren', 'groupSelectsFiltered', 'rowSelection'],
      () => {
        const groupSelectsDescendants = _getGroupSelectsDescendants(gos);
        const selectionMode = _getRowSelectionMode(gos) ?? 'multiRow';
        const groupSelectsFiltered = _getGroupSelection(gos) === 'filteredDescendants';
        if (
          groupSelectsDescendants !== this.groupSelectsDescendants ||
          groupSelectsFiltered !== this.groupSelectsFiltered ||
          selectionMode !== this.mode
        ) {
          this.deselectAllRowNodes({ source: 'api' });
          this.groupSelectsDescendants = groupSelectsDescendants;
          this.groupSelectsFiltered = groupSelectsFiltered;
          this.mode = selectionMode;
        }
      },
    );
    // The base constructor already routes `isRowSelectable`/`rowSelection`
    // swaps to `updateSelectable` and per-row data changes to
    // `updateRowSelectable`; the SSRM materializes rows itself and calls
    // `updateRowSelectable` per node at its node-creation sites.
  }

  public override destroy(): void {
    super.destroy();
    this.resetNodes();
  }

  // ---------------------------------------------------------------------
  // Node selection
  // ---------------------------------------------------------------------

  public override setNodesSelected(params: SsrmSetNodesSelectedParams): number {
    const { newValue, clearSelection, suppressFinishActions, nodes, event, source, keepDescendants } =
      params;
    const nodesLength = nodes.length;
    if (nodesLength === 0) {
      return 0;
    }
    const { gos } = this;
    if (!_isRowSelection(gos) && newValue) {
      this.warn(132);
      return 0;
    }
    const isMultiSelect = this.isMultiSelect();
    if (nodesLength > 1 && !isMultiSelect) {
      this.warn(130);
      return 0;
    }
    let updatedCount = 0;
    for (let i = 0; i < nodesLength; i++) {
      const rowNode = nodes[i];
      if (rowNode === undefined) {
        continue;
      }
      const node = rowNode.primaryRow;
      if (node.rowPinned && !this.isManualPinnedRow(node)) {
        this.warn(59);
        continue;
      }
      if (node.id === undefined) {
        this.warn(60);
        continue;
      }
      if (newValue && rowNode.destroyed) {
        continue;
      }
      const skipThisNode = this.groupSelectsFiltered && node.group && !gos.get('treeData');
      if (!skipThisNode) {
        if (this.selectRowNode(node, newValue, event, source)) {
          updatedCount++;
        }
      }
      if (this.groupSelectsDescendants && node.childrenAfterGroup?.length) {
        updatedCount += this.selectChildren(node, newValue, source, event);
      }
    }
    if (!suppressFinishActions) {
      const single = nodes[0];
      if (nodesLength === 1 && source === 'api' && single !== undefined) {
        this.selectionCtx.setRoot(single.primaryRow);
      }
      const clearOtherNodes = newValue && (clearSelection || !isMultiSelect);
      if (clearOtherNodes && single !== undefined) {
        updatedCount += this.clearOtherNodes(single.primaryRow, keepDescendants, source);
      }
      if (updatedCount > 0) {
        this.updateGroupsFromChildrenSelections(source, undefined, event);
        this.dispatchSelectionChanged(source);
      }
    }
    return updatedCount;
  }

  public handleSelectionEvent(
    event: MouseEvent | KeyboardEvent,
    rowNode: RowNode,
    source: SelectionEventSourceType,
  ): number {
    if (this.isRowSelectionBlocked(rowNode)) {
      return 0;
    }
    const selection = this.inferNodeSelections(
      rowNode,
      event.shiftKey,
      event.metaKey || event.ctrlKey,
      source,
    );
    if (selection === null) {
      return 0;
    }
    this.selectionCtx.selectAll = false;
    if ('select' in selection) {
      if (selection.reset) {
        this.resetNodes();
      } else {
        this.selectRange(selection.deselect, false, source);
      }
      return this.selectRange(selection.select, true, source);
    }
    const params: SsrmSetNodesSelectedParams = {
      nodes: [selection.node],
      newValue: selection.newValue,
      clearSelection: selection.clearSelection,
      event,
      source,
    };
    if (selection.keepDescendants !== undefined) {
      params.keepDescendants = selection.keepDescendants;
    }
    return this.setNodesSelected(params);
  }

  /** Row-range (shift-select) helper: flips each node, then rolls up and dispatches once. */
  private selectRange(
    nodesToSelect: readonly RowNode[],
    value: boolean,
    source: SelectionEventSourceType,
  ): number {
    let updatedCount = 0;
    for (const rowNode of nodesToSelect) {
      const primaryRow = rowNode.primaryRow;
      if (primaryRow.group && this.groupSelectsDescendants) {
        continue;
      }
      if (this.selectRowNode(primaryRow, value, undefined, source)) {
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      this.updateGroupsFromChildrenSelections(source);
      this.dispatchSelectionChanged(source);
    }
    return updatedCount;
  }

  private selectChildren(
    node: RowNode,
    newValue: boolean,
    source: SelectionEventSourceType,
    event: Event | undefined,
  ): number {
    const children = this.groupSelectsFiltered ? node.childrenAfterAggFilter : node.childrenAfterGroup;
    if (children === null) {
      return 0;
    }
    const params: SsrmSetNodesSelectedParams = {
      newValue,
      clearSelection: false,
      suppressFinishActions: true,
      source,
      nodes: children,
    };
    if (event !== undefined) {
      params.event = event;
    }
    return this.setNodesSelected(params);
  }

  private isManualPinnedRow(rowNode: RowNode): boolean {
    return !!(rowNode.rowPinned && rowNode.pinnedSibling);
  }

  private isDescendantOf(root: RowNode, child: RowNode): boolean {
    let parent: RowNode | null = child.parent;
    while (parent !== null) {
      if (parent === root) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  // ---------------------------------------------------------------------
  // Selected-set queries (bounded by the datasource cache)
  // ---------------------------------------------------------------------

  public getSelectedNodes(): RowNode[] {
    const nodes: RowNode[] = [];
    this.ssrm.forEachNode((node) => {
      if (node.isSelected() && !(this.groupSelectsDescendants && node.group)) {
        nodes.push(node);
      }
    });
    return nodes;
  }

  public getSelectedRows(): unknown[] {
    const selectedRows: unknown[] = [];
    for (const rowNode of this.getSelectedNodes()) {
      const data = rowNode.data;
      if (data !== undefined && data !== null) {
        selectedRows.push(data);
      }
    }
    return selectedRows;
  }

  public getSelectionCount(): number {
    return this.getSelectedNodes().length;
  }

  public isEmpty(): boolean {
    let empty = true;
    this.ssrm.forEachNode((node) => {
      empty = empty && !node.isSelected();
    });
    return empty;
  }

  /**
   * The loaded rows' selection as an id list (or `null` when nothing loaded
   * is selected). The durable spec — terms, exceptions, additions — is the
   * server's; this is the in-memory projection.
   */
  public getSelectionState(): string[] | null {
    const ids = this.getSelectedNodes()
      .map((node) => node.id)
      .filter((id): id is string => id !== undefined);
    return ids.length === 0 ? null : ids;
  }

  /**
   * Applies an id list to the loaded rows (v1 accepts id lists only; the
   * structured server-side state shapes are the bean's snapshot API's
   * domain). Unknown ids are ignored — their rows are not loaded.
   */
  public setSelectionState(
    state: string[] | undefined,
    source: SelectionEventSourceType,
    clearSelection?: boolean,
  ): void {
    if (state !== undefined && !Array.isArray(state)) {
      this.error(103);
      return;
    }
    if (clearSelection) {
      this.resetNodes();
    }
    const wanted = new Set(state ?? []);
    const nodes: RowNode[] = [];
    this.ssrm.forEachNode((node) => {
      if (node.id !== undefined && wanted.has(node.id)) {
        nodes.push(node);
      }
    });
    if (nodes.length > 0) {
      this.setNodesSelected({ nodes, newValue: true, clearSelection: false, source });
    }
  }

  /**
   * No-op for the SSRM: node lifetime is owned by the row model, whose
   * working copy purges evicted ids and re-resolves state from the spec when
   * a row is requested again.
   */
  public removeFromSelection(_node: RowNode, _source: SelectionEventSourceType): void {
    // intentionally empty — see the method doc comment
  }

  public syncInRowNode(rowNode: RowNode, oldNode?: RowNode): void {
    if (oldNode !== undefined) {
      rowNode.__selected = oldNode.__selected;
    }
  }

  public getBestCostNodeSelection(): RowNode[] | undefined {
    const nodes: RowNode[] = [];
    this.ssrm.forEachNode((node) => {
      if (node.isSelected()) {
        nodes.push(node);
      }
    });
    return nodes.length > 0 ? nodes : undefined;
  }

  // ---------------------------------------------------------------------
  // Select-all (header checkbox, keyboard, API)
  // ---------------------------------------------------------------------

  public getSelectAllState(selectAll?: SelectAllMode): boolean | null {
    let selectedCount = 0;
    let notSelectedCount = 0;
    for (const node of this.getNodesToSelect(selectAll)) {
      if (this.groupSelectsDescendants && node.group) {
        continue;
      }
      if (node.isSelected()) {
        selectedCount++;
      } else if (node.selectable) {
        notSelectedCount++;
      }
    }
    if (selectedCount === 0 && notSelectedCount === 0) {
      return false;
    }
    if (selectedCount > 0 && notSelectedCount > 0) {
      return null;
    }
    return selectedCount > 0;
  }

  public hasNodesToSelect(selectAll?: SelectAllMode): boolean {
    for (const node of this.getNodesToSelect(selectAll)) {
      if (node.selectable) {
        return true;
      }
    }
    return false;
  }

  public selectAllRowNodes(params: {
    source: SelectionEventSourceType;
    selectAll?: SelectAllMode;
  }): void {
    const { gos, selectionCtx } = this;
    if (!_isRowSelection(gos)) {
      this.warn(132);
      return;
    }
    if (_isUsingNewRowSelectionAPI(gos) && !_isMultiRowSelection(gos)) {
      this.warn(130);
      return;
    }
    const { source, selectAll: selectAllMode } = params;
    let updatedNodes = false;
    for (const node of this.getNodesToSelect(selectAllMode)) {
      updatedNodes = this.selectRowNode(node.primaryRow, true, undefined, source) || updatedNodes;
    }
    selectionCtx.selectAll = true;
    if (this.groupSelectsDescendants) {
      updatedNodes = this.updateGroupsFromChildrenSelections(source) || updatedNodes;
    }
    if (updatedNodes) {
      this.dispatchSelectionChanged(source);
    }
  }

  public deselectAllRowNodes(params: {
    source: SelectionEventSourceType;
    selectAll?: SelectAllMode;
  }): void {
    const { source, selectAll: selectAllMode } = params;
    let updatedNodes = false;
    const deselect = (rowNode: RowNode): void => {
      if (this.selectRowNode(rowNode.primaryRow, false, undefined, source)) {
        updatedNodes = true;
      }
    };
    if (selectAllMode === 'currentPage' || selectAllMode === 'filtered') {
      for (const node of this.getNodesToSelect(selectAllMode)) {
        deselect(node);
      }
    } else {
      this.ssrm.forEachNode((node) => {
        if (node.isSelected()) {
          deselect(node);
        }
      });
    }
    this.selectionCtx.selectAll = false;
    if (this.groupSelectsDescendants) {
      updatedNodes = this.updateGroupsFromChildrenSelections(source) || updatedNodes;
    }
    if (updatedNodes) {
      this.dispatchSelectionChanged(source);
    }
  }

  /**
   * The rows a select-all in `mode` would flip. The SSRM owns its node
   * lifecycle, so the scopes are: the viewport's rows, or the loaded (i.e.
   * server-filtered) rows — for both `filtered` and the default, re-walked
   * through the row model's filtered traversal seam.
   */
  private getNodesToSelect(selectAll?: SelectAllMode): RowNode[] {
    const nodes: RowNode[] = [];
    const addToResult = (node: RowNode): void => {
      nodes.push(node);
    };
    if (selectAll === 'currentPage') {
      this.forEachNodeOnPage((node) => {
        if (!node.group) {
          addToResult(node);
          return;
        }
        if (!node.footer && !node.expanded) {
          // A collapsed group on the page carries its loaded rows: select them too.
          const recursivelyAddChildren = (child: RowNode): void => {
            addToResult(child);
            const children = child.childrenAfterFilter;
            if (children !== null) {
              for (const grandchild of children) {
                recursivelyAddChildren(grandchild);
              }
            }
          };
          recursivelyAddChildren(node);
          return;
        }
        if (!this.groupSelectsDescendants) {
          addToResult(node);
        }
      });
      return nodes;
    }
    if (selectAll === 'filtered') {
      this.ssrm.forEachNodeAfterFilter((node) => {
        addToResult(node as RowNode);
      });
      return nodes;
    }
    this.ssrm.forEachNode(addToResult);
    return nodes;
  }

  private forEachNodeOnPage(callback: (node: RowNode) => void): void {
    const { pageBounds, rowModel } = this.beans;
    const firstRow = pageBounds.getFirstRow();
    const lastRow = pageBounds.getLastRow();
    for (let i = firstRow; i <= lastRow; i++) {
      const node = rowModel.getRow(i);
      if (node !== undefined) {
        callback(node);
      }
    }
  }

  // ---------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------

  public reset(source: SelectionEventSourceType): void {
    if (this.isEmpty()) {
      return;
    }
    this.resetNodes();
    this.dispatchSelectionChanged(source);
  }

  private resetNodes(): void {
    const selected: RowNode[] = [];
    this.ssrm.forEachNode((node) => {
      if (node.isSelected()) {
        selected.push(node);
      }
    });
    for (const node of selected) {
      this.selectRowNode(node, false, undefined, 'api');
    }
    if (this.groupSelectsDescendants) {
      this.updateGroupsFromChildrenSelections('api');
    }
  }

  // ---------------------------------------------------------------------
  // Group roll-up
  // ---------------------------------------------------------------------

  public override updateGroupsFromChildrenSelections(
    source: SelectionEventSourceType,
    _changedPath?: ChangedPath,
    event?: Event,
  ): boolean {
    if (!this.groupSelectsDescendants) {
      return false;
    }
    let selectionChanged = false;
    this.ssrm.forEachNode((rowNode) => {
      if (!rowNode.group) {
        return;
      }
      const selected = this.calculateSelectedFromChildren(rowNode);
      selectionChanged =
        this.selectRowNode(rowNode, selected === null ? false : selected, event, source) ||
        selectionChanged;
    });
    return selectionChanged;
  }

  private clearOtherNodes(
    rowNodeToKeepSelected: RowNode,
    keepDescendants: boolean | undefined,
    source: SelectionEventSourceType,
  ): number {
    const groupsToRefresh = new Map<string, RowNode>();
    let updatedCount = 0;
    for (const otherRowNode of this.getSelectedNodes()) {
      const isNodeToKeep = otherRowNode.id === rowNodeToKeepSelected.id;
      const shouldClearDescendant = keepDescendants
        ? !this.isDescendantOf(rowNodeToKeepSelected, otherRowNode)
        : true;
      if (shouldClearDescendant && !isNodeToKeep) {
        updatedCount += this.setNodesSelected({
          nodes: [otherRowNode],
          newValue: false,
          clearSelection: false,
          suppressFinishActions: true,
          source,
        });
        const parent = otherRowNode.parent;
        if (this.groupSelectsDescendants && parent !== null && parent.id !== undefined) {
          groupsToRefresh.set(parent.id, parent);
        }
      }
    }
    for (const group of groupsToRefresh.values()) {
      const selected = this.calculateSelectedFromChildren(group);
      this.selectRowNode(group, selected === null ? false : selected, undefined, source);
    }
    return updatedCount;
  }

  // ---------------------------------------------------------------------
  // Selectable pass
  // ---------------------------------------------------------------------

  public override updateSelectable(_changedPath?: ChangedPath): void {
    if (!_isRowSelection(this.gos)) {
      return;
    }
    this.selectionBatchDepth++;
    try {
      this.ssrm.forEachNode((node) => {
        this.updateRowSelectable(node);
      });
      if (this.groupSelectsDescendants) {
        this.updateGroupsFromChildrenSelections('selectableChanged');
      }
    } finally {
      this.endSelectionBatch();
    }
  }

  /**
   * Single post-refresh selectable pass (the CSR calls this after its row
   * updates; the SSRM triggers `updateSelectable`/`updateRowSelectable` from
   * its own node lifecycle, so this is a batched full pass).
   */
  public updateSelectableAfterGrouping(
    changedPath: ChangedPath | undefined,
    _changedRowNodes?: unknown,
  ): void {
    this.updateSelectable(changedPath);
  }

  // ---------------------------------------------------------------------
  // Selection change events
  // ---------------------------------------------------------------------

  /**
   * Dispatches `selectionChanged`, coalesced into one event per selection
   * batch (bulk flips — select-all, hydration deltas — fire one event, not
   * one per row).
   */
  public dispatchSelectionChanged(source: SelectionEventSourceType): void {
    if (this.selectionBatchDepth > 0) {
      this.pendingSelectionChanged = true;
      this.pendingSelectionSource ??= source;
      return;
    }
    this.pendingSelectionChanged = false;
    this.pendingSelectionSource = null;
    this.eventSvc.dispatchEvent({
      type: 'selectionChanged',
      source,
      selectedNodes: this.getSelectedNodes(),
      serverSideState: null,
    });
  }

  /** Flushes a pending coalesced event when its batch closed without one. */
  public flushPendingSelectionChanged(): void {
    if (this.selectionBatchDepth === 0 && this.pendingSelectionChanged) {
      this.pendingSelectionChanged = false;
      this.dispatchSelectionChanged(this.pendingSelectionSource ?? 'api');
    }
  }

  private endSelectionBatch(): void {
    if (--this.selectionBatchDepth === 0) {
      if (this.pendingSelectionChanged) {
        this.pendingSelectionChanged = false;
        this.dispatchSelectionChanged(this.pendingSelectionSource ?? 'api');
      }
    }
  }

  // ---------------------------------------------------------------------
  // Master-detail (out of scope for the SSRM selection v1 — inert stubs so
  // the `ISelectionService` surface stays complete)
  // ---------------------------------------------------------------------

  public refreshMasterNodeState(_node: RowNode, _e?: Event): void {
    // master-detail selection is not supported over the server-side row model in v1
  }

  public setDetailSelectionState(_masterNode: RowNode, _option: GridOptions, _detailApi: GridApi): void {
    // master-detail selection is not supported over the server-side row model in v1
  }
}
