/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, ModuleRegistry, createGrid, type GridApi } from 'ag-grid-community';
import { ColumnMenuModule, ContextMenuModule } from '@libregrid/menu';
import { ClipboardModule } from '@libregrid/clipboard';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { CalculatedColumnsModule } from './calculatedColumnsModule';

const DATA = [
  { a: 10, b: 4, c: 2 },
  { a: 20, b: 5, c: 4 },
];

interface Events {
  created: unknown[];
  expressionChanged: unknown[];
  removed: unknown[];
  validation: unknown[];
}

let api: GridApi | undefined;
let host: HTMLDivElement | undefined;
let events: Events;

function on(event: string): unknown[] {
  const e = events as unknown as Record<string, unknown[]>;
  if (e[event] === undefined) e[event] = [];
  return e[event]!;
}

async function makeGrid(options: Record<string, unknown> = {}): Promise<GridApi> {
  ModuleRegistry.registerModules([
    AllCommunityModule,
    CalculatedColumnsModule,
    ColumnMenuModule,
    ContextMenuModule,
    RowGroupingModule,
    ClipboardModule,
  ]);
  host = document.createElement('div');
  document.body.appendChild(host);
  events = { created: [], expressionChanged: [], removed: [], validation: [] };
  const grid = createGrid(host, {
    columnDefs: [
      { field: 'a' },
      { field: 'b' },
      { field: 'c' },
      { colId: 'sum', calculatedExpression: '[a] + [b]', headerName: 'Sum' },
    ],
    rowData: DATA,
    calculatedColumns: true,
    onCalculatedColumnCreated: (e) => on('created').push(e),
    onCalculatedColumnExpressionChanged: (e) => on('expressionChanged').push(e),
    onCalculatedColumnRemoved: (e) => on('removed').push(e),
    onCalculatedColumnValidationStateChanged: (e) => on('validation').push(e),
    ...options,
  });
  api = grid;
  // Full-width rows also carry `.ag-row`, so wait for "at least" the data rows.
  await vi.waitFor(() => expect(host?.querySelectorAll('.ag-row').length).toBeGreaterThanOrEqual(DATA.length));
  return grid;
}

function cell(row: number, colId: string): HTMLElement {
  const rowEl = host?.querySelectorAll('.ag-row')[row];
  const el = rowEl?.querySelector<HTMLElement>(`.ag-cell[col-id="${colId}"]`);
  if (!el) {
    throw new Error(`cell ${row}/${colId} not found`);
  }
  return el;
}

function cellText(row: number, colId: string): string {
  return cell(row, colId).textContent?.trim() ?? '';
}

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.lgr-calc-dialog');
}

function expressionInput(): HTMLInputElement {
  const input = dialog()?.querySelector<HTMLInputElement>('.lgr-calc-dialog-expression');
  if (!input) throw new Error('expression input not found');
  return input;
}

function typeExpression(text: string): void {
  const input = expressionInput();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function menuItemLabels(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.lgr-menu-item')).map((el) => el.textContent?.trim() ?? '');
}

function clickMenuItem(label: string): void {
  const item = Array.from(document.querySelectorAll<HTMLElement>('.lgr-menu-item')).find(
    (el) => el.textContent?.trim() === label,
  );
  if (!item) throw new Error(`menu item "${label}" not found`);
  item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

async function openColumnMenu(colId: string): Promise<void> {
  const button = host?.querySelector<HTMLElement>(`.ag-header-cell[col-id="${colId}"] .ag-header-cell-menu-button`);
  if (!button) throw new Error(`column menu button for ${colId} not found`);
  button.click();
  await vi.waitFor(() => expect(document.querySelector('.lgr-menu')).not.toBeNull());
}

/** Header cells are absolutely positioned: visual order = `style.left` order. */
function visualHeaderIds(): (string | null)[] {
  return Array.from(host!.querySelectorAll<HTMLElement>('.ag-header-cell'))
    .sort((a, b) => parseFloat(a.style.left || '0') - parseFloat(b.style.left || '0'))
    .map((el) => el.getAttribute('col-id'));
}

/** Hover the parent item (nested menus open on hover) and wait for the submenu. */
async function openSubMenu(parentLabel: string): Promise<void> {
  const parent = Array.from(document.querySelectorAll<HTMLElement>('.lgr-menu-item')).find((el) =>
    el.textContent?.includes(parentLabel),
  );
  if (!parent) throw new Error(`submenu parent "${parentLabel}" not found`);
  parent.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  await vi.waitFor(() => expect(document.querySelectorAll('.lgr-menu').length).toBeGreaterThanOrEqual(2));
}

afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

describe('CalculatedColumnsModule (integration)', () => {
  it('computes declared calculated columns with bracket references', async () => {
    await makeGrid();
    await vi.waitFor(() => expect(cellText(0, 'sum')).toBe('14'));
    expect(cellText(1, 'sum')).toBe('25');
  });

  it('supports chained calculated references', async () => {
    await makeGrid({
      columnDefs: [
        { field: 'a' },
        { field: 'b' },
        { colId: 'ab', calculatedExpression: '[a] * [b]' },
        { colId: 'total', calculatedExpression: '[ab] + [a]' },
      ],
    });
    await vi.waitFor(() => expect(cellText(0, 'total')).toBe('50'));
    expect(cellText(1, 'total')).toBe('120');
  });

  it('renders error codes for invalid expressions and unknown references', async () => {
    await makeGrid({
      columnDefs: [
        { field: 'a' },
        { colId: 'bad', calculatedExpression: '[missing] + 1' },
        { colId: 'parse', calculatedExpression: '[a] +' },
      ],
    });
    await vi.waitFor(() => expect(cellText(0, 'bad')).toBe('#REF!'));
    expect(cellText(0, 'parse')).toBe('#PARSE!');
    // The formula-error CSS class is applied by Community via getFormulaError.
    expect(cell(0, 'bad').classList.contains('formula-error')).toBe(true);
  });

  it('enforces read-only: calculated columns reject edits', async () => {
    const grid = await makeGrid({
      columnDefs: [
        { field: 'a', editable: true },
        { field: 'b' },
        { field: 'c' },
        { colId: 'sum', calculatedExpression: '[a] + [b]', headerName: 'Sum' },
      ],
    });
    await vi.waitFor(() => expect(cellText(0, 'sum')).toBe('14'));
    // v36's startEditingCell is void; the assertion is that no editor opens.
    grid.startEditingCell({ rowIndex: 0, colKey: 'sum' });
    await vi.waitFor(() => expect(host?.querySelector('.ag-cell-inline-editing, .ag-cell-edit-wrapper')).toBeNull());
    expect(cellText(0, 'sum')).toBe('14');
    // Editing a plain column still works, so the gate is calc-column-specific.
    grid.startEditingCell({ rowIndex: 0, colKey: 'a' });
    await vi.waitFor(() => expect(host?.querySelector('.ag-cell-inline-editing')).not.toBeNull());
    grid.stopEditing();
  });

  it('adds a column after the source column through the column menu dialog (live mode)', async () => {
    await makeGrid();
    await vi.waitFor(() => expect(cellText(0, 'sum')).toBe('14'));

    await openColumnMenu('a');
    expect(menuItemLabels()).toContain('Add Calculated Column');
    clickMenuItem('Add Calculated Column');
    await vi.waitFor(() => expect(dialog()).not.toBeNull());

    typeExpression('[a] - [b]');
    await vi.waitFor(() => expect(host?.querySelector('.ag-cell[col-id="lgr-calc-1"]')).not.toBeNull());
    await vi.waitFor(() => expect(cellText(0, 'lgr-calc-1')).toBe('6'));
    expect(cellText(1, 'lgr-calc-1')).toBe('15');

    // Placed immediately after the source column 'a' (visual order).
    const headerIds = visualHeaderIds();
    const aIndex = headerIds.indexOf('a');
    expect(headerIds[aIndex + 1]).toBe('lgr-calc-1');

    // Public events dispatch asynchronously (non-sync event class).
    await vi.waitFor(() => expect(on('created')).toHaveLength(1));
  });

  it('edits a created column from its column menu and fires expressionChanged', async () => {
    await makeGrid();
    await openColumnMenu('b');
    clickMenuItem('Add Calculated Column');
    await vi.waitFor(() => expect(dialog()).not.toBeNull());
    typeExpression('[a] + [b]');
    await vi.waitFor(() => expect(cellText(0, 'lgr-calc-1')).toBe('14'));
    // Close the dialog (live mode keeps the latest state).
    dialog()!.querySelector<HTMLElement>('.lgr-calc-dialog-close')!.click();
    await vi.waitFor(() => expect(dialog()).toBeNull());

    await openColumnMenu('lgr-calc-1');
    await openSubMenu('Calculated Column');
    const labels = menuItemLabels();
    expect(labels).toEqual(expect.arrayContaining(['Edit Calculated Column', 'Remove Calculated Column']));
    clickMenuItem('Edit Calculated Column');
    await vi.waitFor(() => expect(dialog()).not.toBeNull());
    typeExpression('[a] * [c]');
    await vi.waitFor(() => expect(cellText(0, 'lgr-calc-1')).toBe('20'));
    expect(on('expressionChanged').length).toBeGreaterThanOrEqual(1);
  });

  it('flips validation state events and displays errors for invalid edits', async () => {
    await makeGrid();
    await openColumnMenu('a');
    clickMenuItem('Add Calculated Column');
    await vi.waitFor(() => expect(dialog()).not.toBeNull());
    typeExpression('[a] + [b]');
    await vi.waitFor(() => expect(cellText(0, 'lgr-calc-1')).toBe('14'));
    expect(on('validation')).toHaveLength(0);

    typeExpression('[nope] + 1');
    await vi.waitFor(() => expect(cellText(0, 'lgr-calc-1')).toBe('#REF!'));
    await vi.waitFor(() => expect(on('validation')).toHaveLength(1));
    const flip = on('validation')[0] as { valid: boolean; reason?: string };
    expect(flip.valid).toBe(false);
    expect(flip.reason).toBe('unknownReference');

    typeExpression('[a] + 1');
    await vi.waitFor(() => expect(cellText(0, 'lgr-calc-1')).toBe('11'));
    await vi.waitFor(() => expect(on('validation')).toHaveLength(2));
    expect((on('validation')[1] as { valid: boolean }).valid).toBe(true);
  });

  it('removes a created column and tombstones a declared one', async () => {
    const grid = await makeGrid();
    await openColumnMenu('b');
    clickMenuItem('Add Calculated Column');
    await vi.waitFor(() => expect(dialog()).not.toBeNull());
    typeExpression('[a] + [b]');
    await vi.waitFor(() => expect(cellText(0, 'lgr-calc-1')).toBe('14'));
    dialog()!.querySelector<HTMLElement>('.lgr-calc-dialog-close')!.click();
    await vi.waitFor(() => expect(dialog()).toBeNull());

    await openColumnMenu('lgr-calc-1');
    await openSubMenu('Calculated Column');
    clickMenuItem('Remove Calculated Column');
    await vi.waitFor(() => expect(host?.querySelector('.ag-header-cell[col-id="lgr-calc-1"]')).toBeNull());
    await vi.waitFor(() => expect(on('removed')).toHaveLength(1));

    // Declared calc column: removed via its menu and tombstoned in state.
    await openColumnMenu('sum');
    await openSubMenu('Calculated Column');
    clickMenuItem('Remove Calculated Column');
    await vi.waitFor(() => expect(host?.querySelector('.ag-header-cell[col-id="sum"]')).toBeNull());
    await vi.waitFor(() => expect(on('removed')).toHaveLength(2));

    const state = grid.getState();
    const tombstone = state.userColumns?.find((c: { colId: string }) => c.colId === 'sum');
    expect(tombstone?.removed).toBe(true);
  });

  it('offers Remove Calculated Column in the cell context menu', async () => {
    await makeGrid();
    const grid = api!;
    await vi.waitFor(() => expect(cellText(0, 'sum')).toBe('14'));
    grid.showContextMenu({ rowNode: grid.getRowNode('0')!, column: grid.getColumn('sum')!, value: null, source: 'api' });
    await vi.waitFor(() => expect(document.querySelector('.lgr-menu')).not.toBeNull());
    expect(menuItemLabels()).toContain('Remove Calculated Column');
    grid.destroy();
    host?.remove();
    api = undefined;

    // Not offered on non-calculated columns (fresh grid: the menu popup
    // service refuses an immediate re-open on the same grid instance).
    await makeGrid();
    api!.showContextMenu({ rowNode: api!.getRowNode('0')!, column: api!.getColumn('a')!, value: null, source: 'api' });
    await vi.waitFor(() => expect(document.querySelector('.lgr-menu')).not.toBeNull());
    expect(menuItemLabels()).not.toContain('Remove Calculated Column');
  });

  it('round-trips created columns through Grid State', async () => {
    const grid = await makeGrid();
    await openColumnMenu('a');
    clickMenuItem('Add Calculated Column');
    await vi.waitFor(() => expect(dialog()).not.toBeNull());
    typeExpression('[a] - [c]');
    await vi.waitFor(() => expect(cellText(0, 'lgr-calc-1')).toBe('8'));
    const state = grid.getState();
    grid.destroy();
    host?.remove();
    api = undefined;

    // A fresh grid restores the created column from the state's userColumns.
    ModuleRegistry.registerModules([AllCommunityModule, CalculatedColumnsModule, ColumnMenuModule, ContextMenuModule]);
    host = document.createElement('div');
    document.body.appendChild(host);
    events = { created: [], expressionChanged: [], removed: [], validation: [] };
    api = createGrid(host, {
      columnDefs: [
        { field: 'a' },
        { field: 'b' },
        { field: 'c' },
      ],
      rowData: DATA,
      calculatedColumns: true,
      initialState: state,
    });
    await vi.waitFor(() => expect(host?.querySelector('.ag-cell[col-id="lgr-calc-1"]')).not.toBeNull());
    expect(cellText(0, 'lgr-calc-1')).toBe('8');
  });

  it('applies changes only on Apply in deferred mode', async () => {
    await makeGrid({ calculatedColumns: { applyMode: 'deferred' } });
    await openColumnMenu('a');
    clickMenuItem('Add Calculated Column');
    await vi.waitFor(() => expect(dialog()).not.toBeNull());

    typeExpression('[a] + [b]');
    // Deferred: typing must not change the grid yet.
    expect(cellText(0, 'lgr-calc-1')).toBe('');

    dialog()!.querySelector<HTMLElement>('.lgr-calc-dialog-apply')!.click();
    await vi.waitFor(() => expect(cellText(0, 'lgr-calc-1')).toBe('14'));
    await vi.waitFor(() => expect(dialog()).toBeNull());
  });

  it('leaves calculated columns blank when the option is disabled', async () => {
    await makeGrid({ calculatedColumns: false });
    await vi.waitFor(() => expect(host?.querySelector('.ag-cell[col-id="sum"]')).not.toBeNull());
    expect(cellText(0, 'sum')).toBe('');
    // No menu entry when disabled.
    await openColumnMenu('a');
    expect(menuItemLabels()).not.toContain('Add Calculated Column');
  });

  it('aggregates calculated columns on group rows when an aggFunc is set', async () => {
    await makeGrid({
      rowData: [
        { grp: 'x', v: 1 },
        { grp: 'x', v: 3 },
        { grp: 'y', v: 5 },
      ],
      columnDefs: [
        { field: 'grp', rowGroup: true },
        { field: 'v' },
        { colId: 'double', calculatedExpression: '[v] * 2', aggFunc: 'sum' },
      ],
      groupDefaultExpanded: -1,
    });
    await vi.waitFor(() => expect(host?.querySelectorAll('.ag-row').length).toBeGreaterThan(0));
    const cells = Array.from(host!.querySelectorAll('.ag-row .ag-cell[col-id="double"]')).map((el) => el.textContent?.trim());
    expect(cells).toContain('8'); // group x: (1*2)+(3*2)
    expect(cells).toContain('10'); // group y
  });
});
