import { createGrid, type GridApi, type GridOptions, type IDetailCellRendererParams } from 'ag-grid-community';
import type { MasterDetailService } from './masterDetailService';

/** Full-width renderer that hosts a real, independently-operable grid. */
export class DetailCellRenderer {
  private gui!: HTMLDivElement;
  private gridHost!: HTMLDivElement;
  private api: GridApi | undefined;
  private params!: IDetailCellRendererParams;
  private detailId!: string;
  private service!: MasterDetailService;
  private destroyed = false;
  private loadGeneration = 0;

  public init(params: IDetailCellRendererParams): void {
    this.params = params;
    this.detailId = params.node.id!;
    const service = (params.node as unknown as { beans?: { masterDetailSvc?: MasterDetailService } }).beans?.masterDetailSvc;
    if (!service) throw new Error('LibreGrid Master Detail requires the masterDetailSvc bean.');
    this.service = service;
    const config = this.resolveConfig();
    this.gui = document.createElement('div');
    this.gui.className = 'ag-details-row';
    // The detail row renders inside the master grid's role=row; a row may
    // only own gridcell/columnheader/rowheader children (axe
    // aria-required-children), so the detail content is a named gridcell.
    this.gui.setAttribute('role', 'gridcell');
    this.gui.setAttribute('aria-label', `Details for ${params.node.parent?.id ?? params.node.id}`);
    const template = config.template;
    if (template) this.gui.innerHTML = typeof template === 'function' ? template(params as never) : template;
    this.gridHost = this.gui.querySelector('[data-ref="eDetailGrid"]') as HTMLDivElement ?? document.createElement('div');
    this.gridHost.className = 'ag-details-grid';
    this.gridHost.style.height = `${this.detailHeight()}px`;
    if (!this.gridHost.parentElement) this.gui.append(this.gridHost);
    const cached = this.service?.takeCachedDetail(this.detailId);
    if (cached) {
      this.gui = cached.gui as HTMLDivElement;
      this.gridHost = this.gui.querySelector('.ag-details-grid') as HTMLDivElement;
      this.api = cached.info.api;
      this.register();
      return;
    }
    this.createDetailGrid();
  }

  public getGui(): HTMLElement { return this.gui; }
  public refresh(): boolean {
    const config = this.resolveConfig();
    if (config.refreshStrategy === 'nothing') return true;
    if (config.refreshStrategy === 'everything') return false;
    this.loadRows(config);
    return true;
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.loadGeneration += 1;
    if (!this.api) return;
    const api = this.api;
    const gui = this.gui;
    const id = this.detailId;
    this.service.releaseDetail(id, { info: { id, api }, gui, destroy: () => api.destroy() });
    this.api = undefined;
  }

  private createDetailGrid(): void {
    const config = this.resolveConfig();
    this.api = createGrid(this.gridHost, { ...config.detailGridOptions, rowData: [] } as GridOptions);
    this.register();
    this.loadRows(config);
  }

  private register(): void {
    if (!this.api) return;
    const info = { id: this.detailId, api: this.api };
    this.service.addDetail(this.detailId, info);
    (this.params.node as unknown as { detailGridInfo: typeof info }).detailGridInfo = info;
    (this.params.node.parent! as unknown as { detailGridInfo: typeof info }).detailGridInfo = info;
    // Phase 11 Find can search an open nested grid immediately; collapsed
    // grids use the documented getFindMatches callback instead.
    const find = (this.params.node as unknown as { beans?: { findSvc?: { registerDetailGrid(node: object, api: GridApi): void } } }).beans?.findSvc;
    find?.registerDetailGrid(this.params.node.parent!, this.api);
  }

  private loadRows(config: DetailConfig): void {
    const generation = ++this.loadGeneration;
    config.getDetailRowData({ node: this.params.node.parent!, data: this.params.node.parent!.data, successCallback: (rows) => { if (generation === this.loadGeneration && !this.destroyed) this.api?.setGridOption('rowData', rows); } });
    if (this.params.api.getGridOption('detailRowAutoHeight') === true) {
      requestAnimationFrame(() => {
        if (!this.destroyed) this.params.node.setRowHeight(Math.max(1, this.gui.scrollHeight));
      });
    }
  }

  private resolveConfig(): DetailConfig {
    const provided = this.params.api.getGridOption('detailCellRendererParams') as DetailConfig | ((params: IDetailCellRendererParams) => DetailConfig) | undefined;
    const config = typeof provided === 'function' ? provided(this.params) : provided;
    if (!config?.detailGridOptions || !config.getDetailRowData) throw new Error('LibreGrid Master Detail requires detailCellRendererParams.detailGridOptions and getDetailRowData.');
    return { ...config, refreshStrategy: config.refreshStrategy ?? 'rows' };
  }

  private detailHeight(): number { const height = this.params.api.getGridOption('detailRowHeight'); return typeof height === 'number' && height > 0 ? height : 300; }
}

type DetailConfig = Pick<IDetailCellRendererParams, 'detailGridOptions' | 'getDetailRowData' | 'refreshStrategy' | 'template'> & { refreshStrategy?: 'rows' | 'everything' | 'nothing' };
