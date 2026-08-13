import type {
  ColDef,
  ColGroupDef,
  Column,
  ColumnPinnedType,
  ColumnChooserParams,
  ColumnToolPanelAction,
  GridApi,
  IColumnToolPanel,
  IToolPanelParams,
  IToolPanelColumnCompParams,
} from 'ag-grid-community';
import {
  attachColumnsToolPanelDragDrop,
  detachColumnsToolPanelDragDrop,
} from './columnsToolPanelDragDropAdapter';

type PanelParams = Partial<IToolPanelColumnCompParams> & IToolPanelParams & { api: GridApi };
type GridEventName = 'columnVisible' | 'columnPinned' | 'columnEverythingChanged' | 'columnsReset' | 'columnRowGroupChanged' | 'columnValueChanged' | 'columnMoved';
type ColumnApi = Pick<GridApi, 'setColumnsVisible' | 'setColumnsPinned' | 'getAllGridColumns'> & Partial<Pick<GridApi,
  'getColumnDefs' | 'moveColumns' | 'getDisplayNameForColumn' | 'getRowGroupColumns' | 'getValueColumns' | 'addRowGroupColumns' |
  'removeRowGroupColumns' | 'addValueColumns' | 'removeValueColumns' | 'setRowGroupColumns' | 'setValueColumns' | 'getGridOption' |
  'addEventListener' | 'removeEventListener'
>>;
type ColumnDef = Pick<ColDef, 'field' | 'headerName' | 'colId' | 'suppressColumnsToolPanel' | 'toolPanelClass' | 'enableRowGroup' | 'enableValue'>;
type ColumnTreeNode = ColumnLeaf | ColumnGroup;
let nextPanelId = 0;

interface ColumnLeaf {
  kind: 'leaf';
  column: Column;
}

interface ColumnGroup {
  kind: 'group';
  id: string;
  label: string;
  children: ColumnTreeNode[];
  leaves: Column[];
}

/**
 * Framework-neutral Columns tool panel component.
 *
 * @feature Columns Tool Panel
 */
export class ColumnsToolPanel implements IColumnToolPanel {
  private readonly gui = document.createElement('section');
  private readonly panelId = nextPanelId++;
  private api: ColumnApi | undefined;
  private params: PanelParams | undefined;
  private search = '';
  private customLayout: (ColDef | ColGroupDef)[] | undefined;
  private readonly sectionVisibility = new Map<string, boolean>();
  private readonly groupExpansion = new Map<string, boolean>();
  private readonly eventListeners = new Map<GridEventName, () => void>();
  private pendingVisibility: Map<string, boolean> | undefined;
  private pendingPinned: Map<string, ColumnPinnedType> | undefined;
  private pendingRowGroupColumns: Column[] | undefined;
  private pendingValueColumns: Column[] | undefined;
  private draggedColumn: Column | undefined;
  private applyingPendingChanges = false;

  public constructor() {
    this.gui.className = 'lgr-columns-tool-panel';
    this.gui.setAttribute('aria-label', 'Columns tool panel');
  }

  public init(params: PanelParams): void {
    this.removeApiListeners();
    this.params = params;
    this.api = params.api as ColumnApi;
    this.clearPendingChanges();
    this.addApiListeners();
    this.render();
  }

  public getGui(): HTMLElement {
    return this.gui;
  }

  public refresh(params: IToolPanelParams): boolean {
    if (this.params) this.params = { ...this.params, ...params };
    this.render();
    return true;
  }

  public destroy(): void {
    this.removeApiListeners();
    detachColumnsToolPanelDragDrop(this.gui);
    this.gui.replaceChildren();
  }

  public expandColumnGroups(groupIds?: string[]): void {
    this.setGroupsExpanded(groupIds, true);
    this.params?.onStateUpdated();
  }

  public collapseColumnGroups(groupIds?: string[]): void {
    this.setGroupsExpanded(groupIds, false);
    this.params?.onStateUpdated();
  }

  public setColumnLayout(colDefs: (ColDef | ColGroupDef)[]): void {
    this.customLayout = colDefs;
    this.render();
  }

  public syncLayoutWithGrid(): void {
    if (!this.params?.suppressSyncLayoutWithGrid) this.customLayout = undefined;
    this.render();
  }

  public setPivotModeSectionVisible(visible: boolean): void {
    this.setSectionVisible('pivot-mode', visible);
  }

  public setRowGroupsSectionVisible(visible: boolean): void {
    this.setSectionVisible('row-groups', visible);
  }

  public setValuesSectionVisible(visible: boolean): void {
    this.setSectionVisible('values', visible);
  }

  public setPivotSectionVisible(visible: boolean): void {
    this.setSectionVisible('pivots', visible);
  }

  public getState(): { expandedGroupIds: string[] } {
    return { expandedGroupIds: this.getGroups().filter((group) => this.isGroupExpanded(group)).map((group) => group.id) };
  }

  private setSectionVisible(section: string, visible: boolean): void {
    this.sectionVisibility.set(section, visible);
    this.render();
  }

  private render(): void {
    const api = this.api;
    if (!api) return;
    this.gui.replaceChildren();
    this.appendHeading();
    if (!this.params?.suppressColumnFilter) this.appendSearch();
    if (!this.params?.suppressColumnSelectAll) this.appendVisibilityControls();
    if (!this.params?.suppressColumnExpandAll && this.getGroups().length > 0) this.appendColumnExpandControls();
    this.appendColumnList();
    if (!this.params?.suppressRowGroups && this.isVisible('row-groups')) this.appendFunctionSection('Row Groups', 'group');
    if (!this.params?.suppressValues && this.isVisible('values')) this.appendFunctionSection('Values', 'value');
    if (!this.params?.suppressPivotMode && this.isVisible('pivot-mode')) this.appendUnavailableSection('Pivot Mode');
    if (!this.params?.suppressPivots && this.isVisible('pivots')) this.appendUnavailableSection('Column Labels (Pivot)');
    if (this.isDeferredActionsEnabled()) this.appendActionButtons();
    attachColumnsToolPanelDragDrop(this.gui);
  }

  private appendHeading(): void {
    const heading = document.createElement('h2');
    heading.textContent = 'Columns';
    this.gui.appendChild(heading);
  }

  private appendSearch(): void {
    const input = document.createElement('input');
    input.type = 'search';
    input.value = this.search;
    input.placeholder = 'Search columns';
    input.setAttribute('aria-label', 'Search columns');
    input.addEventListener('input', () => {
      this.search = input.value;
      this.render();
    });
    this.gui.appendChild(input);
  }

  private appendVisibilityControls(): void {
    const toolbar = document.createElement('div');
    toolbar.className = 'lgr-columns-toolbar';
    toolbar.append(this.createButton('Select all columns', () => this.setVisibleColumns(true)));
    toolbar.append(this.createButton('Unselect all columns', () => this.setVisibleColumns(false)));
    this.gui.appendChild(toolbar);
  }

  private appendColumnExpandControls(): void {
    const toolbar = document.createElement('div');
    toolbar.className = 'lgr-columns-toolbar lgr-columns-expand-toolbar';
    toolbar.append(this.createButton('Expand all column groups', () => this.expandColumnGroups()));
    toolbar.append(this.createButton('Collapse all column groups', () => this.collapseColumnGroups()));
    this.gui.appendChild(toolbar);
  }

  private appendActionButtons(): void {
    const actions: ColumnToolPanelAction[] = this.params?.buttons ?? [];
    const toolbar = document.createElement('div');
    toolbar.className = 'lgr-columns-actions';
    if (actions.includes('apply')) toolbar.append(this.createButton('Apply', () => this.applyPendingChanges()));
    if (actions.includes('cancel')) toolbar.append(this.createButton('Cancel', () => this.cancelPendingChanges()));
    this.gui.appendChild(toolbar);
  }

  private appendColumnList(): void {
    const list = document.createElement('div');
    list.className = 'lgr-columns-list';
    list.setAttribute('aria-label', 'Column visibility');
    list.setAttribute('role', 'tree');
    const definitions = this.api?.getColumnDefs?.();
    const columns = definitions ? this.appendColumnTree(list, this.buildColumnTree(this.customLayout ?? definitions)) : this.appendFlatColumns(list);
    const status = document.createElement('div');
    status.className = 'lgr-columns-status';
    status.setAttribute('role', 'status');
    status.textContent = `${columns.length} column${columns.length === 1 ? '' : 's'} available`;
    this.gui.append(list, status);
  }

  private appendFlatColumns(list: HTMLElement): Column[] {
    const columns = this.getColumns().filter((column) => this.matchesSearch(column));
    for (const column of columns) list.appendChild(this.createLeafRow(column, 1));
    return columns;
  }

  private appendColumnTree(list: HTMLElement, tree: ColumnTreeNode[]): Column[] {
    const columns: Column[] = [];
    this.appendTreeNodes(list, tree, 1, columns, false);
    return columns;
  }

  private appendTreeNodes(parent: HTMLElement, nodes: ColumnTreeNode[], depth: number, displayed: Column[], includeAll: boolean): void {
    for (const node of nodes) {
      if (node.kind === 'leaf') {
        if (includeAll || this.matchesSearch(node.column)) {
          parent.appendChild(this.createLeafRow(node.column, depth));
          displayed.push(node.column);
        }
        continue;
      }
      const groupMatches = this.matchesText(node.label);
      if (!includeAll && !groupMatches && !node.children.some((child) => this.nodeMatchesSearch(child))) continue;
      const expanded = this.search.length > 0 || this.isGroupExpanded(node);
      const row = this.createGroupRow(node, depth, expanded);
      parent.appendChild(row);
      if (expanded) {
        const children = document.createElement('div');
        children.className = 'lgr-columns-children';
        children.setAttribute('role', 'group');
        this.appendTreeNodes(children, node.children, depth + 1, displayed, includeAll || groupMatches);
        parent.appendChild(children);
      }
    }
  }

  private createGroupRow(group: ColumnGroup, depth: number, expanded: boolean): HTMLElement {
    const row = document.createElement('div');
    row.className = 'lgr-columns-row lgr-columns-group-row';
    row.setAttribute('role', 'treeitem');
    row.setAttribute('aria-level', String(depth));
    row.setAttribute('aria-expanded', String(expanded));
    row.style.setProperty('--lgr-column-depth', String(depth - 1));
    const toggle = this.createButton(`${expanded ? 'Collapse' : 'Expand'} ${group.label}`, () => {
      this.groupExpansion.set(group.id, !this.isGroupExpanded(group));
      this.params?.onStateUpdated();
      this.render();
    });
    toggle.className = 'lgr-columns-group-toggle';
    toggle.setAttribute('aria-expanded', String(expanded));
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const visible = group.leaves.filter((column) => this.isColumnVisible(column)).length;
    checkbox.checked = visible === group.leaves.length && visible > 0;
    checkbox.indeterminate = visible > 0 && visible < group.leaves.length;
    checkbox.setAttribute('aria-label', `Show ${group.label}`);
    checkbox.addEventListener('change', () => this.setColumnsVisible(group.leaves, checkbox.checked));
    const label = document.createElement('span');
    label.textContent = group.label;
    row.append(toggle, checkbox, label);
    return row;
  }

  private createLeafRow(column: Column, depth: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'lgr-columns-row';
    row.setAttribute('role', 'treeitem');
    row.setAttribute('aria-level', String(depth));
    row.dataset['columnId'] = this.getColumnId(column);
    row.dataset['columnName'] = this.getColumnName(column);
    row.dataset['columnIndex'] = String(this.getAllColumns().indexOf(column));
    row.style.setProperty('--lgr-column-depth', String(depth - 1));
    const colDef = this.getColDef(column);
    this.applyToolPanelClass(row, column, colDef);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.isColumnVisible(column);
    checkbox.id = `lgr-column-${this.panelId}-${this.getColumnId(column)}`;
    checkbox.setAttribute('aria-label', `Show ${this.getColumnName(column)}`);
    checkbox.addEventListener('change', () => this.setColumnsVisible([column], checkbox.checked));
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = this.getColumnName(column);
    row.append(checkbox, label);
    this.addColumnPinControls(row, column);
    if (!this.params?.suppressColumnMove) {
      row.dataset['columnMovable'] = 'true';
      this.addColumnMoveControls(row, column);
    }
    return row;
  }

  private addColumnPinControls(row: HTMLElement, column: Column): void {
    const name = this.getColumnName(column);
    if (this.getColumnPinned(column) === null) {
      row.append(
        this.createButton(`Pin ${name} left`, () => this.setColumnPinned(column, 'left')),
        this.createButton(`Pin ${name} right`, () => this.setColumnPinned(column, 'right')),
      );
      return;
    }
    row.append(this.createButton(`Unpin ${name}`, () => this.setColumnPinned(column, null)));
  }

  private addColumnMoveControls(row: HTMLElement, column: Column): void {
    row.draggable = true;
    row.addEventListener('dragstart', (event) => {
      this.draggedColumn = column;
      event.dataTransfer?.setData('text/plain', this.getColumnId(column));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => { this.draggedColumn = undefined; });
    row.addEventListener('dragover', (event) => {
      const dragged = this.getDraggedColumn(event);
      if (dragged && dragged !== column) event.preventDefault();
    });
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      const dragged = this.getDraggedColumn(event);
      if (dragged && dragged !== column) this.moveColumn(dragged, this.getAllColumns().indexOf(column));
      this.draggedColumn = undefined;
    });
    const index = this.getAllColumns().indexOf(column);
    const name = this.getColumnName(column);
    const up = this.createButton(`Move ${name} up`, () => this.moveColumn(column, index - 1));
    const down = this.createButton(`Move ${name} down`, () => this.moveColumn(column, index + 1));
    up.disabled = index <= 0;
    down.disabled = index < 0 || index >= this.getAllColumns().length - 1;
    row.append(up, down);
  }

  private appendFunctionSection(title: string, kind: 'group' | 'value'): void {
    const section = document.createElement('section');
    section.className = 'lgr-columns-section lgr-columns-drop-zone';
    section.dataset['functionKind'] = kind;
    section.setAttribute('aria-label', `Drop columns into ${title}`);
    if (this.canDropIntoFunctionSection()) {
      const acceptDrop = (event: DragEvent) => {
        // Chromium hides the drag payload until drop. Accept here, then validate
        // the resolved column in the drop handler before changing grid state.
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      };
      section.addEventListener('dragenter', acceptDrop);
      section.addEventListener('dragover', acceptDrop);
      section.addEventListener('drop', (event) => {
        event.preventDefault();
        const dragged = this.getDraggedColumn(event);
        if (dragged) this.addFunctionColumn(dragged, kind);
        this.draggedColumn = undefined;
      });
    }
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.appendChild(heading);
    const current = this.getFunctionColumns(kind);
    for (const column of current) section.append(this.createFunctionMember(column, kind));
    const eligible = this.getColumns().filter((column) => this.isEligible(column, kind) && !current.includes(column));
    for (const column of eligible) {
      section.append(this.createButton(
        `${kind === 'group' ? 'Group by' : 'Add value'} ${this.getColumnName(column)}`,
        () => this.addFunctionColumn(column, kind),
      ));
    }
    if (current.length === 0 && eligible.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lgr-columns-status';
      empty.textContent = 'No eligible columns';
      section.appendChild(empty);
    }
    this.gui.appendChild(section);
  }

  private createFunctionMember(column: Column, kind: 'group' | 'value'): HTMLElement {
    const member = document.createElement('div');
    member.className = 'lgr-columns-member';
    const label = document.createElement('span');
    label.textContent = this.getColumnName(column);
    member.append(label, this.createButton(`Remove ${this.getColumnName(column)} from ${kind === 'group' ? 'row groups' : 'values'}`, () => this.removeFunctionColumn(column, kind)));
    return member;
  }

  private appendUnavailableSection(title: string): void {
    const section = document.createElement('section');
    section.className = 'lgr-columns-section';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const status = document.createElement('div');
    status.className = 'lgr-columns-unavailable';
    status.textContent = 'Available in Phase 8';
    section.append(heading, status);
    this.gui.appendChild(section);
  }

  private createButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', onClick);
    return button;
  }

  private setVisibleColumns(visible: boolean): void {
    const columns = this.getColumnsMatchingSearch();
    if (columns.length > 0) this.setColumnsVisible(columns, visible);
  }

  private getColumnsMatchingSearch(): Column[] {
    if (!this.search) return this.getColumns();
    const definitions = this.customLayout ?? this.api?.getColumnDefs?.();
    if (!definitions) return this.getColumns().filter((column) => this.matchesSearch(column));
    const matches = new Set<Column>();
    const visit = (node: ColumnTreeNode): void => {
      if (node.kind === 'leaf') {
        if (this.matchesSearch(node.column)) matches.add(node.column);
      } else if (this.matchesText(node.label)) {
        for (const column of node.leaves) matches.add(column);
      } else {
        for (const child of node.children) visit(child);
      }
    };
    for (const node of this.buildColumnTree(definitions)) visit(node);
    return [...matches];
  }

  private getColumns(): Column[] {
    const columns = this.getAllColumns();
    const eligible = columns.filter((column) => !this.getColDef(column).suppressColumnsToolPanel);
    if (!this.customLayout) return eligible;
    const byId = new Map(eligible.map((column) => [this.getColumnId(column), column]));
    const ordered = this.getLayoutColumnIds(this.customLayout)
      .flatMap((id) => byId.has(id) ? [byId.get(id)!] : []);
    const orderedIds = new Set(ordered.map((column) => this.getColumnId(column)));
    return [...ordered, ...eligible.filter((column) => !orderedIds.has(this.getColumnId(column)))];
  }

  private getAllColumns(): Column[] {
    return this.api?.getAllGridColumns() ?? [];
  }

  private getColDef(column: Column): ColumnDef {
    return column.getColDef() as ColumnDef;
  }

  private getLayoutColumnIds(definitions: (ColDef | ColGroupDef)[]): string[] {
    return definitions.flatMap((definition) => {
      if ('children' in definition) return this.getLayoutColumnIds(definition.children);
      const id = definition.colId ?? definition.field;
      return id ? [id] : [];
    });
  }

  private buildColumnTree(definitions: (ColDef | ColGroupDef)[]): ColumnTreeNode[] {
    const byId = new Map(this.getColumns().map((column) => [this.getColumnId(column), column]));
    let generatedGroupId = 0;
    const build = (defs: (ColDef | ColGroupDef)[]): ColumnTreeNode[] => {
      const nodes: ColumnTreeNode[] = [];
      for (const definition of defs) {
        if ('children' in definition) {
          const children = build(definition.children);
          const leaves = this.getLeaves(children);
          if (leaves.length === 0) continue;
          const id = definition.groupId ?? `group-${generatedGroupId++}`;
          nodes.push({ kind: 'group', id, label: definition.headerName ?? id, children, leaves });
          continue;
        }
        if (definition.suppressColumnsToolPanel) continue;
        const column = byId.get(definition.colId ?? definition.field ?? '');
        if (column) nodes.push({ kind: 'leaf', column });
      }
      return nodes;
    };
    const tree = build(definitions);
    const included = new Set(this.getLeaves(tree).map((column) => this.getColumnId(column)));
    return [...tree, ...this.getColumns().filter((column) => !included.has(this.getColumnId(column))).map((column) => ({ kind: 'leaf' as const, column }))];
  }

  private getLeaves(nodes: ColumnTreeNode[]): Column[] {
    return nodes.flatMap((node) => node.kind === 'leaf' ? [node.column] : node.leaves);
  }

  private getGroups(): ColumnGroup[] {
    const definitions = this.api?.getColumnDefs?.();
    if (!definitions) return [];
    const groups: ColumnGroup[] = [];
    const visit = (nodes: ColumnTreeNode[]) => {
      for (const node of nodes) {
        if (node.kind === 'group') {
          groups.push(node);
          visit(node.children);
        }
      }
    };
    visit(this.buildColumnTree(this.customLayout ?? definitions));
    return groups;
  }

  private setGroupsExpanded(groupIds: string[] | undefined, expanded: boolean): void {
    const groups = this.getGroups();
    const ids = groupIds ? new Set(groupIds) : new Set(groups.map((group) => group.id));
    for (const group of groups) if (ids.has(group.id)) this.groupExpansion.set(group.id, expanded);
    this.render();
  }

  private isGroupExpanded(group: ColumnGroup): boolean {
    return this.groupExpansion.get(group.id) ?? (this.params?.contractColumnSelection !== true);
  }

  private nodeMatchesSearch(node: ColumnTreeNode): boolean {
    return node.kind === 'leaf'
      ? this.matchesSearch(node.column)
      : this.matchesText(node.label) || node.children.some((child) => this.nodeMatchesSearch(child));
  }

  private getColumnId(column: Column): string {
    return column.getColId();
  }

  private getColumnName(column: Column): string {
    const name = this.api?.getDisplayNameForColumn?.(column, 'columnToolPanel');
    return name ?? this.getColDef(column).headerName ?? this.getColDef(column).colId ?? this.getColumnId(column);
  }

  private isColumnVisible(column: Column): boolean {
    return this.pendingVisibility?.get(this.getColumnId(column)) ?? column.isVisible();
  }

  private getColumnPinned(column: Column): ColumnPinnedType {
    return this.pendingPinned?.get(this.getColumnId(column)) ?? column.getPinned();
  }

  private matchesSearch(column: Column): boolean {
    return this.matchesText(this.getColumnName(column));
  }

  private matchesText(value: string): boolean {
    return value.toLocaleLowerCase().includes(this.search.toLocaleLowerCase());
  }

  private applyToolPanelClass(element: HTMLElement, column: Column, colDef: ColumnDef): void {
    const value = colDef.toolPanelClass;
    let classes: string | string[] | undefined;
    try {
      classes = typeof value === 'function'
        ? value({ column: column, colDef, api: this.api as GridApi, context: this.params?.context })
        : value;
    } catch {
      return;
    }
    for (const className of typeof classes === 'string' ? [classes] : classes ?? []) {
      try {
        element.classList.add(className);
      } catch {
        // Ignore invalid class names from user supplied callbacks.
      }
    }
  }

  private getFunctionColumns(kind: 'group' | 'value'): Column[] {
    if (this.isFunctionDeferred(kind)) {
      return kind === 'group' ? this.pendingRowGroupColumns ?? [] : this.pendingValueColumns ?? [];
    }
    const getter = kind === 'group' ? this.api?.getRowGroupColumns : this.api?.getValueColumns;
    return getter?.call(this.api) ?? [];
  }

  private isEligible(column: Column, kind: 'group' | 'value'): boolean {
    const colDef = this.getColDef(column);
    return kind === 'group' ? colDef.enableRowGroup === true : colDef.enableValue === true;
  }

  private addFunctionColumn(column: Column, kind: 'group' | 'value'): void {
    if (this.isFunctionsReadOnly() || !this.isEligible(column, kind)) return;
    if (this.isFunctionDeferred(kind)) {
      const current = this.getFunctionColumns(kind);
      if (!current.includes(column)) this.setPendingFunctionColumns(kind, [...current, column]);
      this.render();
      return;
    }
    const add = kind === 'group' ? this.api?.addRowGroupColumns : this.api?.addValueColumns;
    add?.call(this.api, [column]);
  }

  private removeFunctionColumn(column: Column, kind: 'group' | 'value'): void {
    if (this.isFunctionsReadOnly()) return;
    if (this.isFunctionDeferred(kind)) {
      this.setPendingFunctionColumns(kind, this.getFunctionColumns(kind).filter((current) => current !== column));
      this.render();
      return;
    }
    const remove = kind === 'group' ? this.api?.removeRowGroupColumns : this.api?.removeValueColumns;
    remove?.call(this.api, [column]);
  }

  private isFunctionsReadOnly(): boolean {
    return this.api?.getGridOption?.('functionsReadOnly') === true;
  }

  private canDropIntoFunctionSection(): boolean {
    return !this.isFunctionsReadOnly();
  }

  private getDraggedColumn(event: DragEvent): Column | undefined {
    if (this.draggedColumn) return this.draggedColumn;
    const id = event.dataTransfer?.getData('text/plain');
    return id ? this.getColumns().find((column) => this.getColumnId(column) === id) : undefined;
  }

  private setColumnsVisible(columns: Column[], visible: boolean): void {
    if (!this.isDeferredActionsEnabled()) {
      this.api?.setColumnsVisible(columns, visible);
      return;
    }
    for (const column of columns) this.pendingVisibility?.set(this.getColumnId(column), visible);
    this.render();
  }

  private setColumnPinned(column: Column, pinned: ColumnPinnedType): void {
    if (!this.isDeferredActionsEnabled()) {
      this.api?.setColumnsPinned([column], pinned);
      return;
    }
    this.pendingPinned?.set(this.getColumnId(column), pinned);
    this.render();
  }

  private setPendingFunctionColumns(kind: 'group' | 'value', columns: Column[]): void {
    if (kind === 'group') this.pendingRowGroupColumns = columns;
    else this.pendingValueColumns = columns;
  }

  private isDeferredActionsEnabled(): boolean {
    return this.params?.buttons?.includes('apply') === true;
  }

  private isFunctionDeferred(kind: 'group' | 'value'): boolean {
    const setter = kind === 'group' ? this.api?.setRowGroupColumns : this.api?.setValueColumns;
    return this.isDeferredActionsEnabled() && typeof setter === 'function';
  }

  private clearPendingChanges(): void {
    this.pendingVisibility = undefined;
    this.pendingPinned = undefined;
    this.pendingRowGroupColumns = undefined;
    this.pendingValueColumns = undefined;
    if (!this.isDeferredActionsEnabled()) return;
    this.pendingVisibility = new Map(this.getColumns().map((column) => [this.getColumnId(column), column.isVisible()]));
    this.pendingPinned = new Map(this.getColumns().map((column) => [this.getColumnId(column), column.getPinned()]));
    this.pendingRowGroupColumns = this.api?.getRowGroupColumns?.call(this.api);
    this.pendingValueColumns = this.api?.getValueColumns?.call(this.api);
  }

  private applyPendingChanges(): void {
    if (!this.isDeferredActionsEnabled()) return;
    this.applyingPendingChanges = true;
    try {
      const visibility = this.pendingVisibility;
      if (visibility) {
        const visible = this.getColumns().filter((column) => visibility.get(this.getColumnId(column)) === true);
        const hidden = this.getColumns().filter((column) => visibility.get(this.getColumnId(column)) === false);
        if (visible.length > 0) this.api?.setColumnsVisible(visible, true);
        if (hidden.length > 0) this.api?.setColumnsVisible(hidden, false);
      }
      const pinned = this.pendingPinned;
      if (pinned) {
        for (const state of ['left', 'right', null] as const) {
          const columns = this.getColumns().filter((column) => pinned.get(this.getColumnId(column)) === state && column.getPinned() !== state);
          if (columns.length > 0) this.api?.setColumnsPinned(columns, state);
        }
      }
      if (this.pendingRowGroupColumns) this.api?.setRowGroupColumns?.(this.pendingRowGroupColumns);
      if (this.pendingValueColumns) this.api?.setValueColumns?.(this.pendingValueColumns);
    } finally {
      this.applyingPendingChanges = false;
    }
    this.clearPendingChanges();
    this.render();
  }

  private cancelPendingChanges(): void {
    this.clearPendingChanges();
    this.render();
  }

  private moveColumn(column: Column, targetIndex: number): void {
    const columns = this.getAllColumns();
    if (targetIndex < 0 || targetIndex >= columns.length || targetIndex === columns.indexOf(column)) return;
    this.api?.moveColumns?.([column], targetIndex);
  }

  private isVisible(section: string): boolean {
    return this.sectionVisibility.get(section) ?? true;
  }

  private addApiListeners(): void {
    const api = this.api;
    if (!api?.addEventListener) return;
    for (const event of ['columnVisible', 'columnPinned', 'columnEverythingChanged', 'columnsReset', 'columnRowGroupChanged', 'columnValueChanged', 'columnMoved'] as const) {
      const eventListener = event === 'columnMoved' && this.params?.suppressSyncLayoutWithGrid
        ? () => undefined
        : () => this.syncPendingState(event);
      api.addEventListener(event, eventListener as never);
      this.eventListeners.set(event, eventListener);
    }
  }

  private syncPendingState(event: GridEventName): void {
    if (this.applyingPendingChanges) return;
    if (this.isDeferredActionsEnabled()) {
      if (event === 'columnVisible') {
        this.pendingVisibility = new Map(this.getColumns().map((column) => [this.getColumnId(column), column.isVisible()]));
      } else if (event === 'columnPinned') {
        this.pendingPinned = new Map(this.getColumns().map((column) => [this.getColumnId(column), column.getPinned()]));
      } else if (event === 'columnRowGroupChanged') {
        this.pendingRowGroupColumns = this.api?.getRowGroupColumns?.call(this.api);
      } else if (event === 'columnValueChanged') {
        this.pendingValueColumns = this.api?.getValueColumns?.call(this.api);
      } else if (event === 'columnEverythingChanged' || event === 'columnsReset') {
        this.clearPendingChanges();
      }
    }
    this.render();
  }

  private removeApiListeners(): void {
    const api = this.api;
    if (api?.removeEventListener) {
      for (const [event, listener] of this.eventListeners) api.removeEventListener(event, listener as never);
    }
    this.eventListeners.clear();
  }
}

export type ColumnChooserPanelParams = ColumnChooserParams & { api: GridApi; onStateUpdated: () => void };
