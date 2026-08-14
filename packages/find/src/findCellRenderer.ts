import type { ICellRendererParams } from 'ag-grid-community';
import type { FindService } from './findService';

/** Default renderer installed only for cells that have Find matches. */
export class FindCellRenderer {
  private readonly gui = document.createElement('span');
  public init(params: ICellRendererParams): void {
    const service = (params.node as unknown as { beans?: { findSvc?: FindService } }).beans?.findSvc;
    const value = params.valueFormatted ?? (params.value == null ? '' : String(params.value));
    const parts = service?.getParts({ node: params.node, column: params.column ?? null, value }) ?? [{ value }];
    parts.forEach((part) => { const span = document.createElement('span'); span.textContent = part.value; if (part.match) span.className = part.activeMatch ? 'lgr-find-match lgr-find-match-active' : 'lgr-find-match'; this.gui.append(span); });
  }
  public getGui(): HTMLElement { return this.gui; }
  public refresh(): boolean { return false; }
}
