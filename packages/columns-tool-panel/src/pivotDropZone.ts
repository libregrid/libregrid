import { Component, type GridApi } from 'ag-grid-community';
import { iconSvg } from '@libregrid/core';

type PivotApi = Pick<GridApi, 'getColumn'> & Partial<Pick<GridApi,
  'getDisplayNameForColumn' | 'getGridOption' | 'getPivotColumns' | 'addPivotColumns' | 'removePivotColumns' | 'addEventListener' | 'removeEventListener'
>>;

export class PivotDropZone extends Component {
  private api: PivotApi | undefined;
  private readonly horizontal: boolean;
  private readonly embedded: boolean;
  private readonly update = () => this.render();

  public constructor(horizontal: boolean, embedded = false) {
    super();
    this.horizontal = horizontal;
    this.embedded = embedded;
    this.setTemplate('<section class="lgr-pivot-drop-zone" role="region" aria-label="Column Labels (Pivot)"></section>');
  }

  public postConstruct(): void { this.init(this.beans.gridApi as PivotApi); }
  public init(api: PivotApi): void {
    this.api?.removeEventListener?.('columnPivotChanged', this.update);
    this.api = api;
    api.addEventListener?.('columnPivotChanged', this.update);
    this.addDropListeners();
    this.render();
  }
  public override destroy(): void { this.api?.removeEventListener?.('columnPivotChanged', this.update); super.destroy(); }

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
    for (const column of columns) {
      const member = document.createElement('div');
      member.className = 'lgr-chip lgr-row-group-drop-zone-member';
      const label = document.createElement('span');
      const def = column.getColDef();
      label.textContent = def.headerName ?? def.field ?? column.getColId();
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'lgr-icon-button';
      remove.setAttribute('aria-label', `Remove ${label.textContent} from pivots`);
      remove.title = `Remove ${label.textContent} from pivots`;
      remove.innerHTML = iconSvg('close') ?? '×';
      remove.disabled = this.api?.getGridOption?.('functionsReadOnly') === true;
      remove.addEventListener('click', () => this.api?.removePivotColumns?.([column.getColId()]));
      member.append(label, remove);
      gui.appendChild(member);
    }
  }
  private addDropListeners(): void {
    const gui = this.getGui();
    gui.addEventListener('dragenter', () => gui.classList.add('lgr-drop-zone-drag-over'));
    gui.addEventListener('dragleave', (event) => {
      if (!(event.relatedTarget instanceof Node) || !gui.contains(event.relatedTarget)) {
        gui.classList.remove('lgr-drop-zone-drag-over');
      }
    });
    gui.ondragover = (event) => { if (this.api?.getGridOption?.('functionsReadOnly') !== true) event.preventDefault(); };
    gui.ondrop = (event) => {
      event.preventDefault();
      gui.classList.remove('lgr-drop-zone-drag-over');
      const id = event.dataTransfer?.getData('text/plain');
      const column = id ? this.api?.getColumn(id) : null;
      if (column && (column.getColDef().enablePivot === true) && this.api?.getGridOption?.('functionsReadOnly') !== true) this.api?.addPivotColumns?.([id!]);
    };
  }
}
