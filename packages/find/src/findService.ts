import { BeanStub, type Column, type FindCellValueParams, type FindMatch, type FindPart, type GridApi, type IFindService, type IRowNode, type NamedBean } from 'ag-grid-community';

type FindColumn = Column & { getColDef(): { getFindText?: (params: object) => string | null; field?: string }; getId(): string };
type FindNode = IRowNode & { data?: unknown; rowIndex?: number | null; detailGridInfo?: { api?: GridApi } | null };
type FindBeans = {
  colModel?: { getAllDisplayedCols?(): FindColumn[]; getCols?(): FindColumn[] };
  rowModel?: { forEachNodeAfterFilterAndSort?(callback: (node: FindNode) => void): void; forEachNode?(callback: (node: FindNode) => void): void };
  valueSvc?: { getValue(column: FindColumn, node: FindNode, type: string, ignoreAggData?: boolean): unknown };
  eventSvc?: { dispatchEvent(event: object): void };
  ctrlsSvc?: { getGridBodyCtrl?(): { getScrollFeature?(): { ensureIndexVisible?(index: number, position?: 'top' | 'bottom' | 'middle'): void } } | undefined };
  rowRenderer?: { refreshCells(params?: { force?: boolean }): void };
  pagination?: { isRowInPage(index: number): boolean };
};

interface MatchEntry { match: FindMatch; count: number; text?: string; }

/** The `findSvc` rendering seam plus the public Find API. */
export class FindService extends BeanStub implements IFindService, NamedBean {
  public beanName = 'findSvc' as const;
  public totalMatches = 0;
  public activeMatch: FindMatch | undefined;
  private entries: MatchEntry[] = [];
  private activeIndex = -1;

  public postConstruct(): void {
    this.refresh(false);
    this.addManagedPropertyListeners(['findSearchValue', 'findOptions'], () => this.refresh(false));
    this.addManagedEventListeners({ modelUpdated: () => this.refresh(true), displayedColumnsChanged: () => this.refresh(true), rowDataUpdated: () => this.refresh(true), paginationChanged: () => this.refresh(true) });
  }
  public isMatch(node: IRowNode, column: Column | null): boolean { return this.getNumMatches(node, column) > 0; }
  public getParts(params: FindCellValueParams): FindPart[] {
    const term = this.search(); if (!term) return [{ value: params.value }];
    const regex = new RegExp(escape(term), this.options().caseSensitive ? 'g' : 'gi');
    const active = this.activeMatch;
    const result: FindPart[] = []; let cursor = 0; let number = params.precedingNumMatches ?? 0; let match: RegExpExecArray | null;
    while ((match = regex.exec(params.value)) !== null) {
      if (match.index > cursor) result.push({ value: params.value.slice(cursor, match.index) });
      number++; result.push({ value: match[0], match: true, activeMatch: active?.node === params.node && active.column === params.column && active.numInMatch === number });
      cursor = match.index + match[0].length;
      if (match[0].length === 0) regex.lastIndex++;
    }
    if (cursor < params.value.length || result.length === 0) result.push({ value: params.value.slice(cursor) });
    return result;
  }
  public next(): void { this.goTo(this.activeIndex + 2 || 1, false); }
  public previous(): void { this.goTo(this.activeIndex <= 0 ? this.totalMatches : this.activeIndex, false); }
  public goTo(match: number, force = false): void {
    if (this.totalMatches === 0) { this.clearActive(); return; }
    const normalized = ((Math.trunc(match) - 1) % this.totalMatches + this.totalMatches) % this.totalMatches;
    if (!force && normalized === this.activeIndex) return;
    this.activeIndex = normalized; this.activeMatch = this.entries[normalized]?.match;
    const index = (this.activeMatch?.node as FindNode | undefined)?.rowIndex;
    if (typeof index === 'number') (this.beans as FindBeans).ctrlsSvc?.getGridBodyCtrl?.()?.getScrollFeature?.()?.ensureIndexVisible?.(index, 'middle');
    this.changed();
  }
  public clearActive(): void { if (!this.activeMatch) return; this.activeIndex = -1; this.activeMatch = undefined; this.changed(); }
  public getNumMatches(node: IRowNode, column: Column | null): number { return this.entries.filter((entry) => entry.match.node === node && entry.match.column === column).length; }
  public registerDetailGrid(_node: IRowNode, _api: GridApi): void { this.refresh(true); }
  public refresh(maintainActive = false): void {
    const previous = maintainActive ? this.activeMatch : undefined;
    this.entries = []; this.totalMatches = 0;
    const term = this.search();
    if (term) this.nodes().forEach((node) => this.indexNode(node));
    this.totalMatches = this.entries.length;
    this.activeIndex = previous ? this.entries.findIndex((entry) => sameMatch(entry.match, previous)) : -1;
    this.activeMatch = this.activeIndex >= 0 ? this.entries[this.activeIndex]?.match : undefined;
    this.changed();
  }
  private indexNode(node: FindNode): void {
    const seen = new Set<string>();
    const columns = ((this.beans as FindBeans).colModel?.getAllDisplayedCols?.() ?? (this.beans as FindBeans).colModel?.getCols?.() ?? []).filter((column) => !seen.has(column.getId()) && !!seen.add(column.getId()));
    for (const column of columns) {
      const text = this.textFor(node, column); if (text == null) continue;
      this.add(node, column, count(text, this.search(), this.options().caseSensitive));
    }
    if (this.options().searchDetail && node.detailGridInfo?.api) {
      const detail = node.detailGridInfo.api;
      const total = detail.findGetTotalMatches?.() ?? 0;
      this.add(node, null, total);
    }
    const params = this.gos.get('detailCellRendererParams') as { getFindMatches?: (params: { node: FindNode; data: unknown; findSearchValue: string; updateMatches(): void; getMatchesForValue(value: string): number }) => number } | undefined;
    if (this.options().searchDetail && params?.getFindMatches && node.data !== undefined) this.add(node, null, params.getFindMatches({ node, data: node.data, findSearchValue: this.search(), updateMatches: () => this.refresh(true), getMatchesForValue: (value) => count(value, this.search(), this.options().caseSensitive) }));
    const fullWidth = this.gos.get('fullWidthCellRendererParams') as { getFindMatches?: (params: { node: FindNode; data: unknown; findSearchValue: string; updateMatches(): void; getMatchesForValue(value: string): number }) => number } | undefined;
    if ((node as FindNode & { fullWidth?: boolean }).fullWidth && fullWidth?.getFindMatches && node.data !== undefined) this.add(node, null, fullWidth.getFindMatches({ node, data: node.data, findSearchValue: this.search(), updateMatches: () => this.refresh(true), getMatchesForValue: (value) => count(value, this.search(), this.options().caseSensitive) }));
    const groupRenderer = this.gos.get('groupRowRendererParams') as { getFindText?: (params: object) => string | null } | undefined;
    if (node.group && groupRenderer?.getFindText) { const text = groupRenderer.getFindText({ node, data: node.data }); if (text != null) this.add(node, null, count(text, this.search(), this.options().caseSensitive)); }
  }
  private add(node: FindNode, column: FindColumn | null, amount: number): void { for (let i = 1; i <= amount; i++) this.entries.push({ match: { node, column, numInMatch: i, numOverall: this.entries.length + 1 }, count: amount }); }
  private textFor(node: FindNode, column: FindColumn): string | null {
    const value = (this.beans as FindBeans).valueSvc?.getValue(column, node, 'find', true) ?? (node.data as Record<string, unknown> | undefined)?.[column.getColDef().field ?? column.getId()];
    const callback = column.getColDef().getFindText;
    return callback ? callback({ value, data: node.data, node, column, colDef: column.getColDef(), getValueFormatted: () => String(value ?? '') } as never) : value == null ? '' : String(value);
  }
  private nodes(): FindNode[] { const nodes: FindNode[] = []; const seen = new Set<FindNode>(); const beans = this.beans as FindBeans; const model = beans.rowModel; const visit = (node: FindNode) => { const inCurrentPage = !this.options().currentPageOnly || typeof node.rowIndex === 'number' && (beans.pagination?.isRowInPage(node.rowIndex) ?? true); if (inCurrentPage && !seen.has(node)) { seen.add(node); nodes.push(node); } }; if (model?.forEachNodeAfterFilterAndSort) model.forEachNodeAfterFilterAndSort(visit); else model?.forEachNode?.(visit); return nodes; }
  private search(): string { return String(this.gos.get('findSearchValue') ?? ''); }
  private options(): { currentPageOnly?: boolean; caseSensitive?: boolean; searchDetail?: boolean } { return (this.gos.get('findOptions') as { currentPageOnly?: boolean; caseSensitive?: boolean; searchDetail?: boolean } | undefined) ?? {}; }
  private changed(): void { const beans = this.beans as FindBeans; beans.eventSvc?.dispatchEvent({ type: 'findChanged', findSearchValue: this.search(), totalMatches: this.totalMatches, activeMatch: this.activeMatch }); beans.rowRenderer?.refreshCells({ force: true }); }
}
function count(value: string, search: string, caseSensitive?: boolean): number { if (!search) return 0; const source = caseSensitive ? value : value.toLocaleLowerCase(); const term = caseSensitive ? search : search.toLocaleLowerCase(); let index = 0; let total = 0; while ((index = source.indexOf(term, index)) !== -1) { total++; index += Math.max(1, term.length); } return total; }
function escape(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function sameMatch(left: FindMatch, right: FindMatch): boolean { return left.node === right.node && left.column === right.column && left.numInMatch === right.numInMatch; }
