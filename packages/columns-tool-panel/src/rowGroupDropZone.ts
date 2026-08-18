import { Component, type ColDef, type Column, type GridApi } from 'ag-grid-community';
import { iconSvg } from '@libregrid/core';
import { DROP_ZONE_DRAG_OVER_CLASS, registerDropZone } from './dropZoneRegistry';

type RowGroupApi = Pick<GridApi, 'getColumn'> & Partial<Pick<GridApi,
  'getDisplayNameForColumn' | 'getGridOption' | 'getRowGroupColumns' | 'removeRowGroupColumns' |
  'moveRowGroupColumn' | 'addRowGroupColumns' | 'addEventListener' | 'removeEventListener'
>>;
type RowGroupColumnDef = Pick<ColDef, 'colId' | 'field' | 'headerName' | 'enableRowGroup' | 'showRowGroup'>;
type RowGroupColumn = Column & { isAutoRowGroupColumn?: () => boolean };

export class RowGroupDropZone extends Component {
  private api: RowGroupApi | undefined;
  private readonly horizontal: boolean;
  private readonly embedded: boolean;
  private readonly onColumnsChanged = () => this.render();
  private unregisterDropZone: (() => void) | undefined;

  public constructor(horizontal: boolean, embedded = false) {
    super();
    this.horizontal = horizontal;
    this.embedded = embedded;
    const label = embedded ? 'Toolbar Row Groups' : 'Row Groups';
    this.setTemplate(`<section class="lgr-row-group-drop-zone" role="region" aria-label="${label}"></section>`);
  }

  public postConstruct(): void {
    this.init(this.beans.gridApi as RowGroupApi);
  }

  /** Allows the un-wired builder product to be exercised without a grid context. */
  public init(api: RowGroupApi): void {
    this.removeApiListener();
    this.api = api;
    api.addEventListener?.('columnRowGroupChanged', this.onColumnsChanged);
    this.addDropListeners();
    this.unregisterDropZone?.();
    this.unregisterDropZone = registerDropZone({
      element: this.getGui(),
      kind: 'group',
      canDrop: (id) => this.canAddColumn(id),
      dropColumns: (ids) => this.acceptColumns(ids),
    });
    this.render();
  }

  public override destroy(): void {
    this.unregisterDropZone?.();
    this.unregisterDropZone = undefined;
    this.removeApiListener();
    super.destroy();
  }

  /** True when the column is eligible for this zone (native drop validation). */
  public canDropColumn(id: string): boolean {
    return this.canAddColumn(id);
  }

  /**
   * Drops columns from an external drag source (grid DragAndDropService
   * header drags, Material CDK adapter) through the same validation as native
   * drops. Returns how many columns were added.
   */
  public acceptColumns(ids: string[]): number {
    const eligible = ids.filter((id) => this.canAddColumn(id));
    if (eligible.length > 0) this.api?.addRowGroupColumns?.(eligible);
    return eligible.length;
  }

  private render(): void {
    const gui = this.getGui();
    gui.replaceChildren();
    gui.classList.toggle('lgr-row-group-drop-zone-horizontal', this.horizontal);
    gui.classList.toggle('lgr-row-group-drop-zone-embedded', this.embedded);

    const columns = this.getRowGroupColumns();
    if (columns.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'lgr-row-group-drop-zone-empty';
      empty.textContent = 'Drag columns here to group';
      gui.appendChild(empty);
      return;
    }

    columns.forEach((column, index) => gui.appendChild(this.createColumnMember(column, index, columns.length)));
  }

  private createColumnMember(column: Column, index: number, count: number): HTMLElement {
    const member = document.createElement('div');
    member.className = 'lgr-chip lgr-row-group-drop-zone-member';
    const name = this.getColumnName(column);
    const order = document.createElement('span');
    order.className = 'lgr-chip-index';
    order.setAttribute('aria-hidden', 'true');
    order.textContent = String(index + 1);
    const label = document.createElement('span');
    label.className = 'lgr-chip-label';
    label.textContent = name;
    label.title = name;
    const remove = this.createIconButton(`Remove ${name} from row groups`, 'close', () => this.removeColumn(column));
    remove.classList.add('lgr-chip-remove');
    remove.disabled = this.isFunctionsReadOnly();
    member.append(order, label);
    if (count > 1 && !this.isFunctionsReadOnly()) {
      const actions = document.createElement('span');
      actions.className = 'lgr-chip-actions';
      const up = this.createIconButton(`Move ${name} up`, 'sortAscending', () => this.moveColumn(index, index - 1));
      const down = this.createIconButton(`Move ${name} down`, 'sortDescending', () => this.moveColumn(index, index + 1));
      up.disabled = index === 0;
      down.disabled = index === count - 1;
      actions.append(up, down);
      member.append(actions);
    }
    member.append(remove);
    return member;
  }

  private createIconButton(label: string, icon: 'sortAscending' | 'sortDescending' | 'close', action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lgr-icon-button';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = iconSvg(icon) ?? '×';
    button.addEventListener('click', action);
    return button;
  }

  private addDropListeners(): void {
    const gui = this.getGui();
    gui.addEventListener('dragenter', () => gui.classList.add(DROP_ZONE_DRAG_OVER_CLASS));
    gui.addEventListener('dragleave', (event) => {
      if (!(event.relatedTarget instanceof Node) || !gui.contains(event.relatedTarget)) {
        gui.classList.remove(DROP_ZONE_DRAG_OVER_CLASS);
      }
    });
    gui.ondragover = (event) => {
      if (!this.isFunctionsReadOnly()) event.preventDefault();
    };
    gui.ondrop = (event) => {
      event.preventDefault();
      gui.classList.remove(DROP_ZONE_DRAG_OVER_CLASS);
      const id = event.dataTransfer?.getData('text/plain');
      if (id) this.acceptColumns([id]);
    };
  }

  private canAddColumn(id: string): boolean {
    if (this.isFunctionsReadOnly()) return false;
    const column = this.api?.getColumn(id) as RowGroupColumn | null | undefined;
    if (!column || this.isGroupDisplayColumn(column)) return false;
    return (column.getColDef() as RowGroupColumnDef).enableRowGroup === true;
  }

  private isGroupDisplayColumn(column: RowGroupColumn): boolean {
    const definition = column.getColDef() as RowGroupColumnDef;
    return column.isAutoRowGroupColumn?.() === true || definition.showRowGroup !== undefined;
  }

  private removeColumn(column: Column): void {
    if (!this.isFunctionsReadOnly()) this.api?.removeRowGroupColumns?.([column.getColId()]);
  }

  private moveColumn(fromIndex: number, toIndex: number): void {
    if (!this.isFunctionsReadOnly() && toIndex >= 0 && toIndex < this.getRowGroupColumns().length) {
      this.api?.moveRowGroupColumn?.(fromIndex, toIndex);
    }
  }

  private getRowGroupColumns(): Column[] {
    const fromApi = this.api?.getRowGroupColumns?.();
    if (fromApi) return fromApi;
    return this.beans?.rowGroupColsSvc?.columns ?? [];
  }

  private getColumnName(column: Column): string {
    const definition = column.getColDef() as RowGroupColumnDef;
    return definition.headerName ?? definition.field ?? definition.colId ?? this.api?.getDisplayNameForColumn?.(column, 'columnDrop') ?? column.getColId();
  }

  private isFunctionsReadOnly(): boolean {
    return this.gos?.get('functionsReadOnly') === true || this.api?.getGridOption?.('functionsReadOnly') === true;
  }

  private removeApiListener(): void {
    this.api?.removeEventListener?.('columnRowGroupChanged', this.onColumnsChanged);
  }
}
