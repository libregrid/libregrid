import {
  BeanStub,
  ROOT_NODE_ID,
  RowNode,
  _getRowHeightAsNumber,
  _getRowIdCallback,
  _getSortModel,
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
  public readonly hierarchical = false;

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
  private selectionState: IServerSideSelectionState = { selectAll: false, toggledNodes: [] };
  private selectionUpdateInProgress = false;
  private readonly asyncTransactions: Array<{
    transaction: ServerSideTransaction<unknown>;
    callback?: (result: ServerSideTransactionResult<unknown>) => void;
  }> = [];
  private asyncTransactionTimer: ReturnType<typeof setTimeout> | undefined;

  public postConstruct(): void {
    this.rootNode = this.createRootNode();
    this.addManagedPropertyListener('serverSideDatasource', () => {
      this.setDatasource(this.gos.get('serverSideDatasource'));
    });
    this.addManagedEventListeners({ sortChanged: () => this.refreshStore() });
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
    this.partial = false;
    this.flushAsyncTransactions();
    this.rootNode = null;
    super.destroy();
  }

  public getType(): RowModelType {
    return 'serverSide';
  }

  public getRow(index: number): RowNode | undefined {
    if (this.partial) return this.getPartialRow(index);
    return this.rows[index];
  }

  public getRowNode(id: string): RowNode | undefined {
    return this.loadedRows().find((node) => node.id === id);
  }

  public getRowCount(): number {
    return this.rowCount;
  }

  public getTopLevelRowCount(): number {
    return this.rowCount;
  }

  public getTopLevelRowDisplayedIndex(topLevelIndex: number): number {
    return topLevelIndex;
  }

  public getRowIndexAtPixel(pixel: number): number {
    const rowHeight = _getRowHeightAsNumber(this.beans);
    if (rowHeight <= 0 || this.rowCount === 0) return 0;
    return Math.min(Math.floor(pixel / rowHeight), this.rowCount - 1);
  }

  public isRowPresent(rowNode: RowNode): boolean {
    return this.loadedRows().includes(rowNode);
  }

  public getRowBounds(index: number): RowBounds | null {
    if (index < 0 || index >= this.rowCount) return null;
    const rowHeight = _getRowHeightAsNumber(this.beans);
    return { rowTop: index * rowHeight, rowHeight, rowIndex: index };
  }

  public isEmpty(): boolean {
    return !this.loading && !this.failed && this.rowCount === 0;
  }

  public isRowsToRender(): boolean {
    return this.loading || this.loadedRows().length > 0;
  }

  public getOverlayType(): 'loading' | 'noRows' | null {
    if (this.loading) return 'loading';
    return this.isEmpty() ? 'noRows' : null;
  }

  public getNodesInRangeForSelection(first: RowNode, last: RowNode): RowNode[] | null {
    const rows = this.loadedRows();
    const firstIndex = rows.indexOf(first);
    const lastIndex = rows.indexOf(last);
    if (firstIndex < 0 || lastIndex < 0) return null;
    const [start, end] = firstIndex < lastIndex ? [firstIndex, lastIndex] : [lastIndex, firstIndex];
    return rows.slice(start, end + 1);
  }

  public forEachNode(callback: (node: RowNode, index: number) => void): void {
    this.loadedRows().forEach(callback);
  }

  public isLastRowIndexKnown(): boolean {
    return this.lastRowIndexKnown;
  }

  public ensureRowHeightsValid(): boolean {
    return false;
  }

  public resetRowHeights(): void {
    const rowHeight = _getRowHeightAsNumber(this.beans);
    this.loadedRows().forEach((node) => this.positionNode(node, node.sourceRowIndex, rowHeight));
    this.dispatchModelUpdated();
  }

  public onRowHeightChanged(): void {
    this.resetRowHeights();
  }

  public refreshStore(_params?: RefreshServerSideParams): void {
    if (!this.datasource) return;
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
    this.rowCount = 0;
    this.lastRowIndexKnown = false;
    this.failed = false;
    const maxBlocksInCache = this.gos.get('maxBlocksInCache');
    this.partial = datasource !== undefined && typeof maxBlocksInCache === 'number' && maxBlocksInCache > 0;
    if (datasource) {
      if (this.partial) this.initialisePartialStore();
      else this.loadRootStore();
    }
    else this.dispatchModelUpdated();
  }

  public forEachNodeAfterFilterAndSort(
    callback: (node: IRowNode<unknown>, index: number) => void,
  ): void {
    this.loadedRows().forEach(callback);
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
    this.asyncTransactions.push({ transaction, callback });
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
    return { selectAll: this.selectionState.selectAll, toggledNodes: [...this.selectionState.toggledNodes] };
  }

  public setSelectionState(state: IServerSideSelectionState): void {
    this.selectionState = { selectAll: state.selectAll, toggledNodes: [...state.toggledNodes] };
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
      request: {
        startRow: undefined,
        endRow: undefined,
        rowGroupCols: [],
        valueCols: [],
        pivotCols: [],
        pivotMode: false,
        groupKeys: [],
        filterModel: null,
        sortModel: _getSortModel(this.beans.sortSvc),
      },
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
      request: { startRow: block.startRow, endRow: block.endRow, rowGroupCols: [], valueCols: [], pivotCols: [], pivotMode: false, groupKeys: [], filterModel: null, sortModel: _getSortModel(this.beans.sortSvc) },
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
      if (block) this.blocks.delete(block.id);
    }
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
    return node;
  }

  private rowIdFor(data: unknown, index: number): string {
    return _getRowIdCallback(this.beans)?.({ data, level: 0 }) ?? String(index);
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
    const toggled = new Set(this.selectionState.toggledNodes);
    if (selected === this.selectionState.selectAll) toggled.delete(id);
    else toggled.add(id);
    this.selectionState = { selectAll: this.selectionState.selectAll, toggledNodes: [...toggled] };
  }

  private applySelection(node: RowNode): void {
    if (!node.id) return;
    const selected = this.selectionState.toggledNodes.includes(node.id)
      ? !this.selectionState.selectAll
      : this.selectionState.selectAll;
    if (node.isSelected() === selected) return;
    this.selectionUpdateInProgress = true;
    // SSRM owns durable selection state. The generic selection service does not
    // retain unloaded rows, so update the newly materialised node directly.
    node.__selected = selected;
    node.dispatchRowEvent('rowSelected');
    this.selectionUpdateInProgress = false;
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
