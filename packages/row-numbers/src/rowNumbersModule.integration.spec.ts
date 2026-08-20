/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  ROW_NUMBERS_COLUMN_ID,
  type GridApi,
  type RowResizeEndedEvent,
  type RowResizeStartedEvent,
} from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { RowNumbersModule } from './rowNumbersModule';

const DATA = [
  { a: 1, b: 'one' },
  { a: 2, b: 'two' },
  { a: 3, b: 'three' },
];

let api: GridApi | undefined;
let host: HTMLDivElement | undefined;

async function makeGrid(options: Record<string, unknown> = {}): Promise<GridApi> {
  ModuleRegistry.registerModules([AllCommunityModule, RowNumbersModule, CellSelectionModule]);
  host = document.createElement('div');
  document.body.appendChild(host);
  const grid = createGrid(host, {
    columnDefs: [{ field: 'a' }, { field: 'b' }],
    rowData: DATA,
    ...options,
  });
  api = grid;
  await vi.waitFor(() => expect(host?.querySelectorAll('.ag-row').length).toBe(DATA.length));
  return grid;
}

/** Body row-number cells (the header cell shares the col-id and is excluded). */
function rowNumberCells(): HTMLElement[] {
  return Array.from(host?.querySelectorAll<HTMLElement>(`.ag-row [col-id="${ROW_NUMBERS_COLUMN_ID}"]`) ?? []);
}

function rowNumberCell(index: number): HTMLElement {
  const cell = rowNumberCells()[index];
  if (!cell) {
    throw new Error(`row-number cell ${index} not found`);
  }
  return cell;
}

function cellText(index: number): string {
  return rowNumberCell(index).textContent?.trim() ?? '';
}

afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

describe('RowNumbersModule', () => {
  it('adds the numbered column at the start and removes it when disabled', async () => {
    const grid = await makeGrid({ rowNumbers: true });
    expect(grid.getColumn(ROW_NUMBERS_COLUMN_ID)?.getColId()).toBe(ROW_NUMBERS_COLUMN_ID);
    expect(grid.getAllDisplayedColumns()[0]?.getColId()).toBe(ROW_NUMBERS_COLUMN_ID);
    expect([cellText(0), cellText(1), cellText(2)]).toEqual(['1', '2', '3']);

    grid.setGridOption('rowNumbers', false);
    await vi.waitFor(() => expect(grid.getAllDisplayedColumns().map((c) => c.getColId())).toEqual(['a', 'b']));
    expect(rowNumberCells()).toHaveLength(0);
  });

  it('honours width options', async () => {
    const grid = await makeGrid({ rowNumbers: { width: 100, minWidth: 80 } });
    const col = grid.getColumn(ROW_NUMBERS_COLUMN_ID);
    expect(col?.getActualWidth()).toBe(100);
    expect(col?.getMinWidth()).toBe(80);
  });

  it('selects the whole visible row when a number is clicked with cell selection', async () => {
    const grid = await makeGrid({ rowNumbers: true, cellSelection: true });
    // jsdom exposes touchstart (not pointerdown/mousedown) to Community's
    // row-container listeners; a primary press carries no button.
    rowNumberCell(1).dispatchEvent(new Event('touchstart', { bubbles: true }));
    await vi.waitFor(() => expect(grid.getCellRanges()).toHaveLength(1));
    const range = grid.getCellRanges()[0];
    expect(range?.startRow?.rowIndex).toBe(1);
    expect(range?.endRow?.rowIndex).toBe(1);
    expect(range?.columns.map((c) => c.getColId())).toEqual([ROW_NUMBERS_COLUMN_ID, 'a', 'b']);
    grid.clearCellSelection();
  });

  it('does not extend the selection to the row when suppressed', async () => {
    const grid = await makeGrid({ rowNumbers: { suppressCellSelectionIntegration: true }, cellSelection: true });
    rowNumberCell(0).dispatchEvent(new Event('touchstart', { bubbles: true }));
    await vi.waitFor(() => expect(grid.getCellRanges().length).toBeGreaterThan(0));
    for (const range of grid.getCellRanges()) {
      const ids = range.columns.map((c) => c.getColId());
      expect(ids).not.toContain('a');
      expect(ids).not.toContain('b');
    }
    grid.clearCellSelection();
  });

  it('resizes the row through the resizer and fires the resize events', async () => {
    const grid = await makeGrid({ rowNumbers: { enableRowResizer: true } });
    const cell = rowNumberCell(0);
    const resizer = cell.querySelector('.lgr-row-number-resizer') as HTMLElement | null;
    expect(resizer).not.toBeNull();

    const started = vi.fn<(event: RowResizeStartedEvent) => void>();
    const ended = vi.fn<(event: RowResizeEndedEvent) => void>();
    grid.addEventListener('rowResizeStarted', started);
    grid.addEventListener('rowResizeEnded', ended);

    // Grid events dispatched via the global event service are flushed on a
    // macrotask; await a tick before asserting.
    const tick = () => new Promise((r) => setTimeout(r, 0));
    resizer!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    await tick();
    expect(started).toHaveBeenCalledTimes(1);
    const node = started.mock.calls[0]?.[0].node;
    const before = node?.rowHeight ?? 0;

    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 25 }));
    expect(node?.rowHeight).toBe(before + 25);

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientY: 25 }));
    await tick();
    expect(ended).toHaveBeenCalledTimes(1);
    expect(ended.mock.calls[0]?.[0].rowHeight).toBe(before + 25);
    grid.resetRowHeights();
  });
});
