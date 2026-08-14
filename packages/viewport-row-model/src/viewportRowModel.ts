import {
  BeanStub,
  ROOT_NODE_ID,
  RowNode,
  _getRowHeightAsNumber,
  _getRowIdCallback,
  type IRowNode,
  type IViewportDatasource,
  type IViewportDatasourceParams,
  type NamedBean,
  type RowBounds,
  type RowModelType,
} from 'ag-grid-community';

/**
 * A push-driven row model. Unlike SSRM this model never fetches data itself:
 * it reports a buffered visible range and accepts row changes from its
 * datasource through the callbacks passed to `init`.
 *
 * @feature Viewport Row Model
 */
export class ViewportRowModel extends BeanStub implements NamedBean {
  public beanName = 'rowModel' as const;
  public rootNode: RowNode | null = null;
  public readonly hierarchical = false;

  private datasource: IViewportDatasource | undefined;
  private readonly rows = new Map<number, RowNode>();
  private rowCount = 0;
  private lastViewport: [number, number] | undefined;

  public postConstruct(): void {
    this.rootNode = this.createRootNode();
    this.addManagedPropertyListener('viewportDatasource', () => this.setDatasource(this.gos.get('viewportDatasource')));
    this.addManagedEventListeners({
      bodyScroll: () => this.updateViewportRange(),
      displayedColumnsChanged: () => this.updateViewportRange(),
    });
  }

  public start(): void {
    this.setDatasource(this.gos.get('viewportDatasource'));
  }

  public override destroy(): void {
    this.destroyDatasource();
    this.rows.clear();
    this.rootNode = null;
    super.destroy();
  }

  public getType(): RowModelType { return 'viewport'; }

  public getRow(index: number): RowNode | undefined {
    if (index < 0 || index >= this.rowCount) return undefined;
    return this.rows.get(index) ?? this.createStub(index);
  }

  public getRowNode(id: string): RowNode | undefined {
    return [...this.rows.values()].find((node) => node.id === id);
  }

  public getRowCount(): number { return this.rowCount; }
  public getTopLevelRowCount(): number { return this.rowCount; }
  public getTopLevelRowDisplayedIndex(index: number): number { return index; }

  public getRowIndexAtPixel(pixel: number): number {
    const rowHeight = _getRowHeightAsNumber(this.beans);
    return rowHeight <= 0 || this.rowCount === 0 ? 0 : Math.min(Math.floor(pixel / rowHeight), this.rowCount - 1);
  }

  public isRowPresent(rowNode: RowNode): boolean { return this.rows.get(rowNode.rowIndex ?? -1) === rowNode; }

  public getRowBounds(index: number): RowBounds | null {
    if (index < 0 || index >= this.rowCount) return null;
    const rowHeight = _getRowHeightAsNumber(this.beans);
    return { rowTop: index * rowHeight, rowHeight, rowIndex: index };
  }

  public isEmpty(): boolean { return this.rowCount === 0; }
  public isRowsToRender(): boolean { return this.rowCount > 0; }
  public getOverlayType(): 'noRows' | null { return this.isEmpty() ? 'noRows' : null; }
  public getNodesInRangeForSelection(first: RowNode, last: RowNode): RowNode[] | null {
    const start = first.rowIndex;
    const end = last.rowIndex;
    if (start == null || end == null) return null;
    const [from, to] = start <= end ? [start, end] : [end, start];
    const nodes: RowNode[] = [];
    for (let index = from; index <= to; index += 1) {
      const node = this.rows.get(index);
      if (!node) return null; // A viewport range cannot select through an unloaded gap.
      nodes.push(node);
    }
    return nodes;
  }

  public forEachNode(callback: (node: RowNode, index: number) => void): void {
    [...this.rows.entries()].sort(([left], [right]) => left - right).forEach(([index, node]) => callback(node, index));
  }

  public forEachNodeAfterFilterAndSort(callback: (node: IRowNode, index: number) => void): void { this.forEachNode(callback); }
  public isLastRowIndexKnown(): boolean { return true; }
  public ensureRowHeightsValid(): boolean { return false; }
  public resetRowHeights(): void { this.repositionRows(); this.dispatchModelUpdated(); }
  public onRowHeightChanged(): void { this.resetRowHeights(); }

  /** Called by the registered datasource exactly through its `init` params. */
  public setRowCount(count: number, keepRenderedRows = false): void {
    this.rowCount = Math.max(0, count);
    if (!keepRenderedRows) {
      for (const index of this.rows.keys()) if (index >= this.rowCount) this.rows.delete(index);
    }
    this.lastViewport = undefined;
    this.dispatchModelUpdated();
    this.updateViewportRange();
  }

  /** Applies server pushes by absolute row index without a client sort/filter stage. */
  public setRowData(dataByIndex: Record<number, unknown>): void {
    const rowHeight = _getRowHeightAsNumber(this.beans);
    for (const [rawIndex, data] of Object.entries(dataByIndex)) {
      const index = Number(rawIndex);
      if (!Number.isInteger(index) || index < 0 || index >= this.rowCount) continue;
      const existing = this.rows.get(index);
      if (existing) {
        existing.stub = false;
        existing.setDataAndId(data, this.rowIdFor(data, index));
        this.positionNode(existing, index, rowHeight);
      } else {
        this.rows.set(index, this.createNode(data, index, rowHeight));
      }
    }
    this.dispatchModelUpdated();
  }

  private setDatasource(datasource: IViewportDatasource | undefined): void {
    if (this.datasource === datasource) return;
    this.destroyDatasource();
    this.datasource = datasource;
    this.rows.clear();
    this.rowCount = 0;
    this.lastViewport = undefined;
    this.dispatchModelUpdated();
    datasource?.init({
      api: this.beans.gridApi,
      context: this.gos.get('context'),
      setRowCount: (count, keepRenderedRows) => this.setRowCount(count, keepRenderedRows),
      setRowData: (rows) => this.setRowData(rows),
      getRow: (index) => this.getRow(index) as IRowNode,
    } satisfies IViewportDatasourceParams);
  }

  private updateViewportRange(): void {
    if (!this.datasource || this.rowCount === 0) return;
    const bounds = this.beans.pageBounds;
    const firstVisible = Math.max(0, bounds.getFirstRow());
    const lastVisible = Math.max(firstVisible, bounds.getLastRow());
    const pageSize = this.numberGridOption('viewportRowModelPageSize', 5);
    const buffer = this.numberGridOption('viewportRowModelBufferSize', 5);
    const first = Math.max(0, Math.floor(firstVisible / pageSize) * pageSize - buffer);
    const last = Math.min(this.rowCount - 1, Math.ceil((lastVisible + 1) / pageSize) * pageSize - 1 + buffer);
    if (this.lastViewport?.[0] === first && this.lastViewport[1] === last) return;
    this.lastViewport = [first, last];
    this.datasource.setViewportRange(first, last);
    this.eventSvc.dispatchEvent({ type: 'viewportChanged', firstRow: first, lastRow: last });
  }

  private createRootNode(): RowNode {
    const node = new RowNode(this.beans);
    node.id = ROOT_NODE_ID;
    node.level = -1;
    node.group = false;
    return node;
  }

  private createStub(index: number): RowNode {
    const node = new RowNode(this.beans);
    node.parent = this.rootNode;
    node.level = 0;
    node.group = false;
    // Unlike SSRM, Viewport has no loading-cell renderer contract. A blank
    // ordinary node keeps the row renderer stable until the feed pushes data.
    node.stub = false;
    node.sourceRowIndex = index;
    this.positionNode(node, index, _getRowHeightAsNumber(this.beans));
    this.rows.set(index, node);
    return node;
  }

  private createNode(data: unknown, index: number, rowHeight: number): RowNode {
    const node = new RowNode(this.beans);
    node.parent = this.rootNode;
    node.level = 0;
    node.group = false;
    node.sourceRowIndex = index;
    node.setDataAndId(data, this.rowIdFor(data, index));
    this.positionNode(node, index, rowHeight);
    return node;
  }

  private rowIdFor(data: unknown, index: number): string { return _getRowIdCallback(this.beans)?.({ data, level: 0 }) ?? String(index); }
  private repositionRows(): void { const height = _getRowHeightAsNumber(this.beans); for (const [index, node] of this.rows) this.positionNode(node, index, height); }
  private positionNode(node: RowNode, index: number, height: number): void { node.setRowHeight(height); node.setRowTop(index * height); node.setRowIndex(index); }
  private numberGridOption(key: 'viewportRowModelPageSize' | 'viewportRowModelBufferSize', fallback: number): number { const value = this.gos.get(key); return typeof value === 'number' && value >= 0 ? value : fallback; }
  private destroyDatasource(): void { this.datasource?.destroy?.(); this.datasource = undefined; }
  private dispatchModelUpdated(): void { this.eventSvc.dispatchEvent({ type: 'modelUpdated', newPage: false, newPageSize: false, newData: true, keepRenderedRows: false, animate: false }); }
}
