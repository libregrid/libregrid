/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
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
    firstRow.setAttribute('row-index', '0');
    firstRow.append(first);
    const last = document.createElement('div');
    last.className = 'ag-cell';
    last.setAttribute('col-id', 'b');
    const lastRow = document.createElement('div');
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
});
