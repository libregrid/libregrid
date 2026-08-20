import {
  BeanStub,
  ROOT_NODE_ID,
  RowNode,
  _getRowHeightAsNumber,
  _getRowIdCallback,
  _getSortModel,
  type AgColumn,
  type ColumnVO,
  type IRowNode,
  type IServerSideDatasource,
  type IServerSideRowModel,
  type IServerSideSelectionState,
  type LoadSuccessParams,
  type NamedBean,
  type RefreshServerSideParams,
  type RowBounds,
  type RowModelType,
  ServerSideTransactionResultStatus,
  type ServerSideTransaction,
  type ServerSideTransactionResult,
  type ServerSideGroupLevelState,
} from 'ag-grid-community';

interface HierarchicalStore {
  route: string[];
  parentNode: RowNode;
  rows: RowNode[];
  loading: boolean;
  failed: boolean;
  generation: number;
  rowCount: number;
}

type SsrmNode = RowNode & { __lgrSsrmRoute?: string[]; __lgrSsrmStore?: HierarchicalStore };

/**
 * The SSRM group route of a node — its chain of ancestor group keys, root to
 * self — or `undefined` for leaf rows. Selection features use this to promote
 * single-row operations to whole-group operations.
 */
export function getSsrmRoute(node: IRowNode<unknown>): string[] | undefined {
  return (node as SsrmNode).__lgrSsrmRoute;
}

type PartialBlockState = 'waiting' | 'loading' | 'loaded' | 'failed';

interface PartialBlock {
  id: number;
  startRow: number;
  endRow: number;
  nodes: RowNode[];
  state: PartialBlockState;
  lastAccessed: number;
  generation: number;
}

/** Minimal built-in renderer for partial-store rows while their block loads. */
export class ServerSideLoadingCellRenderer {
  private element: HTMLSpanElement | undefined;

  public init(): void {
    this.element = document.createElement('span');
    this.element.className = 'ag-loading-cell';
    this.element.setAttribute('aria-busy', 'true');
    this.element.textContent = 'Loading…';
  }

  public getGui(): HTMLElement {
    return this.element!;
  }
}

/**
 * Flat server-side row model foundation.
 *
 * Phase 7 begins with a full root store so a real server-side datasource can
 * drive a real grid. Partial block stores, transactions, and selection are
 * added in follow-up slices without changing this row-model seam.
 *
 * @feature Server-Side Row Model
 */
export class ServerSideRowModel extends BeanStub implements NamedBean, IServerSideRowModel<unknown> {
  public beanName = 'rowModel' as const;
  public rootNode: RowNode | null = null;
  public get hierarchical(): boolean { return this.isHierarchical(); }

  private datasource: IServerSideDatasource<unknown> | undefined;
  private rows: RowNode[] = [];
  private rowCount = 0;
  private lastRowIndexKnown = false;
  private loadGeneration = 0;
  private loading = false;
  private failed = false;
  private partial = false;
  private blockSequence = 0;
  private readonly blocks = new Map<number, PartialBlock>();
  private readonly pendingBlockLoads = new Map<number, PartialBlock>();
  private blockLoadTimer: ReturnType<typeof setTimeout> | undefined;
  private inFlightBlockLoads = 0;
  /**
   * Selection working copy — a query-avoidance cache, not the source of truth.
   *
   * `selectionBaseline` is the default applied to loaded rows,
   * `selectionToggledIds` holds the rows that deviate from it, and
   * `selectedGroupRoutes` records group rows' selection. The
   * `@libregrid/server-side-selection` package keeps this in sync with the
   * server-side selection spec. Invariant: entries only reference rows
   * currently in the grid cache — state is purged when rows are evicted or
   * dropped, and re-resolved from the API when the rows are requested again.
   */
  private selectionBaseline = false;
  private readonly selectionToggledIds = new Set<string>();
  private selectionUpdateInProgress = false;
  private readonly selectedGroupRoutes = new Map<string, boolean>();
  private readonly asyncTransactions: Array<{
    transaction: ServerSideTransaction<unknown>;
    callback?: (result: ServerSideTransactionResult<unknown>) => void;
  }> = [];
  private asyncTransactionTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly hierarchyStores = new Map<string, HierarchicalStore>();
  private expandAllDefault: boolean | undefined;
  private readonly expandedRoutes = new Set<string>();

  public postConstruct(): void {
    this.rootNode = this.createRootNode();
    this.addManagedPropertyListener('serverSideDatasource', () => {
      this.setDatasource(this.gos.get('serverSideDatasource'));
    });
    this.addManagedEventListeners({
      columnRowGroupChanged: () => this.refreshStore(),
      columnPivotChanged: () => this.refreshStore(),
      columnValueChanged: () => this.refreshStore(),
      columnPivotModeChanged: () => this.refreshStore(),
    });
    this.addManagedEventListeners({
      rowSelected: (event) => {
        if (this.selectionUpdateInProgress || !event.node || event.node.stub || !event.node.id) return;
        this.updateSelection(event.node.id, event.node.isSelected() === true);
      },
    });
  }

  public start(): void {
    this.setDatasource(this.gos.get('serverSideDatasource'));
  }

  public override destroy(): void {
    this.invalidateLoad();
    this.clearPendingBlockLoads();
    this.destroyDatasource();
    this.rows = [];
    this.blocks.clear();
    this.hierarchyStores.clear();
    this.partial = false;
    this.flushAsyncTransactions();
    this.rootNode = null;
    super.destroy();
  }

  public getType(): RowModelType {
    return 'serverSide';
  }

  public getRow(index: number): RowNode | undefined {
    if (this.isHierarchical()) return this.hierarchicalRows()[index];
    if (this.partial) return this.getPartialRow(index);
    return this.rows[index];
  }

  public getRowNode(id: string): RowNode | undefined {
    return this.allLoadedRows().find((node) => node.id === id);
  }

  public getRowCount(): number {
    if (this.isHierarchical()) return this.hierarchicalRows().length;
    return this.rowCount;
  }

  public getTopLevelRowCount(): number {
    if (this.isHierarchical()) return this.rootStore()?.rows.length ?? 0;
    return this.rowCount;
  }

  public getTopLevelRowDisplayedIndex(topLevelIndex: number): number {
    if (this.isHierarchical()) {
      const node = this.rootStore()?.rows[topLevelIndex];
      return node ? this.hierarchicalRows().indexOf(node) : -1;
    }
    return topLevelIndex;
  }

  public getRowIndexAtPixel(pixel: number): number {
    const rowHeight = _getRowHeightAsNumber(this.beans);
    const count = this.displayedRowCount();
    if (rowHeight <= 0 || count === 0) return 0;
    return Math.min(Math.floor(pixel / rowHeight), count - 1);
  }

  public isRowPresent(rowNode: RowNode): boolean {
    return this.allLoadedRows().includes(rowNode);
  }

  public getRowBounds(index: number): RowBounds | null {
    if (index < 0 || index >= this.displayedRowCount()) return null;
    const rowHeight = _getRowHeightAsNumber(this.beans);
    return { rowTop: index * rowHeight, rowHeight, rowIndex: index };
  }

  public isEmpty(): boolean {
    if (this.isHierarchical()) return !this.loading && (this.rootStore()?.rows.length ?? 0) === 0;
    return !this.loading && !this.failed && this.rowCount === 0;
  }

  public isRowsToRender(): boolean {
    if (this.isHierarchical()) return this.loading || this.hierarchicalRows().length > 0;
    return this.loading || this.loadedRows().length > 0;
  }

  public getOverlayType(): 'loading' | 'noRows' | null {
    if (this.loading) return 'loading';
    return this.isEmpty() ? 'noRows' : null;
  }

  public getNodesInRangeForSelection(first: RowNode, last: RowNode): RowNode[] | null {
    const rows = this.isHierarchical() ? this.hierarchicalRows() : this.loadedRows();
    const firstIndex = rows.indexOf(first);
    const lastIndex = rows.indexOf(last);
    if (firstIndex < 0 || lastIndex < 0) return null;
    const [start, end] = firstIndex < lastIndex ? [firstIndex, lastIndex] : [lastIndex, firstIndex];
    return rows.slice(start, end + 1);
  }

  public forEachNode(callback: (node: RowNode, index: number) => void): void {
    this.allLoadedRows().forEach(callback);
  }

  public isLastRowIndexKnown(): boolean {
    return this.lastRowIndexKnown;
  }

  public ensureRowHeightsValid(): boolean {
    return false;
  }

  public resetRowHeights(): void {
    const rowHeight = _getRowHeightAsNumber(this.beans);
    (this.isHierarchical() ? this.hierarchicalRows() : this.loadedRows()).forEach((node, index) => this.positionNode(node, index, rowHeight));
    this.dispatchModelUpdated();
  }

  public onRowHeightChanged(): void {
    this.resetRowHeights();
  }

  public refreshStore(_params?: RefreshServerSideParams): void {
    if (!this.datasource) return;
    if (this.isHierarchical()) {
      const route = _params?.route ?? [];
      const store = this.hierarchyStores.get(this.routeId(route));
      if (route.length === 0 && !_params?.route) this.clearChildStores();
      if (store) this.loadHierarchyStore(store, !!_params?.purge);
      return;
    }
    if (this.partial) {
      this.invalidateLoad();
      this.clearPendingBlockLoads();
      this.blocks.clear();
      this.initialisePartialStore();
    } else {
      this.loadRootStore();
    }
  }

  public getStoreState(): ServerSideGroupLevelState[] {
    if (this.isHierarchical()) {
      return [...this.hierarchyStores.values()].map((store) => ({
        route: store.route,
        rowCount: store.rowCount,
        lastRowIndexKnown: !store.loading,
      }));
    }
    return [
      {
        route: [],
        rowCount: this.rowCount,
        lastRowIndexKnown: this.lastRowIndexKnown,
      },
    ];
  }

  public retryLoads(): void {
    if (this.partial) {
      for (const block of this.blocks.values()) {
        if (block.state === 'failed') {
          block.state = 'waiting';
          this.scheduleBlockLoad(block);
        }
      }
    } else if (this.failed) this.loadRootStore();
  }

  public setDatasource(datasource: IServerSideDatasource<unknown> | undefined): void {
    if (this.datasource === datasource) return;
    this.invalidateLoad();
    this.destroyDatasource();
    this.datasource = datasource;
    this.rows = [];
    this.clearPendingBlockLoads();
    this.blocks.clear();
    this.hierarchyStores.clear();
    this.resetSelectionState();
    this.rowCount = 0;
    this.lastRowIndexKnown = false;
    this.failed = false;
    const maxBlocksInCache = this.gos.get('maxBlocksInCache');
    this.partial = datasource !== undefined && !this.isHierarchical() && typeof maxBlocksInCache === 'number' && maxBlocksInCache > 0;
    if (datasource) {
      if (this.isHierarchical()) this.initialiseHierarchyStore();
      else if (this.partial) this.initialisePartialStore();
      else this.loadRootStore();
    }
    else this.dispatchModelUpdated();
  }

  public forEachNodeAfterFilterAndSort(
    callback: (node: IRowNode<unknown>, index: number) => void,
  ): void {
    (this.isHierarchical() ? this.hierarchicalRows() : this.loadedRows()).forEach(callback);
  }

  /**
   * SSRM keeps its filtered view in the same row list as its sorted view
   * (the server applies both), so a filter-only walk is a loaded-rows walk.
   * This makes core's 'filtered' select-all path (which calls this) work
   * under SSRM instead of throwing.
   */
  public forEachNodeAfterFilter(callback: (node: IRowNode<unknown>, index: number) => void): void {
    this.forEachNodeAfterFilterAndSort(callback);
  }

  public resetRootStore(): void {
    this.refreshStore();
  }

  public getBlockStates(): Record<string, { pageStatus: PartialBlockState }> {
    return Object.fromEntries(
      [...this.blocks.entries()].map(([id, block]) => [String(id), { pageStatus: block.state }]),
    );
  }

  public setRowCount(rowCount: number, isLastRowIndexKnown = true): void {
    this.rowCount = Math.max(0, rowCount);
    this.lastRowIndexKnown = isLastRowIndexKnown;
    this.dispatchModelUpdated();
  }

  public applyRowData(
    rowDataParams: LoadSuccessParams<unknown>,
    startRow: number,
    route: string[],
  ): void {
    if (this.isHierarchical()) {
      const store = this.hierarchyStores.get(this.routeId(route));
      if (store) this.applyHierarchySuccess(store, rowDataParams);
      return;
    }
    if (route.length > 0) return;
    if (this.partial) {
      const block = this.ensureBlock(Math.floor(startRow / this.blockSize()));
      const rowHeight = _getRowHeightAsNumber(this.beans);
      block.nodes = rowDataParams.rowData.map((data, offset) => this.createNode(data, startRow + offset, rowHeight));
      block.state = 'loaded';
      this.rowCount = rowDataParams.rowCount ?? Math.max(this.rowCount, startRow + block.nodes.length);
      this.lastRowIndexKnown = rowDataParams.rowCount !== undefined;
      this.evictBlocks(block.id);
      this.dispatchModelUpdatedDeferred();
      return;
    }
    this.applySuccess(rowDataParams, startRow);
  }

  public onRowHeightChangedDebounced(): void {
    this.onRowHeightChanged();
  }

  public applyTransaction(
    transaction: ServerSideTransaction<unknown>,
  ): ServerSideTransactionResult<unknown> {
    if (transaction.route?.length) return { status: ServerSideTransactionResultStatus.StoreNotFound };
    if (this.partial) return { status: ServerSideTransactionResultStatus.StoreWrongType };
    if (this.loading) return { status: ServerSideTransactionResultStatus.StoreLoading };
    if (this.failed) return { status: ServerSideTransactionResultStatus.StoreLoadingFailed };

    const rowHeight = _getRowHeightAsNumber(this.beans);
    const result: ServerSideTransactionResult<unknown> = { status: ServerSideTransactionResultStatus.Applied };
    const locate = (data: unknown) => this.rows.findIndex((node) => this.sameRow(node, data));

    if (transaction.remove?.length) {
      const removed: RowNode[] = [];
      for (const data of transaction.remove) {
        const index = locate(data);
        if (index >= 0) removed.push(...this.rows.splice(index, 1));
      }
      if (removed.length) result.remove = removed;
    }

    if (transaction.update?.length) {
      const updated: RowNode[] = [];
      for (const data of transaction.update) {
        const index = locate(data);
        if (index < 0) continue;
        const node = this.rows[index]!;
        node.setDataAndId(data, this.rowIdFor(data, node.sourceRowIndex));
        this.applySelection(node);
        updated.push(node);
      }
      if (updated.length) result.update = updated;
    }

    if (transaction.add?.length) {
      const addIndex = Math.min(Math.max(transaction.addIndex ?? this.rows.length, 0), this.rows.length);
      const added = transaction.add.map((data, offset) => this.createNode(data, addIndex + offset, rowHeight));
      this.rows.splice(addIndex, 0, ...added);
      result.add = added;
    }

    this.rowCount = transaction.rowCount ?? this.rows.length;
    this.lastRowIndexKnown = true;
    this.reindexFullRows(rowHeight);
    this.dispatchModelUpdated();
    return result;
  }

  public applyTransactionAsync(
    transaction: ServerSideTransaction<unknown>,
    callback?: (result: ServerSideTransactionResult<unknown>) => void,
  ): void {
    this.asyncTransactions.push(callback ? { transaction, callback } : { transaction });
    if (this.asyncTransactionTimer) return;
    const delay = this.gos.get('asyncTransactionWaitMillis');
    this.asyncTransactionTimer = setTimeout(
      () => this.flushAsyncTransactions(),
      typeof delay === 'number' && delay >= 0 ? delay : 50,
    );
  }

  public flushAsyncTransactions(): void {
    if (this.asyncTransactionTimer) clearTimeout(this.asyncTransactionTimer);
    this.asyncTransactionTimer = undefined;
    while (this.asyncTransactions.length) {
      const pending = this.asyncTransactions.shift();
      if (!pending) continue;
      pending.callback?.(this.applyTransaction(pending.transaction));
    }
  }

  public getSelectionState(): IServerSideSelectionState {
    return { selectAll: this.selectionBaseline, toggledNodes: [...this.selectionToggledIds] };
  }

  public setSelectionState(state: IServerSideSelectionState): void {
    this.selectionBaseline = state.selectAll;
    this.selectionToggledIds.clear();
    for (const id of state.toggledNodes) this.selectionToggledIds.add(id);
    this.loadedRows().forEach((node) => this.applySelection(node));
  }

  private createRootNode(): RowNode {
    const root = new RowNode(this.beans);
    root.id = ROOT_NODE_ID;
    root.group = true;
    root.level = -1;
    root.expanded = true;
    root.childrenAfterGroup = [];
    root.childrenAfterFilter = [];
    root.childrenAfterSort = [];
    return root;
  }

  private loadRootStore(): void {
    const datasource = this.datasource;
    const rootNode = this.rootNode;
    if (!datasource || !rootNode) return;

    const generation = this.invalidateLoad();
    this.loading = true;
    this.failed = false;
    this.rowCount = Math.max(1, this.gos.get('serverSideInitialRowCount'));
    this.lastRowIndexKnown = false;
    this.dispatchModelUpdated();

    datasource.getRows({
      api: this.beans.gridApi,
      context: this.gos.get('context'),
      parentNode: rootNode,
      needsGrandTotal: false,
      request: this.createRequest(undefined, undefined, []),
      success: (params) => {
        if (generation !== this.loadGeneration) return;
        this.applySuccess(params, 0);
      },
      fail: () => {
        if (generation !== this.loadGeneration) return;
        this.loading = false;
        this.failed = true;
        this.rows = [];
        this.rowCount = 0;
        this.lastRowIndexKnown = false;
        this.dispatchModelUpdatedDeferred();
      },
    });
  }

  private initialisePartialStore(): void {
    this.loading = false;
    this.failed = false;
    this.rowCount = Math.max(1, this.gos.get('serverSideInitialRowCount'));
    this.lastRowIndexKnown = false;
    this.dispatchModelUpdated();
    this.ensureBlock(0);
  }

  private getPartialRow(index: number): RowNode | undefined {
    if (index < 0 || index >= this.rowCount) return undefined;
    const block = this.ensureBlock(Math.floor(index / this.blockSize()));
    block.lastAccessed = ++this.blockSequence;
    const offset = index - block.startRow;
    return block.nodes[offset] ?? this.createStub(index);
  }

  private ensureBlock(id: number): PartialBlock {
    let block = this.blocks.get(id);
    if (!block) {
      const startRow = id * this.blockSize();
      block = { id, startRow, endRow: startRow + this.blockSize(), nodes: [], state: 'waiting', lastAccessed: ++this.blockSequence, generation: 0 };
      this.blocks.set(id, block);
      this.scheduleBlockLoad(block);
    }
    return block;
  }

  private loadBlock(block: PartialBlock): void {
    const datasource = this.datasource;
    const rootNode = this.rootNode;
    if (!datasource || !rootNode || block.state === 'loading') return;
    block.state = 'loading';
    block.generation += 1;
    const generation = this.loadGeneration;
    const blockGeneration = block.generation;
    datasource.getRows({
      api: this.beans.gridApi,
      context: this.gos.get('context'),
      parentNode: rootNode,
      needsGrandTotal: false,
      request: this.createRequest(block.startRow, block.endRow, []),
      success: (params) => {
        this.inFlightBlockLoads -= 1;
        this.schedulePendingBlockLoads();
        if (generation !== this.loadGeneration || blockGeneration !== block.generation || !this.blocks.has(block.id)) return;
        const rowHeight = _getRowHeightAsNumber(this.beans);
        block.nodes = params.rowData.map((data, offset) => this.createNode(data, block.startRow + offset, rowHeight));
        block.state = 'loaded';
        this.loading = false;
        this.failed = false;
        this.rowCount = params.rowCount ?? Math.max(this.rowCount, block.startRow + block.nodes.length + 1);
        this.lastRowIndexKnown = params.rowCount !== undefined;
        this.evictBlocks(block.id);
        this.dispatchModelUpdatedDeferred();
      },
      fail: () => {
        this.inFlightBlockLoads -= 1;
        this.schedulePendingBlockLoads();
        if (generation !== this.loadGeneration || blockGeneration !== block.generation || !this.blocks.has(block.id)) return;
        block.state = 'failed';
        this.failed = true;
        this.dispatchModelUpdatedDeferred();
      },
    });
  }

  private scheduleBlockLoad(block: PartialBlock): void {
    if (block.state !== 'waiting') return;
    this.pendingBlockLoads.set(block.id, block);
    if (this.blockLoadTimer) return;
    const debounce = this.gos.get('blockLoadDebounceMillis');
    this.blockLoadTimer = setTimeout(
      () => {
        this.blockLoadTimer = undefined;
        this.schedulePendingBlockLoads();
      },
      typeof debounce === 'number' && debounce > 0 ? debounce : 0,
    );
  }

  private schedulePendingBlockLoads(): void {
    const configuredMaximum = this.gos.get('maxConcurrentDatasourceRequests');
    const maximum =
      typeof configuredMaximum === 'number' && configuredMaximum > 0
        ? configuredMaximum
        : 2;
    while (this.inFlightBlockLoads < maximum && this.pendingBlockLoads.size > 0) {
      const next = this.pendingBlockLoads.values().next().value as PartialBlock | undefined;
      if (!next) return;
      this.pendingBlockLoads.delete(next.id);
      if (!this.partial || !this.blocks.has(next.id) || next.state !== 'waiting') continue;
      this.inFlightBlockLoads += 1;
      this.loadBlock(next);
    }
  }

  private clearPendingBlockLoads(): void {
    if (this.blockLoadTimer) clearTimeout(this.blockLoadTimer);
    this.blockLoadTimer = undefined;
    this.pendingBlockLoads.clear();
  }

  private evictBlocks(currentId: number): void {
    const maximum = this.gos.get('maxBlocksInCache');
    if (typeof maximum !== 'number' || maximum <= 0 || this.blocks.size <= maximum) return;
    const firstVisibleBlock = Math.floor(this.beans.pageBounds.getFirstRow() / this.blockSize());
    const lastVisibleBlock = Math.floor(this.beans.pageBounds.getLastRow() / this.blockSize());
    const candidates = [...this.blocks.values()]
      .filter(
        (block) =>
          block.id !== currentId &&
          (block.id < firstVisibleBlock || block.id > lastVisibleBlock),
      )
      .sort((left, right) => left.lastAccessed - right.lastAccessed);
    while (this.blocks.size > maximum && candidates.length > 0) {
      const block = candidates.shift();
      if (block) {
        this.purgeSelectionState(block.nodes);
        this.blocks.delete(block.id);
      }
    }
  }

  /**
   * Drops the selection working-copy entries of rows that leave the cache.
   * The selection is owned by the server-side selection spec; these entries
   * are a query-avoidance cache and must never outlive their rows.
   */
  private purgeSelectionState(nodes: Iterable<RowNode>): void {
    for (const node of nodes) {
      if (!node.id) continue;
      if (node.group) {
        const route = (node as SsrmNode).__lgrSsrmRoute;
        if (route) this.selectedGroupRoutes.delete(this.routeId(route));
        for (const child of this.loadedDescendants(node)) {
          if (child.id) this.selectionToggledIds.delete(child.id);
        }
      }
      this.selectionToggledIds.delete(node.id);
    }
  }

  /** Clears the whole selection working copy (rows are being replaced). */
  private resetSelectionState(): void {
    this.selectionBaseline = false;
    this.selectionToggledIds.clear();
    this.selectedGroupRoutes.clear();
  }

  private blockSize(): number {
    const configured = this.gos.get('cacheBlockSize');
    return typeof configured === 'number' && configured > 0 ? configured : 100;
  }

  private createStub(index: number): RowNode {
    const node = new RowNode(this.beans);
    node.parent = this.rootNode;
    node.level = 0;
    node.group = false;
    node.stub = true;
    node.sourceRowIndex = index;
    this.positionNode(node, index, _getRowHeightAsNumber(this.beans));
    return node;
  }

  private loadedRows(): RowNode[] {
    if (!this.partial) return this.rows;
    return [...this.blocks.values()]
      .flatMap((block) => block.nodes)
      .sort((left, right) => left.sourceRowIndex - right.sourceRowIndex);
  }

  private applySuccess(params: LoadSuccessParams<unknown>, startRow: number): void {
    const rootNode = this.rootNode;
    if (!rootNode) return;

    const rowHeight = _getRowHeightAsNumber(this.beans);
    const loaded = params.rowData.map((data, offset) => this.createNode(data, startRow + offset, rowHeight));
    if (startRow === 0) this.rows = loaded;
    else this.rows.splice(startRow, loaded.length, ...loaded);

    rootNode.childrenAfterGroup = this.rows;
    rootNode.childrenAfterFilter = this.rows;
    rootNode.childrenAfterSort = this.rows;
    this.loading = false;
    this.failed = false;
    this.rowCount = params.rowCount ?? this.rows.length;
    this.lastRowIndexKnown = params.rowCount !== undefined || startRow === 0;
    this.dispatchModelUpdated();
  }

  private createNode(data: unknown, index: number, rowHeight: number): RowNode {
    const node = new RowNode(this.beans);
    node.parent = this.rootNode;
    node.level = 0;
    node.group = false;
    node.sourceRowIndex = index;
    node.setDataAndId(data, this.rowIdFor(data, index));
    this.positionNode(node, index, rowHeight);
    this.applySelection(node);
    this.updateNodeSelectable(node);
    return node;
  }

  /**
   * Applies the `isRowSelectable` grid option to a freshly materialised node.
   * The client-side row model runs this pass itself; the SSRM owns its node
   * lifecycle, so it calls the selection service directly. No-op when no
   * selection service is registered (grids without row-selection support).
   */
  private updateNodeSelectable(node: RowNode): void {
    this.beans.selectionSvc?.updateRowSelectable(node);
  }

  private rowIdFor(data: unknown, index: number): string {
    return _getRowIdCallback(this.beans)?.({ data, level: 0 }) ?? String(index);
  }

  /** A full SSRM request mirrors the grid's analytical column state. */
  private createRequest(startRow: number | undefined, endRow: number | undefined, groupKeys: string[]) {
    const toColumnVO = (column: AgColumn): ColumnVO => {
      const colDef = column.getColDef();
      return {
        id: column.getColId(),
        displayName: column.getColDef().headerName ?? column.getColId(),
        ...(colDef.field ? { field: colDef.field } : {}),
        ...(typeof colDef.aggFunc === 'string' ? { aggFunc: colDef.aggFunc } : {}),
      };
    };
    const services = this.beans as typeof this.beans & {
      rowGroupColsSvc?: { columns: AgColumn[] };
      valueColsSvc?: { columns: AgColumn[] };
      pivotColsSvc?: { columns: AgColumn[] };
      filterManager?: { getFilterModel(): Record<string, unknown> | null };
      colModel?: { pivotMode?: boolean };
    };
    const activeFilterModel = services.filterManager?.getFilterModel() ?? null;
    const filterModel = activeFilterModel && Object.keys(activeFilterModel).length > 0 ? activeFilterModel : null;
    return {
      startRow,
      endRow,
      rowGroupCols: (services.rowGroupColsSvc?.columns ?? []).map(toColumnVO),
      valueCols: (services.valueColsSvc?.columns ?? []).map(toColumnVO),
      pivotCols: (services.pivotColsSvc?.columns ?? []).map(toColumnVO),
      pivotMode: services.colModel?.pivotMode === true,
      groupKeys,
      filterModel,
      sortModel: _getSortModel(this.beans.sortSvc),
    };
  }

  private isHierarchical(): boolean {
    const services = this.beans as typeof this.beans & { rowGroupColsSvc?: { columns: AgColumn[] } };
    return (services.rowGroupColsSvc?.columns.length ?? 0) > 0;
  }

  private routeId(route: string[]): string {
    // JSON preserves the distinction between [`a.b`] and [`a`, `b`].
    return JSON.stringify(route);
  }

  private rootStore(): HierarchicalStore | undefined {
    return this.hierarchyStores.get(this.routeId([]));
  }

  private allLoadedRows(): RowNode[] {
    return this.isHierarchical()
      ? [...this.hierarchyStores.values()].flatMap((store) => store.rows)
      : this.loadedRows();
  }

  private displayedRowCount(): number {
    return this.isHierarchical() ? this.hierarchicalRows().length : this.rowCount;
  }

  private hierarchicalRows(): RowNode[] {
    const root = this.rootStore();
    if (!root) return [];
    const output: RowNode[] = [];
    const walk = (store: HierarchicalStore) => {
      for (const node of store.rows) {
        output.push(node);
        const child = (node as SsrmNode).__lgrSsrmStore;
        if (node.group && node.expanded && child) walk(child);
      }
    };
    walk(root);
    return output;
  }

  private initialiseHierarchyStore(): void {
    const rootNode = this.rootNode;
    if (!rootNode) return;
    this.loading = true;
    this.failed = false;
    this.rowCount = 1;
    this.lastRowIndexKnown = true;
    const root: HierarchicalStore = {
      route: [], parentNode: rootNode, rows: [], loading: false, failed: false, generation: 0, rowCount: 0,
    };
    this.hierarchyStores.set(this.routeId([]), root);
    this.loadHierarchyStore(root, true);
  }

  private loadHierarchyStore(store: HierarchicalStore, _purge: boolean): void {
    const datasource = this.datasource;
    if (!datasource || store.loading) return;
    store.loading = true;
    store.failed = false;
    store.generation += 1;
    const generation = store.generation;
    if (store.route.length === 0) this.loading = true;
    this.dispatchModelUpdated();
    datasource.getRows({
      api: this.beans.gridApi,
      context: this.gos.get('context'),
      parentNode: store.parentNode,
      needsGrandTotal: false,
      request: this.createRequest(undefined, undefined, store.route),
      success: (params) => {
        if (this.hierarchyStores.get(this.routeId(store.route)) !== store || store.generation !== generation) return;
        this.applyHierarchySuccess(store, params);
      },
      fail: () => {
        if (this.hierarchyStores.get(this.routeId(store.route)) !== store || store.generation !== generation) return;
        store.loading = false;
        store.failed = true;
        if (store.route.length === 0) { this.loading = false; this.failed = true; }
        this.dispatchModelUpdatedDeferred();
      },
    });
  }

  private applyHierarchySuccess(store: HierarchicalStore, params: LoadSuccessParams<unknown>): void {
    const rowHeight = _getRowHeightAsNumber(this.beans);
    const groupColumns = (this.beans as typeof this.beans & { rowGroupColsSvc?: { columns: AgColumn[] } }).rowGroupColsSvc?.columns ?? [];
    const level = store.route.length;
    store.rows = params.rowData.map((data, index) => {
      if (level < groupColumns.length) return this.createGroupNode(data, index, rowHeight, store, groupColumns[level]!);
      return this.createHierarchyLeafNode(data, index, rowHeight, store);
    });
    store.rowCount = params.rowCount ?? store.rows.length;
    store.loading = false;
    store.failed = false;
    store.parentNode.childrenAfterGroup = store.rows;
    store.parentNode.childrenAfterFilter = store.rows;
    store.parentNode.childrenAfterSort = store.rows;
    if (store.route.length === 0) { this.loading = false; this.failed = false; this.rowCount = store.rowCount; }
    this.applyPivotResultColumns(params);
    this.reindexHierarchyRows();
    this.dispatchModelUpdated();
  }

  private createGroupNode(data: unknown, index: number, rowHeight: number, store: HierarchicalStore, column: AgColumn): RowNode {
    const record = data as Record<string, unknown>;
    const key = String(record[column.getColDef().field ?? column.getColId()] ?? record.key ?? '');
    const route = [...store.route, key];
    const node = new RowNode(this.beans) as SsrmNode;
    node.parent = store.parentNode;
    node.level = store.route.length;
    node.group = true;
    node.leafGroup = node.level + 1 >= ((this.beans as typeof this.beans & { rowGroupColsSvc?: { columns: AgColumn[] } }).rowGroupColsSvc?.columns.length ?? 0);
    node.key = key;
    node.field = column.getColDef().field ?? column.getColId();
    node.sourceRowIndex = index;
    node.setDataAndId(data, `ssrm-group:${this.routeId(route)}`);
    node.aggData = record;
    node.childrenAfterGroup = [];
    node.childrenAfterFilter = [];
    node.childrenAfterSort = [];
    node.__lgrSsrmRoute = route;
    node.expanded = this.expandAllDefault === true || this.expandedRoutes.has(this.routeId(route));
    this.positionNode(node, index, rowHeight);
    this.applySelection(node);
    this.updateNodeSelectable(node);
    return node;
  }

  private createHierarchyLeafNode(data: unknown, index: number, rowHeight: number, store: HierarchicalStore): RowNode {
    const node = new RowNode(this.beans);
    node.parent = store.parentNode;
    node.level = store.route.length;
    node.group = false;
    node.sourceRowIndex = index;
    node.setDataAndId(data, this.rowIdFor(data, index));
    this.positionNode(node, index, rowHeight);
    this.applySelection(node);
    this.updateNodeSelectable(node);
    return node;
  }

  private reindexHierarchyRows(): void {
    const rowHeight = _getRowHeightAsNumber(this.beans);
    this.hierarchicalRows().forEach((node, index) => this.positionNode(node, index, rowHeight));
  }

  private applyPivotResultColumns(params: LoadSuccessParams<unknown>): void {
    if (!params.pivotResultFields?.length) return;
    const services = this.beans as typeof this.beans & {
      pivotColDefSvc?: { createColDefsFromFields(fields: string[]): unknown[] };
      pivotResultCols?: { setPivotResultCols(defs: unknown[], source: string, appSupplied?: boolean): void };
    };
    const defs = services.pivotColDefSvc?.createColDefsFromFields(params.pivotResultFields);
    if (defs) services.pivotResultCols?.setPivotResultCols(defs, 'api', false);
  }

  /** Called by the common row-group expansion service when an SSRM group opens. */
  public onGroupExpanded(node: RowNode, expanded: boolean): void {
    const route = (node as SsrmNode).__lgrSsrmRoute;
    if (!route) return;
    const routeId = this.routeId(route);
    if (expanded) this.expandedRoutes.add(routeId);
    else this.expandedRoutes.delete(routeId);
    if (expanded) {
      let store = (node as SsrmNode).__lgrSsrmStore;
      if (!store) {
        store = { route, parentNode: node, rows: [], loading: false, failed: false, generation: 0, rowCount: 0 };
        (node as SsrmNode).__lgrSsrmStore = store;
        this.hierarchyStores.set(this.routeId(route), store);
      }
      this.loadHierarchyStore(store, false);
    }
    this.reindexHierarchyRows();
    this.dispatchModelUpdated();
  }

  /** `expandAll` only visits loaded nodes unless explicitly configured otherwise. */
  public setAllExpanded(expanded: boolean): void {
    this.expandAllDefault = this.gos.get('ssrmExpandAllAffectsAllRows') === true ? expanded : undefined;
    for (const node of this.allLoadedRows()) {
      if (!node.group) continue;
      node.expanded = expanded;
      const route = (node as SsrmNode).__lgrSsrmRoute;
      if (route) {
        if (expanded) this.expandedRoutes.add(this.routeId(route));
        else this.expandedRoutes.delete(this.routeId(route));
      }
      if (expanded) this.onGroupExpanded(node, true);
    }
    this.reindexHierarchyRows();
    this.dispatchModelUpdated();
  }

  private clearChildStores(): void {
    for (const [id, store] of this.hierarchyStores) {
      if (store.route.length > 0) {
        this.purgeSelectionState(store.rows);
        this.hierarchyStores.delete(id);
      }
    }
  }

  private sameRow(node: RowNode, data: unknown): boolean {
    const getRowId = _getRowIdCallback(this.beans);
    return getRowId ? node.id === getRowId({ data, level: 0 }) : node.data === data;
  }

  private reindexFullRows(rowHeight: number): void {
    const rootNode = this.rootNode;
    if (!rootNode) return;
    this.rows.forEach((node, index) => this.positionNode(node, index, rowHeight));
    rootNode.childrenAfterGroup = this.rows;
    rootNode.childrenAfterFilter = this.rows;
    rootNode.childrenAfterSort = this.rows;
  }

  private updateSelection(id: string, selected: boolean): void {
    if (selected === this.selectionBaseline) this.selectionToggledIds.delete(id);
    else this.selectionToggledIds.add(id);
    const selectedNode = this.getRowNode(id);
    if (selectedNode?.group) {
      const route = (selectedNode as SsrmNode).__lgrSsrmRoute;
      if (route) this.selectedGroupRoutes.set(this.routeId(route), selected);
      for (const child of this.loadedDescendants(selectedNode)) {
        if (!child.id) continue;
        if (selected === this.selectionBaseline) this.selectionToggledIds.delete(child.id);
        else this.selectionToggledIds.add(child.id);
        this.applySelection(child);
      }
    }
  }

  private loadedDescendants(parent: RowNode): RowNode[] {
    const output: RowNode[] = [];
    const walk = (node: RowNode) => {
      for (const child of node.childrenAfterGroup ?? []) {
        output.push(child);
        walk(child);
      }
    };
    walk(parent);
    return output;
  }

  private applySelection(node: RowNode): void {
    if (!node.id) return;
    const selected = this.groupSelectionFor(node) ?? (this.selectionToggledIds.has(node.id)
      ? !this.selectionBaseline
      : this.selectionBaseline);
    if (node.isSelected() === selected) return;
    this.selectionUpdateInProgress = true;
    // SSRM owns durable selection state. The generic selection service does not
    // retain unloaded rows, so update the newly materialised node directly.
    node.__selected = selected;
    node.dispatchRowEvent('rowSelected');
    this.selectionUpdateInProgress = false;
  }

  private groupSelectionFor(node: RowNode): boolean | undefined {
    let parent = node.parent;
    while (parent) {
      const route = (parent as SsrmNode).__lgrSsrmRoute;
      if (route) {
        const selected = this.selectedGroupRoutes.get(this.routeId(route));
        if (selected !== undefined) return selected;
      }
      parent = parent.parent;
    }
    return undefined;
  }

  private positionNode(node: RowNode, index: number, rowHeight: number): void {
    node.setRowHeight(rowHeight);
    node.setRowTop(index * rowHeight);
    node.setRowIndex(index);
  }

  private invalidateLoad(): number {
    this.loadGeneration += 1;
    return this.loadGeneration;
  }

  private destroyDatasource(): void {
    this.datasource?.destroy?.();
    this.datasource = undefined;
  }

  private dispatchModelUpdated(): void {
    this.eventSvc.dispatchEvent({
      type: 'modelUpdated',
      newPage: false,
      newPageSize: false,
      newData: true,
      keepRenderedRows: false,
      animate: false,
    });
  }

  /**
   * A block may resolve while the row renderer is asking this model for a
   * placeholder. Deferring the notification prevents re-entering that render.
   */
  private dispatchModelUpdatedDeferred(): void {
    setTimeout(() => this.dispatchModelUpdated());
  }
}
