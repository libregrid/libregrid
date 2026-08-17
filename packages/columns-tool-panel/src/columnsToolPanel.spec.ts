/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ColDef, ColGroupDef, Column, ColumnPinnedType, GridApi, ToolPanelClass } from 'ag-grid-community';
import { ColumnsToolPanel } from './columnsToolPanel';

interface FakeColumnOptions {
  id: string;
  headerName?: string;
  visible?: boolean;
  suppress?: boolean;
  field?: string;
  enableRowGroup?: boolean;
  enableValue?: boolean;
  enablePivot?: boolean;
  pinned?: ColumnPinnedType;
  toolPanelClass?: ToolPanelClass;
}

function createColumn(options: FakeColumnOptions): Column {
  let visible = options.visible ?? true;
  let pinned = options.pinned ?? null;
  return {
    getColId: () => options.id,
    getColDef: () => ({
      colId: options.id,
      field: options.field,
      headerName: options.headerName,
      suppressColumnsToolPanel: options.suppress,
      enableRowGroup: options.enableRowGroup,
      enableValue: options.enableValue,
      enablePivot: options.enablePivot,
      toolPanelClass: options.toolPanelClass,
    }),
    isVisible: () => visible,
    setVisible: (next: boolean) => { visible = next; },
    getPinned: () => pinned,
    setPinned: (next: ColumnPinnedType) => { pinned = next; },
  } as unknown as Column;
}

function createApi(columns: Column[], functionsReadOnly = false, definitions?: (ColDef | ColGroupDef)[], allowDrag = true) {
  const listeners = new Map<string, () => void>();
  const rowGroups: Column[] = [];
  const values: Column[] = [];
  const pivots: Column[] = [];
  return {
    getAllGridColumns: () => columns,
    getColumnDefs: definitions ? vi.fn(() => definitions) : undefined,
    moveColumns: vi.fn(),
    setColumnsVisible: vi.fn((selected: Column[], visible: boolean) => {
      for (const column of selected) (column as unknown as { setVisible(value: boolean): void }).setVisible(visible);
    }),
    setColumnsPinned: vi.fn((selected: Column[], pinned: ColumnPinnedType) => {
      for (const column of selected) (column as unknown as { setPinned(value: ColumnPinnedType): void }).setPinned(pinned);
    }),
    getDisplayNameForColumn: vi.fn((column: Column) => `Display ${column.getColId()}`),
    getRowGroupColumns: vi.fn(() => rowGroups),
    getValueColumns: vi.fn(() => values),
    getPivotColumns: vi.fn(() => pivots),
    addRowGroupColumns: vi.fn((selected: Column[]) => rowGroups.push(...selected)),
    removeRowGroupColumns: vi.fn((selected: Column[]) => selected.forEach((column) => rowGroups.splice(rowGroups.indexOf(column), 1))),
    addValueColumns: vi.fn((selected: Column[]) => values.push(...selected)),
    removeValueColumns: vi.fn((selected: Column[]) => selected.forEach((column) => values.splice(values.indexOf(column), 1))),
    addPivotColumns: vi.fn((selected: Column[]) => pivots.push(...selected)),
    removePivotColumns: vi.fn((selected: Column[]) => selected.forEach((column) => pivots.splice(pivots.indexOf(column), 1))),
    setRowGroupColumns: vi.fn((selected: Column[]) => rowGroups.splice(0, rowGroups.length, ...selected)),
    setValueColumns: vi.fn((selected: Column[]) => values.splice(0, values.length, ...selected)),
    setPivotColumns: vi.fn((selected: Column[]) => pivots.splice(0, pivots.length, ...selected)),
    getGridOption: vi.fn((key: string) => key === 'functionsReadOnly' ? functionsReadOnly : key === 'allowDragFromColumnsToolPanel' ? allowDrag : undefined),
    addEventListener: vi.fn((name: string, listener: () => void) => listeners.set(name, listener)),
    removeEventListener: vi.fn((name: string) => listeners.delete(name)),
    listeners,
  };
}

function initPanel(api: ReturnType<typeof createApi>, params: Record<string, unknown> = {}) {
  const panel = new ColumnsToolPanel();
  panel.init({ api: api as unknown as GridApi, context: null, onStateUpdated: vi.fn(), ...params } as never);
  document.body.appendChild(panel.getGui());
  return panel;
}

afterEach(() => document.body.replaceChildren());

describe('ColumnsToolPanel', () => {
  it('filters suppressed columns and toggles visibility from its checkbox', () => {
    const athlete = createColumn({ id: 'athlete', headerName: 'Athlete', toolPanelClass: ['custom-row'] });
    const hidden = createColumn({ id: 'secret', suppress: true });
    const api = createApi([athlete, hidden]);
    const panel = initPanel(api);

    expect(panel.getGui().textContent).toContain('Display athlete');
    expect(panel.getGui().textContent).not.toContain('secret');
    expect(panel.getGui().querySelector('.custom-row')).not.toBeNull();
    const checkbox = panel.getGui().querySelector<HTMLInputElement>('input[aria-label="Show Display athlete"]')!;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(api.setColumnsVisible).toHaveBeenCalledWith([athlete], false);
  });

  it('searches visible labels and selects all matching columns', () => {
    const athlete = createColumn({ id: 'athlete' });
    const year = createColumn({ id: 'year' });
    const api = createApi([athlete, year]);
    const panel = initPanel(api);
    const search = panel.getGui().querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'athlete';
    search.dispatchEvent(new Event('input'));

    expect(panel.getGui().textContent).toContain('Display athlete');
    expect(panel.getGui().textContent).not.toContain('Display year');
    const selectAll = panel.getGui().querySelector<HTMLInputElement>('input[aria-label="Select all columns"]')!;
    selectAll.checked = true;
    selectAll.dispatchEvent(new Event('change'));
    expect(api.setColumnsVisible).toHaveBeenLastCalledWith([athlete], true);
  });

  it('adds and removes eligible row groups and values unless functions are read-only', () => {
    const group = createColumn({ id: 'country', enableRowGroup: true });
    const value = createColumn({ id: 'gold', enableValue: true });
    const api = createApi([group, value]);
    const panel = initPanel(api);

    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Group by Display country"]')!.click();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Add value Display gold"]')!.click();
    expect(api.addRowGroupColumns).toHaveBeenCalledWith([group]);
    expect(api.addValueColumns).toHaveBeenCalledWith([value]);

    api.listeners.get('columnRowGroupChanged')?.();
    api.listeners.get('columnValueChanged')?.();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Remove Display country from row groups"]')!.click();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Remove Display gold from values"]')!.click();
    expect(api.removeRowGroupColumns).toHaveBeenCalledWith([group]);
    expect(api.removeValueColumns).toHaveBeenCalledWith([value]);

    const lockedApi = createApi([group, value], true);
    const lockedPanel = initPanel(lockedApi);
    lockedPanel.getGui().querySelector<HTMLButtonElement>('[aria-label="Group by Display country"]')!.click();
    lockedPanel.getGui().querySelector<HTMLButtonElement>('[aria-label="Add value Display gold"]')!.click();
    expect(lockedApi.addRowGroupColumns).not.toHaveBeenCalled();
    expect(lockedApi.addValueColumns).not.toHaveBeenCalled();
  });

  it('controls pivot mode and pivot columns, respects suppression, and applies custom column layout order', () => {
    const athlete = createColumn({ id: 'athlete', enablePivot: true });
    const year = createColumn({ id: 'year' });
    const api = createApi([athlete, year]);
    const panel = initPanel(api);
    expect(panel.getGui().textContent).toContain('Pivot Mode');
    expect(panel.getGui().textContent).toContain('Column Labels (Pivot)');
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Add pivot Display athlete"]')!.click();
    expect(api.addPivotColumns).toHaveBeenCalledWith([athlete]);

    panel.setColumnLayout([{ headerName: 'Details', children: [{ field: 'year' }, { colId: 'athlete' }] }]);
    expect(Array.from(panel.getGui().querySelectorAll('.lgr-columns-list label')).map((label) => label.textContent)).toEqual(['Display year', 'Display athlete']);
    panel.setRowGroupsSectionVisible(false);
    expect(panel.getGui().textContent).not.toContain('Row Groups');

    const suppressed = initPanel(api, { suppressRowGroups: true, suppressValues: true, suppressPivots: true, suppressPivotMode: true });
    expect(suppressed.getGui().textContent).not.toContain('Row Groups');
    expect(suppressed.getGui().textContent).not.toContain('Values');
    expect(suppressed.getGui().textContent).not.toContain('Pivot Mode');
  });

  it('renders groups recursively, filters from group names, and tracks group expansion', () => {
    const athlete = createColumn({ id: 'athlete' });
    const age = createColumn({ id: 'age' });
    const hidden = createColumn({ id: 'secret', suppress: true });
    const api = createApi([athlete, age, hidden], false, [{
      groupId: 'details', headerName: 'Details', children: [{ colId: 'athlete' }, {
        groupId: 'personal', headerName: 'Personal', children: [{ colId: 'age' }, { colId: 'secret', suppressColumnsToolPanel: true }],
      }],
    }]);
    const panel = initPanel(api, { contractColumnSelection: true });

    expect(panel.getGui().querySelector('[aria-label="Expand Details"]')).not.toBeNull();
    expect(panel.getGui().textContent).not.toContain('Display athlete');
    panel.expandColumnGroups(['details']);
    expect(panel.getGui().textContent).toContain('Display athlete');
    expect(panel.getGui().textContent).not.toContain('Display age');
    expect(panel.getState()).toEqual({ expandedGroupIds: ['details'] });
    panel.collapseColumnGroups();
    expect(panel.getState()).toEqual({ expandedGroupIds: [] });

    const search = panel.getGui().querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'personal';
    search.dispatchEvent(new Event('input'));
    expect(panel.getGui().textContent).toContain('Display age');
    const selectAll = panel.getGui().querySelector<HTMLInputElement>('input[aria-label="Select all columns"]')!;
    selectAll.checked = true;
    selectAll.dispatchEvent(new Event('change'));
    expect(api.setColumnsVisible).toHaveBeenLastCalledWith([age], true);
  });

  it('restores initial expansion state and removes grid listeners on destruction', () => {
    const athlete = createColumn({ id: 'athlete' });
    const api = createApi([athlete], false, [{ groupId: 'details', headerName: 'Details', children: [{ colId: 'athlete' }] }]);
    const panel = initPanel(api, { initialState: { expandedGroupIds: ['details'] } });
    expect(panel.getGui().textContent).toContain('Display athlete');
    panel.destroy();
    expect(api.removeEventListener).toHaveBeenCalled();
    expect(api.listeners.size).toBe(0);
  });

  it('honours every panel-control suppression and section visibility API', () => {
    const athlete = createColumn({ id: 'athlete' });
    const api = createApi([athlete]);
    const panel = initPanel(api, { suppressColumnFilter: true, suppressColumnSelectAll: true, suppressColumnExpandAll: true });
    expect(panel.getGui().querySelector('input[type="search"]')).toBeNull();
    expect(panel.getGui().querySelector('[aria-label="Select all columns"]')).toBeNull();
    expect(panel.getGui().querySelector('[aria-label="Expand all column groups"]')).toBeNull();
    panel.setValuesSectionVisible(false);
    panel.setPivotModeSectionVisible(false);
    panel.setPivotSectionVisible(false);
    expect(panel.getGui().textContent).not.toContain('Values');
    expect(panel.getGui().textContent).not.toContain('Pivot Mode');
    expect(panel.getGui().textContent).not.toContain('Column Labels (Pivot)');
  });

  it('expands and collapses all column groups from accessible controls', () => {
    const athlete = createColumn({ id: 'athlete' });
    const api = createApi([athlete], false, [{ groupId: 'details', headerName: 'Details', children: [{ colId: 'athlete' }] }]);
    const panel = initPanel(api, { contractColumnSelection: true });

    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Expand all column groups"]')!.click();
    expect(panel.getGui().textContent).toContain('Display athlete');
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Collapse all column groups"]')!.click();
    expect(panel.getGui().textContent).not.toContain('Display athlete');

    const suppressed = initPanel(api, { suppressColumnExpandAll: true });
    expect(suppressed.getGui().querySelector('[aria-label="Expand all column groups"]')).toBeNull();
  });

  it('sets a group checkbox to mixed and toggles all of its leaves', () => {
    const shown = createColumn({ id: 'shown', visible: true });
    const hidden = createColumn({ id: 'hidden', visible: false });
    const api = createApi([shown, hidden], false, [{ groupId: 'group', headerName: 'Group', children: [{ colId: 'shown' }, { colId: 'hidden' }] }]);
    const panel = initPanel(api);

    const checkbox = panel.getGui().querySelector<HTMLInputElement>('[aria-label="Show Group"]')!;
    expect(checkbox.indeterminate).toBe(true);
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(api.setColumnsVisible).toHaveBeenCalledWith([shown, hidden], true);
  });

  it('renders a native-style header, chip members, dashed empty states, and the pivot toggle', () => {
    const country = createColumn({ id: 'country', enableRowGroup: true });
    const gold = createColumn({ id: 'gold', enableValue: true });
    const api = createApi([country, gold]);
    const panel = initPanel(api);
    const gui = panel.getGui();

    // Header: one painted select-all checkbox sharing a row with the search box.
    const selectAll = gui.querySelector<HTMLInputElement>('input[aria-label="Select all columns"]')!;
    expect(selectAll.closest('.lgr-checkbox')).not.toBeNull();
    expect(selectAll.closest('.lgr-columns-header')?.querySelector('.lgr-search')).not.toBeNull();
    expect(gui.querySelector('.lgr-search input')?.getAttribute('placeholder')).toBe('Search...');

    // Function sections show the native dashed empty affordances.
    expect(gui.textContent).toContain('Drag here to set row groups');
    expect(gui.textContent).toContain('Drag here to aggregate');

    // Pivot mode is a labeled switch toggle.
    const pivot = gui.querySelector<HTMLInputElement>('input[aria-label="Enable pivot mode"]')!;
    expect(pivot.closest('.lgr-toggle')).not.toBeNull();
    expect(gui.textContent).toContain('Pivot Mode');

    // Adding a row group renders a chip member with an icon-only remove control.
    gui.querySelector<HTMLButtonElement>('[aria-label="Group by Display country"]')!.click();
    api.listeners.get('columnRowGroupChanged')?.();
    const member = gui.querySelector('.lgr-columns-member')!;
    expect(member.classList.contains('lgr-chip')).toBe(true);
    const remove = member.querySelector<HTMLButtonElement>('[aria-label="Remove Display country from row groups"]')!;
    expect(remove.classList.contains('lgr-icon-button')).toBe(true);
  });

  it('moves columns with buttons and native drag and drop', () => {
    const athlete = createColumn({ id: 'athlete' });
    const age = createColumn({ id: 'age' });
    const api = createApi([athlete, age]);
    const panel = initPanel(api);
    const gui = panel.getGui();

    gui.querySelector<HTMLButtonElement>('[aria-label="Move Display athlete down"]')!.click();
    expect(api.moveColumns).toHaveBeenCalledWith([athlete], 1);
    const source = gui.querySelector<HTMLElement>('[data-column-id="athlete"]')!;
    const target = gui.querySelector<HTMLElement>('[data-column-id="age"]')!;
    source.dispatchEvent(new Event('dragstart', { bubbles: true }));
    target.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(api.moveColumns).toHaveBeenLastCalledWith([athlete], 1);
  });

  it('moves columns by their full-grid indices when excluded columns are present', () => {
    const hidden = createColumn({ id: 'internal', suppress: true });
    const athlete = createColumn({ id: 'athlete' });
    const age = createColumn({ id: 'age' });
    const api = createApi([hidden, athlete, age]);
    const panel = initPanel(api);

    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Move Display athlete down"]')!.click();

    expect(api.moveColumns).toHaveBeenCalledWith([athlete], 2);
  });

  it('pins and unpins columns through the GridApi', () => {
    const athlete = createColumn({ id: 'athlete' });
    const api = createApi([athlete]);
    const panel = initPanel(api, { suppressColumnMove: true });

    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Pin Display athlete left"]')!.click();
    expect(api.setColumnsPinned).toHaveBeenCalledWith([athlete], 'left');
    expect(panel.getGui().querySelector('[aria-label="Move Display athlete up"]')).toBeNull();
  });

  it('refreshes pin controls when the grid dispatches columnPinned', () => {
    const athlete = createColumn({ id: 'athlete' });
    const api = createApi([athlete]);
    const panel = initPanel(api);

    api.setColumnsPinned([athlete], 'right');
    api.listeners.get('columnPinned')?.();
    expect(panel.getGui().querySelector('[aria-label="Pin Display athlete left"]')).toBeNull();
    expect(panel.getGui().querySelector('[aria-label="Unpin Display athlete"]')).not.toBeNull();
  });

  it('adds eligible columns dropped into function zones and rejects read-only drops', () => {
    const group = createColumn({ id: 'country', enableRowGroup: true });
    const value = createColumn({ id: 'gold', enableValue: true });
    const api = createApi([group, value]);
    const panel = initPanel(api);
    const source = panel.getGui().querySelector<HTMLElement>('[data-column-id="country"]')!;
    const zone = panel.getGui().querySelector<HTMLElement>('[aria-label="Drop columns into Row Groups"]')!;
    source.dispatchEvent(new Event('dragstart', { bubbles: true }));
    zone.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(api.addRowGroupColumns).toHaveBeenCalledWith([group]);

    const readOnlyApi = createApi([group, value], true);
    const readOnlyPanel = initPanel(readOnlyApi);
    const readOnlySource = readOnlyPanel.getGui().querySelector<HTMLElement>('[data-column-id="country"]')!;
    const readOnlyZone = readOnlyPanel.getGui().querySelector<HTMLElement>('[aria-label="Drop columns into Row Groups"]')!;
    readOnlySource.dispatchEvent(new Event('dragstart', { bubbles: true }));
    readOnlyZone.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(readOnlyApi.addRowGroupColumns).not.toHaveBeenCalled();
  });

  it('defers visibility and function changes until Apply, while Cancel restores grid state', () => {
    const group = createColumn({ id: 'country', enableRowGroup: true });
    const value = createColumn({ id: 'gold', enableValue: true });
    const api = createApi([group, value]);
    const panel = initPanel(api, { buttons: ['apply', 'cancel'] });

    const checkbox = panel.getGui().querySelector<HTMLInputElement>('input[aria-label="Show Display country"]')!;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Group by Display country"]')!.click();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Add value Display gold"]')!.click();
    expect(api.setColumnsVisible).not.toHaveBeenCalled();
    expect(api.setRowGroupColumns).not.toHaveBeenCalled();
    expect(api.setValueColumns).not.toHaveBeenCalled();
    expect(panel.getGui().querySelector<HTMLInputElement>('input[aria-label="Show Display country"]')!.checked).toBe(false);

    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Cancel"]')!.click();
    expect(panel.getGui().querySelector<HTMLInputElement>('input[aria-label="Show Display country"]')!.checked).toBe(true);
    expect(panel.getGui().querySelector('[aria-label="Remove Display country from row groups"]')).toBeNull();

    panel.getGui().querySelector<HTMLInputElement>('input[aria-label="Show Display country"]')!.click();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Group by Display country"]')!.click();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Add value Display gold"]')!.click();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Apply"]')!.click();
    expect(api.setColumnsVisible).toHaveBeenCalledWith([value], true);
    expect(api.setColumnsVisible).toHaveBeenCalledWith([group], false);
    expect(api.setRowGroupColumns).toHaveBeenCalledWith([group]);
    expect(api.setValueColumns).toHaveBeenCalledWith([value]);
  });

  it('defers pin changes until Apply and discards them on Cancel', () => {
    const athlete = createColumn({ id: 'athlete' });
    const api = createApi([athlete]);
    const panel = initPanel(api, { buttons: ['apply', 'cancel'] });

    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Pin Display athlete left"]')!.click();
    expect(api.setColumnsPinned).not.toHaveBeenCalled();
    expect(panel.getGui().querySelector('[aria-label="Unpin Display athlete"]')).not.toBeNull();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Cancel"]')!.click();
    expect(panel.getGui().querySelector('[aria-label="Pin Display athlete left"]')).not.toBeNull();

    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Pin Display athlete right"]')!.click();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Apply"]')!.click();
    expect(api.setColumnsPinned).toHaveBeenCalledWith([athlete], 'right');
  });

  it('still defers supported actions when grouping setters are unavailable', () => {
    const group = createColumn({ id: 'country', enableRowGroup: true });
    const api = createApi([group]);
    const {
      setRowGroupColumns: _setRowGroupColumns,
      setValueColumns: _setValueColumns,
      ...withoutSetters
    } = api;
    const panel = initPanel(withoutSetters, { buttons: ['apply', 'cancel'] });

    expect(panel.getGui().querySelector('[aria-label="Apply"]')).not.toBeNull();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Group by Display country"]')!.click();
    expect(api.addRowGroupColumns).toHaveBeenCalledWith([group]);
  });

  it('refreshes deferred visibility snapshots after external grid changes', () => {
    const athlete = createColumn({ id: 'athlete' });
    const api = createApi([athlete]);
    const panel = initPanel(api, { buttons: ['apply', 'cancel'] });
    const checkbox = panel.getGui().querySelector<HTMLInputElement>('[aria-label="Show Display athlete"]')!;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));

    api.setColumnsVisible([athlete], true);
    api.listeners.get('columnVisible')?.();
    panel.getGui().querySelector<HTMLButtonElement>('[aria-label="Apply"]')!.click();

    expect(api.setColumnsVisible).not.toHaveBeenLastCalledWith([athlete], false);
  });

  it('does not rerender on column movement when layout sync is suppressed, retaining manual layout', () => {
    const athlete = createColumn({ id: 'athlete' });
    const age = createColumn({ id: 'age' });
    const api = createApi([athlete, age]);
    const panel = initPanel(api, { suppressSyncLayoutWithGrid: true });
    panel.setColumnLayout([{ colId: 'age' }, { colId: 'athlete' }]);
    const list = panel.getGui().querySelector('.lgr-columns-list');

    api.listeners.get('columnMoved')?.();
    expect(panel.getGui().querySelector('.lgr-columns-list')).toBe(list);
    panel.syncLayoutWithGrid();
    expect(Array.from(panel.getGui().querySelectorAll('.lgr-columns-list label')).map((label) => label.textContent)).toEqual(['Display age', 'Display athlete']);
  });

  it('syncs manual layout when layout sync is enabled and safely applies callback classes', () => {
    const athlete = createColumn({ id: 'athlete', toolPanelClass: (params) => {
      expect(params.column).toBe(athlete);
      expect(params.colDef.colId).toBe('athlete');
      expect(params.api).toBeDefined();
      return ['callback-row'];
    } });
    const age = createColumn({ id: 'age' });
    const api = createApi([athlete, age]);
    const panel = initPanel(api);

    expect(panel.getGui().querySelector('.callback-row')).not.toBeNull();
    panel.setColumnLayout([{ colId: 'age' }, { colId: 'athlete' }]);
    panel.syncLayoutWithGrid();
    expect(Array.from(panel.getGui().querySelectorAll('.lgr-columns-list label')).map((label) => label.textContent)).toEqual(['Display athlete', 'Display age']);

    const throwing = createColumn({ id: 'throwing', toolPanelClass: () => { throw new Error('no class'); } });
    const throwingPanel = initPanel(createApi([throwing]));
    expect(throwingPanel.getGui().textContent).toContain('Display throwing');
  });

  it('keeps focus and caret in the search box across re-renders', () => {
    const athlete = createColumn({ id: 'athlete' });
    const panel = initPanel(createApi([athlete]));
    const search = panel.getGui().querySelector<HTMLInputElement>('input[aria-label="Search columns"]')!;
    search.focus();
    search.value = 'ath';
    search.setSelectionRange(2, 2);
    search.dispatchEvent(new Event('input', { bubbles: true }));

    const active = document.activeElement as HTMLInputElement;
    expect(active?.getAttribute('aria-label')).toBe('Search columns');
    expect(active.value).toBe('ath');
    expect(active.selectionStart).toBe(2);
  });
});
