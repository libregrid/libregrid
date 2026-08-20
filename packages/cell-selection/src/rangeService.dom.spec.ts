/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { ROW_NUMBERS_COLUMN_ID } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { RangeService } from './rangeService';

describe('RangeService renderer integration', () => {
  it('updates cell borders, the fill handle, and header highlighting as a range changes', () => {
    const columns = ['a', 'b'].map((id) => ({
      getColId: () => id,
      getColDef: () => ({ field: id }),
    }));
    const { bean } = makeBeanHarness(RangeService, {
      gridOptions: { cellSelection: { handle: { mode: 'fill' }, enableHeaderHighlight: true } },
      beans: { gridApi: { getAllGridColumns: () => columns } },
    });
    const cellGui = document.createElement('div');
    const toggleCss = vi.fn();
    const feature = bean.createCellRangeFeature({
      rowNode: { rowIndex: 0, rowPinned: null },
      column: columns[0],
      eGui: cellGui,
    });
    feature.setComp({ toggleCss });
    const headerToggle = vi.fn();
    const destroy = vi.fn();
    bean.createRangeHighlightFeature({ addDestroyFunc: destroy } as never, columns[0], {
      toggleCss: headerToggle,
    });

    bean.setCellRange({ rowStartIndex: 0, rowEndIndex: 0, columnStart: 'a', columnEnd: 'a' });
    expect(toggleCss).toHaveBeenCalledWith('ag-cell-range-single-cell', true);
    expect(toggleCss).toHaveBeenCalledWith('ag-cell-range-top', true);
    expect(headerToggle).toHaveBeenLastCalledWith('ag-header-cell-range-selected', true);
    expect(cellGui.querySelector('.lgr-fill-handle')).not.toBeNull();
    feature.updateRangeBordersIfRangeCount();
    feature.onCellSelectionChanged();
    feature.unsetComp();
    feature.setComp({ toggleCss });

    bean.removeAllCellRanges();
    expect(headerToggle).toHaveBeenLastCalledWith('ag-header-cell-range-selected', false);
    expect(cellGui.querySelector('.lgr-fill-handle')).toBeNull();
    expect(destroy).toHaveBeenCalledOnce();
    feature.destroy();
  });

  it('renders a resize rather than fill handle when range mode is selected', () => {
    const column = { getColId: () => 'a', getColDef: () => ({ field: 'a' }) };
    const { bean } = makeBeanHarness(RangeService, {
      gridOptions: { cellSelection: { handle: { mode: 'range' } } },
      beans: { gridApi: { getAllGridColumns: () => [column] } },
    });
    const gui = document.createElement('div');
    const feature = bean.createCellRangeFeature({
      rowNode: { rowIndex: 0, rowPinned: null },
      column,
      eGui: gui,
    });
    feature.setComp({ toggleCss: vi.fn() });
    bean.setCellRange({ rowStartIndex: 0, rowEndIndex: 1, columnStart: 'a', columnEnd: 'a' });
    expect(gui.querySelector('.lgr-range-handle')).toBeNull();
    bean.setCellRange({ rowStartIndex: 0, rowEndIndex: 0, columnStart: 'a', columnEnd: 'a' });
    expect(gui.querySelector('.lgr-range-handle')).not.toBeNull();
  });
  it('drags, extends with shift, appends with ctrl, and routes fill/resize handle drops', () => {
    const columns = ['a', 'b'].map((id) => ({
      getColId: () => id,
      getColDef: () => ({ field: id }),
    }));
    const rangeService = makeBeanHarness(RangeService, {
      gridOptions: { cellSelection: { handle: { mode: 'fill' } } },
      beans: { gridApi: { getAllGridColumns: () => columns } },
    }).bean;
    const container = document.createElement('div');
    const first = document.createElement('div');
    first.className = 'ag-cell';
    first.setAttribute('col-id', 'a');
    const firstRow = document.createElement('div');
    firstRow.className = 'ag-row';
    firstRow.setAttribute('row-index', '0');
    firstRow.append(first);
    const last = document.createElement('div');
    last.className = 'ag-cell';
    last.setAttribute('col-id', 'b');
    const lastRow = document.createElement('div');
    lastRow.className = 'ag-row';
    lastRow.setAttribute('row-index', '2');
    lastRow.append(last);
    container.append(firstRow, lastRow);
    document.body.append(container);
    const feature = rangeService.createDragListenerFeature(container);
    feature.postConstruct();

    first.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
    last.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 1 }));
    last.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const draggedRange = rangeService.getCellRanges()[0];
    expect(draggedRange?.columns).toEqual(columns);
    expect(draggedRange?.endRow?.rowIndex).toBe(2);

    first.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, shiftKey: true, buttons: 1 }));
    expect(rangeService.getCellRanges()[0]?.endRow?.rowIndex).toBe(0);
    last.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ctrlKey: true, buttons: 1 }));
    expect(rangeService.getCellRanges()).toHaveLength(2);
    feature.destroy();
    container.remove();
  });

  it('resolves drag rows in the v36 DOM shape where cells are wrapped in scrolling-cells', () => {
    // Regression: v36 wraps cells in .ag-grid-scrolling-cells, so the row-index
    // attribute lives on the .ag-row grandparent. Number(parentElement.getAttribute)
    // silently resolved every drag to row 0.
    const columns = ['a', 'b'].map((id) => ({
      getColId: () => id,
      getColDef: () => ({ field: id }),
    }));
    const rangeService = makeBeanHarness(RangeService, {
      gridOptions: { cellSelection: { handle: { mode: 'fill' } } },
      beans: { gridApi: { getAllGridColumns: () => columns } },
    }).bean;
    const container = document.createElement('div');
    const makeWrappedCell = (colId: string, rowIndex: string) => {
      const row = document.createElement('div');
      row.className = 'ag-row';
      row.setAttribute('row-index', rowIndex);
      const scrolling = document.createElement('div');
      scrolling.className = 'ag-grid-scrolling-cells';
      const cell = document.createElement('div');
      cell.className = 'ag-cell';
      cell.setAttribute('col-id', colId);
      scrolling.append(cell);
      row.append(scrolling);
      return cell;
    };
    const first = makeWrappedCell('a', '0');
    const last = makeWrappedCell('b', '2');
    container.append(first.closest('.ag-row')!, last.closest('.ag-row')!);
    document.body.append(container);
    const feature = rangeService.createDragListenerFeature(container);
    feature.postConstruct();

    first.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
    last.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 1 }));
    last.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const draggedRange = rangeService.getCellRanges()[0];
    expect(draggedRange?.endRow?.rowIndex).toBe(2);
    expect(draggedRange?.startRow?.rowIndex).toBe(0);
    feature.destroy();
    container.remove();
  });

  it('never starts a cell drag from a row-number cell', () => {
    // The row-numbers feature owns the press on its column: it consumes the
    // pointerdown (recording it through the range service and selecting the
    // whole visible row), so the container mousedown must not create a cell
    // range here or it would clobber the row selection.
    const columns = [
      { getColId: () => ROW_NUMBERS_COLUMN_ID, getColDef: () => ({}) },
      { getColId: () => 'a', getColDef: () => ({ field: 'a' }) },
    ];
    const rangeService = makeBeanHarness(RangeService, {
      gridOptions: { cellSelection: true },
      beans: { gridApi: { getAllGridColumns: () => columns } },
    }).bean;
    const container = document.createElement('div');
    const rowNumber = document.createElement('div');
    rowNumber.className = 'ag-cell';
    rowNumber.setAttribute('col-id', ROW_NUMBERS_COLUMN_ID);
    const row = document.createElement('div');
    row.className = 'ag-row';
    row.setAttribute('row-index', '0');
    row.append(rowNumber);
    container.append(row);
    document.body.append(container);
    const feature = rangeService.createDragListenerFeature(container);
    feature.postConstruct();

    rowNumber.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
    rowNumber.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 1 }));
    rowNumber.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(rangeService.getCellRanges()).toHaveLength(0);
    feature.destroy();
    container.remove();
  });
});
