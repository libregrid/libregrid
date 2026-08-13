import { Component, type ColDef, type Column, type GridApi } from 'ag-grid-community';

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

  public constructor(horizontal: boolean, embedded = false) {
    super();
    this.horizontal = horizontal;
    this.embedded = embedded;
    this.setTemplate('<section class="lgr-row-group-drop-zone" role="region" aria-label="Row Groups"></section>');
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
    this.render();
  }

  public override destroy(): void {
    this.removeApiListener();
    super.destroy();
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
    member.className = 'lgr-row-group-drop-zone-member';
    const name = this.getColumnName(column);
    const label = document.createElement('span');
    label.textContent = name;
    const up = this.createButton(`Move ${name} up`, () => this.moveColumn(index, index - 1));
    const down = this.createButton(`Move ${name} down`, () => this.moveColumn(index, index + 1));
    up.disabled = index === 0 || this.isFunctionsReadOnly();
    down.disabled = index === count - 1 || this.isFunctionsReadOnly();
    const remove = this.createButton(`Remove ${name} from row groups`, () => this.removeColumn(column));
    remove.disabled = this.isFunctionsReadOnly();
    member.append(label, up, down, remove);
    return member;
  }

  private createButton(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.textContent = label;
    button.addEventListener('click', action);
    return button;
  }

  private addDropListeners(): void {
    const gui = this.getGui();
    gui.ondragover = (event) => {
      if (!this.isFunctionsReadOnly()) event.preventDefault();
    };
    gui.ondrop = (event) => {
      event.preventDefault();
      const id = event.dataTransfer?.getData('text/plain');
      if (id && this.canAddColumn(id)) this.api?.addRowGroupColumns?.([id]);
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
