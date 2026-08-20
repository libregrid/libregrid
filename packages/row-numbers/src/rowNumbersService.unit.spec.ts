/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { ROW_NUMBERS_COLUMN_ID, type ColDef, type IRowNode } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { RowNumbersService } from './rowNumbersService';

type Cell = { rowIndex: number | null; rowPinned: 'top' | 'bottom' | null; column: unknown };

function makeCell(rowIndex: number | null): Cell {
  return { rowIndex, rowPinned: null, column: {} };
}

function mouseEvent(button = 0): MouseEvent {
  return { button } as MouseEvent;
}

describe('RowNumbersService (unit)', () => {
  it('is disabled by default and enabled by boolean or options', () => {
    const { bean, gos, destroy } = makeBeanHarness(RowNumbersService, { beans: colModelStub() });
    expect(bean.isEnabled()).toBe(false);
    gos.set('rowNumbers', true);
    expect(bean.isEnabled()).toBe(true);
    gos.set('rowNumbers', { width: 80 });
    expect(bean.isEnabled()).toBe(true);
    gos.set('rowNumbers', undefined);
    expect(bean.isEnabled()).toBe(false);
    destroy();
  });

  it('builds the colDef with the spec defaults', () => {
    const { bean, destroy } = makeBeanHarness(RowNumbersService, { gridOptions: { rowNumbers: true } });
    const colDef = (bean as unknown as { createColDef(): ColDef }).createColDef();
    expect(colDef.colId).toBe(ROW_NUMBERS_COLUMN_ID);
    expect(colDef.width).toBe(60);
    expect(colDef.minWidth).toBe(60);
    expect(colDef.resizable).toBe(false);
    expect(colDef.sortable).toBe(false);
    expect(colDef.suppressMovable).toBe(true);
    expect(colChartDataType(colDef)).toBe('excluded');
    expect(colDef.lockPosition).toBe('left');
    destroy();
  });

  it('locks the column right in RTL grids', () => {
    const { bean, destroy } = makeBeanHarness(RowNumbersService, { gridOptions: { rowNumbers: true, enableRtl: true } });
    const colDef = (bean as unknown as { createColDef(): ColDef }).createColDef();
    expect(colDef.lockPosition).toBe('right');
    destroy();
  });

  it('applies user options and keeps the non-overridable pins', () => {
    const valueGetter = (params: { node: IRowNode }) => `row ${params.node.rowIndex}`;
    const { bean, destroy } = makeBeanHarness(RowNumbersService, {
      gridOptions: { rowNumbers: { width: 90, minWidth: 40, resizable: true, valueGetter, headerTooltip: 'tip' } },
    });
    const colDef = (bean as unknown as { createColDef(): ColDef }).createColDef();
    expect(colDef.width).toBe(90);
    expect(colDef.minWidth).toBe(40);
    expect(colDef.resizable).toBe(true);
    expect(colDef.headerTooltip).toBe('tip');
    expect(colDef.colId).toBe(ROW_NUMBERS_COLUMN_ID);
    expect(colChartDataType(colDef)).toBe('excluded');
    destroy();
  });

  it('defaults the row value to the 1-based visible index', () => {
    const { bean, destroy } = makeBeanHarness(RowNumbersService, { gridOptions: { rowNumbers: true } });
    const colDef = (bean as unknown as { createColDef(): ColDef }).createColDef();
    const getter = colDef.valueGetter as (params: { node: IRowNode | null }) => unknown;
    expect(getter({ node: { rowIndex: 0 } as IRowNode })).toBe(1);
    expect(getter({ node: { rowIndex: 4 } as IRowNode })).toBe(5);
    expect(getter({ node: null })).toBe(null);
    destroy();
  });

  it('consumes a left click on a row number into a full-row range', () => {
    const handleCellMouseDown = vi.fn();
    const setCellRange = vi.fn();
    const { bean, destroy } = makeBeanHarness(RowNumbersService, {
      gridOptions: { rowNumbers: true, cellSelection: true },
      beans: {
        rangeSvc: { handleCellMouseDown, setCellRange },
        gridApi: { getAllDisplayedColumns: () => ['c1', 'c2'] },
      },
    });
    // consumed: false tells Community to skip its default single-cell handling
    expect(bean.handleMouseDownOnCell(makeCell(2), mouseEvent(0))).toBe(false);
    // the press is recorded through the range service first (it sets the
    // dispatch-scoped mouseDownHandled flag cell-selection checks on the
    // follow-up mousedown), then replaced by the full-row range
    expect(handleCellMouseDown).toHaveBeenCalledTimes(1);
    expect(setCellRange).toHaveBeenCalledTimes(1);
    expect(handleCellMouseDown.mock.invocationCallOrder[0]).toBeLessThan(setCellRange.mock.invocationCallOrder[0]);
    expect(setCellRange).toHaveBeenCalledWith({
      rowStartIndex: 2,
      rowEndIndex: 2,
      rowStartPinned: null,
      rowEndPinned: null,
      columns: ['c1', 'c2'],
    });
    // right click is not consumed: pass through
    expect(bean.handleMouseDownOnCell(makeCell(2), mouseEvent(2))).toBe(true);
    // pinned rows keep their pinned section
    expect(bean.handleMouseDownOnCell({ rowIndex: 0, rowPinned: 'top', column: {} }, mouseEvent(0))).toBe(false);
    expect(setCellRange).toHaveBeenLastCalledWith(
      expect.objectContaining({ rowStartPinned: 'top', rowEndPinned: 'top' }),
    );
    destroy();
  });

  it('does not select when suppressed, unconfigured, or index-less', () => {
    const handleCellMouseDown = vi.fn();
    const setCellRange = vi.fn();
    const { bean, gos, destroy } = makeBeanHarness(RowNumbersService, {
      gridOptions: { rowNumbers: { suppressCellSelectionIntegration: true }, cellSelection: true },
      beans: {
        ...colModelStub(),
        rangeSvc: { handleCellMouseDown, setCellRange },
        gridApi: { getAllDisplayedColumns: () => [] },
      },
    });
    // suppressed: not consumed (pass through)
    expect(bean.handleMouseDownOnCell(makeCell(0), mouseEvent(0))).toBe(true);
    // unsuppressed but cell selection off: not consumed
    gos.set('rowNumbers', true);
    gos.set('cellSelection', false);
    expect(bean.handleMouseDownOnCell(makeCell(0), mouseEvent(0))).toBe(true);
    // cell selection back on: consumed (false), except for index-less cells
    gos.set('cellSelection', true);
    expect(bean.handleMouseDownOnCell(makeCell(0), mouseEvent(0))).toBe(false);
    expect(bean.handleMouseDownOnCell(makeCell(null), mouseEvent(0))).toBe(true);
    expect(handleCellMouseDown).toHaveBeenCalledTimes(1);
    expect(setCellRange).toHaveBeenCalledTimes(1);
    destroy();
  });

  it('returns false for key handling (docs silent)', () => {
    const { bean, destroy } = makeBeanHarness(RowNumbersService, { gridOptions: { rowNumbers: true } });
    expect(bean.handleKeyDownOnCell(makeCell(0), { key: 'Enter' } as KeyboardEvent)).toBe(false);
    destroy();
  });

  it('only creates the row resizer when enabled and row height is fixed', () => {
    const makeCtrl = () => ({ eGui: { appendChild: vi.fn() } as unknown as HTMLElement, rowNode: {} });
    const { bean, gos, destroy } = makeBeanHarness(RowNumbersService, {
      gridOptions: { rowNumbers: true },
      beans: colModelStub(),
    });
    expect(bean.createRowNumbersRowResizerFeature(makeCtrl())).toBe(undefined);
    gos.set('rowNumbers', { enableRowResizer: true });
    const feature = bean.createRowNumbersRowResizerFeature(makeCtrl());
    expect(feature).toBeDefined();
    feature?.destroy();
    gos.set('rowNumbers', { enableRowResizer: true });
    gos.set('getRowHeight', () => 30);
    expect(bean.createRowNumbersRowResizerFeature(makeCtrl())).toBe(undefined);
    destroy();
  });

  it('redraws rows when the effective resizer state changes (column present)', () => {
    const redrawRows = vi.fn();
    const { bean, gos, destroy } = makeBeanHarness(RowNumbersService, {
      gridOptions: { rowNumbers: { enableRowResizer: true } },
      beans: { ...colModelStub(), gridApi: { redrawRows, getAllDisplayedColumns: () => [] } },
    });
    // Simulate the generated column existing (the column model normally creates it).
    (bean as unknown as { column: unknown }).column = { setColDef: vi.fn(), isAlive: () => false, colId: ROW_NUMBERS_COLUMN_ID };

    // Disabling the resizer while the column exists → redraw.
    gos.set('rowNumbers', { enableRowResizer: false });
    expect(redrawRows).toHaveBeenCalledTimes(1);
    // Re-enabling → redraw again.
    gos.set('rowNumbers', { enableRowResizer: true });
    expect(redrawRows).toHaveBeenCalledTimes(2);
    // A custom row height deactivates the resizer even when enabled → redraw.
    gos.set('getRowHeight', () => 30);
    expect(redrawRows).toHaveBeenCalledTimes(3);
    // Clearing the height reactivates it → redraw.
    gos.set('getRowHeight', undefined);
    expect(redrawRows).toHaveBeenCalledTimes(4);
    // Unrelated option changes do not redraw.
    gos.set('rowNumbers', { enableRowResizer: true });
    expect(redrawRows).toHaveBeenCalledTimes(4);
    destroy();
  });

  it('does not redraw when the resizer toggles but the column does not exist', () => {
    const redrawRows = vi.fn();
    const { bean, gos, destroy } = makeBeanHarness(RowNumbersService, {
      gridOptions: { rowNumbers: { enableRowResizer: true } },
      beans: { ...colModelStub(), gridApi: { redrawRows, getAllDisplayedColumns: () => [] } },
    });
    // No column (grid not yet rendered the generated column) → no redraw needed.
    expect((bean as unknown as { column: unknown }).column).toBeNull();
    gos.set('rowNumbers', { enableRowResizer: false });
    expect(redrawRows).not.toHaveBeenCalled();
    destroy();
  });
});

function colChartDataType(colDef: ColDef): unknown {
  return (colDef as unknown as { chartDataType?: unknown }).chartDataType;
}

/**
 * The option-change handler refreshes the column model; stub it out.
 * `colDefList: []` keeps `_applyColumnState` (called from `refreshColDef`
 * when the column exists) short-circuiting before it reaches real beans.
 */
function colModelStub(): Record<string, unknown> {
  return { colModel: { refreshAll: vi.fn(), colDefList: [] } };
}
