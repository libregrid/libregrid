import { Component, type GridApi } from 'ag-grid-community';
import { iconSvg } from '@libregrid/core';
import { DROP_ZONE_DRAG_OVER_CLASS, registerDropZone } from './dropZoneRegistry';

type PivotApi = Pick<GridApi, 'getColumn'> & Partial<Pick<GridApi,
  'getDisplayNameForColumn' | 'getGridOption' | 'getPivotColumns' | 'addPivotColumns' | 'removePivotColumns' | 'addEventListener' | 'removeEventListener'
>>;

export class PivotDropZone extends Component {
  private api: PivotApi | undefined;
  private readonly horizontal: boolean;
  private readonly embedded: boolean;
  private readonly update = () => this.render();
  private unregisterDropZone: (() => void) | undefined;

  public constructor(horizontal: boolean, embedded = false) {
    super();
    this.horizontal = horizontal;
    this.embedded = embedded;
    const label = embedded ? 'Toolbar Column Labels (Pivot)' : 'Column Labels (Pivot)';
    this.setTemplate(`<section class="lgr-pivot-drop-zone" role="region" aria-label="${label}"></section>`);
  }

  public postConstruct(): void { this.init(this.beans.gridApi as PivotApi); }
  public init(api: PivotApi): void {
    this.api?.removeEventListener?.('columnPivotChanged', this.update);
    this.api = api;
    api.addEventListener?.('columnPivotChanged', this.update);
    this.addDropListeners();
    this.unregisterDropZone?.();
    this.unregisterDropZone = registerDropZone({
      element: this.getGui(),
      kind: 'pivot',
      canDrop: (id) => this.canAddColumn(id),
      dropColumns: (ids) => this.acceptColumns(ids),
    });
    this.render();
  }
  public override destroy(): void {
    this.unregisterDropZone?.();
    this.unregisterDropZone = undefined;
    this.api?.removeEventListener?.('columnPivotChanged', this.update);
    super.destroy();
  }

  /** True when the column is eligible for this zone (native drop validation). */
  public canDropColumn(id: string): boolean {
    return this.canAddColumn(id);
  }

  /** Drops externally-dragged columns through the native drop validation. */
  public acceptColumns(ids: string[]): number {
    const eligible = ids.filter((id) => this.canAddColumn(id));
    if (eligible.length > 0) this.api?.addPivotColumns?.(eligible);
    return eligible.length;
  }

  private canAddColumn(id: string): boolean {
    if (this.api?.getGridOption?.('functionsReadOnly') === true) return false;
    const column = this.api?.getColumn(id);
    return !!column && column.getColDef().enablePivot === true;
  }

  private render(): void {
    const gui = this.getGui();
    gui.replaceChildren();
    gui.classList.toggle('lgr-pivot-drop-zone-horizontal', this.horizontal);
    gui.classList.toggle('lgr-pivot-drop-zone-embedded', this.embedded);
    const columns = this.api?.getPivotColumns?.() ?? [];
    if (!columns.length) {
      const empty = document.createElement('span');
      empty.className = 'lgr-row-group-drop-zone-empty';
      empty.textContent = 'Drag columns here to pivot';
      gui.appendChild(empty);
      return;
    }
    columns.forEach((column, index) => {
      const member = document.createElement('div');
      member.className = 'lgr-chip lgr-row-group-drop-zone-member';
      const def = column.getColDef();
      const name = def.headerName ?? def.field ?? column.getColId();
      const order = document.createElement('span');
      order.className = 'lgr-chip-index';
      order.setAttribute('aria-hidden', 'true');
      order.textContent = String(index + 1);
      const label = document.createElement('span');
      label.className = 'lgr-chip-label';
      label.textContent = name;
      label.title = name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'lgr-icon-button lgr-chip-remove';
      remove.setAttribute('aria-label', `Remove ${name} from pivots`);
      remove.title = `Remove ${name} from pivots`;
      remove.innerHTML = iconSvg('close') ?? '×';
      remove.disabled = this.api?.getGridOption?.('functionsReadOnly') === true;
      remove.addEventListener('click', () => this.api?.removePivotColumns?.([column.getColId()]));
      member.append(order, label, remove);
      gui.appendChild(member);
    });
  }
  private addDropListeners(): void {
    const gui = this.getGui();
    gui.addEventListener('dragenter', () => gui.classList.add(DROP_ZONE_DRAG_OVER_CLASS));
    gui.addEventListener('dragleave', (event) => {
      if (!(event.relatedTarget instanceof Node) || !gui.contains(event.relatedTarget)) {
        gui.classList.remove(DROP_ZONE_DRAG_OVER_CLASS);
      }
    });
    gui.ondragover = (event) => { if (this.api?.getGridOption?.('functionsReadOnly') !== true) event.preventDefault(); };
    gui.ondrop = (event) => {
      event.preventDefault();
      gui.classList.remove(DROP_ZONE_DRAG_OVER_CLASS);
      const id = event.dataTransfer?.getData('text/plain');
      if (id) this.acceptColumns([id]);
    };
  }
}
