import {
  BeanStub,
  RowNode,
  _addGridCommonParams,
  type DetailGridInfo,
  type IMasterDetailService,
  type NamedBean,
  type RefreshModelParams,
  type RowCtrl,
} from 'ag-grid-community';

interface CachedDetail {
  info: DetailGridInfo;
  gui: HTMLElement;
  destroy: () => void;
}

/** Owns master flags, detail-row nodes, and bounded cached detail grids. */
export class MasterDetailService extends BeanStub implements IMasterDetailService, NamedBean {
  public beanName = 'masterDetailSvc' as const;
  public readonly store: Record<string, DetailGridInfo | undefined> = Object.create(null);
  private readonly cache = new Map<string, CachedDetail>();

  public override destroy(): void {
    for (const cached of this.cache.values()) cached.destroy();
    this.cache.clear();
    super.destroy();
  }

  public setupDetailRowAutoHeight(_rowCtrl: RowCtrl, eDetailGui: HTMLElement): void {
    if (this.gos.get('detailRowAutoHeight') !== true) return;
    const node = (_rowCtrl as unknown as { rowNode?: RowNode }).rowNode;
    const height = Math.max(1, Math.ceil(eDetailGui.getBoundingClientRect().height));
    if (node) node.setRowHeight(height);
  }

  public setMaster(row: RowNode, created: boolean, updated: boolean): void {
    const enabled = this.gos.get('masterDetail') === true && row.data !== undefined;
    const callback = this.gos.get('isRowMaster') as ((params: object) => boolean) | undefined;
    const master = enabled && (callback ? callback(_addGridCommonParams(this.gos, { data: row.data, rowNode: row })) : true);
    if (!master) {
      row.master = false;
      if (row.detailNode) this.removeDetail(row);
      return;
    }
    row.master = true;
    if (created) row.expanded = this.isMasterOpenByDefault(row);
    if (updated && row.detailNode?.detailGridInfo) {
      // The cell renderer receives the same refresh request from the row
      // renderer; this marker lets it distinguish a master data update.
      (row.detailNode as RowNode & { __lgrMasterUpdated?: boolean }).__lgrMasterUpdated = true;
    }
  }

  public getDetail(masterNode: RowNode): RowNode | null {
    if (!masterNode.master || !masterNode.expanded) return null;
    if (masterNode.detailNode) return masterNode.detailNode;
    const node = new RowNode(this.beans);
    const id = `detail_${masterNode.id ?? masterNode.sourceRowIndex}`;
    node.id = id;
    node.detail = true;
    node.group = false;
    node.parent = masterNode;
    node.level = masterNode.level + 1;
    node.uiLevel = node.level;
    node.data = masterNode.data;
    node.sourceRowIndex = masterNode.sourceRowIndex;
    node.detailGridInfo = { id };
    const height = this.gos.get('detailRowHeight');
    if (typeof height === 'number' && height > 0) node.setRowHeight(height);
    masterNode.detailNode = node;
    masterNode.detailGridInfo = node.detailGridInfo;
    return node;
  }

  public refreshModel(_params: RefreshModelParams): void {
    const rowModel = this.beans.rowModel as { forEachNode?: (callback: (node: RowNode) => void) => void };
    rowModel.forEachNode?.((node) => {
      if (node.master && !node.expanded && node.detailNode) this.removeDetail(node);
    });
  }

  public addDetail(id: string, info: DetailGridInfo): void { this.store[id] = info; }
  public removeDetailInfo(id: string): void { delete this.store[id]; }

  public releaseDetail(id: string, cached: CachedDetail): void {
    this.removeDetailInfo(id);
    if (this.gos.get('keepDetailRows') !== true) { cached.destroy(); return; }
    this.cache.delete(id);
    this.cache.set(id, cached);
    const maximum = this.gos.get('keepDetailRowsCount');
    const limit = typeof maximum === 'number' && maximum >= 0 ? maximum : 10;
    while (this.cache.size > limit) {
      const oldestId = this.cache.keys().next().value as string | undefined;
      if (!oldestId) break;
      const oldest = this.cache.get(oldestId);
      this.cache.delete(oldestId);
      oldest?.destroy();
    }
  }

  public takeCachedDetail(id: string): CachedDetail | undefined {
    const cached = this.cache.get(id);
    if (cached) this.cache.delete(id);
    return cached;
  }

  private removeDetail(master: RowNode): void {
    const detail = master.detailNode;
    if (!detail) return;
    this.removeDetailInfo(detail.id!);
    master.detailNode = undefined;
    master.detailGridInfo = null;
  }

  private isMasterOpenByDefault(rowNode: RowNode): boolean {
    const callback = this.gos.get('isMasterOpenByDefault') as ((params: object) => boolean) | undefined;
    if (callback) return !!callback(_addGridCommonParams(this.gos, { rowNode, data: rowNode.data, level: rowNode.level }));
    const depth = this.gos.get('masterDefaultExpanded');
    return depth === -1 || (typeof depth === 'number' && rowNode.level < depth);
  }
}
