import { describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { RangeService } from './rangeService';
describe('RangeService', () => {
  it('creates an ordered Community cell range from column ids', () => {
    const columns = ['a', 'b', 'c'].map((id) => ({ getColId: () => id }));
    const { bean } = makeBeanHarness(RangeService, {
      beans: { gridApi: { getAllGridColumns: () => columns } },
    });
    const range = bean.addCellRange({
      rowStartIndex: 3,
      rowEndIndex: 1,
      columnStart: 'c',
      columnEnd: 'a',
    });
    expect(range?.columns.map((column) => column.getColId())).toEqual(['a', 'b', 'c']);
    expect(bean.getCellRanges()).toHaveLength(1);
    bean.removeAllCellRanges();
    expect(bean.isEmpty()).toBe(true);
  });
  it('fills a numeric series and wraps delete clear in selection events', () => {
    const columns = ['value'].map((id) => ({
      getColId: () => id,
      getColDef: () => ({ field: id }),
    }));
    const rows = [
      { value: 1 },
      { value: 2 },
      { value: 3 },
      { value: 0 },
      { value: 0 },
      { value: 0 },
    ];
    const dispatchEvent = vi.fn();
    const { bean } = makeBeanHarness(RangeService, {
      beans: {
        gridApi: {
          getAllGridColumns: () => columns,
          getDisplayedRowAtIndex: (index: number) => ({
            data: rows[index],
            setDataValue: (_column: unknown, value: number) => {
              rows[index].value = value;
            },
          }),
        },
        eventSvc: { dispatchEvent },
      },
    });
    const range = bean.addCellRange({
      rowStartIndex: 0,
      rowEndIndex: 2,
      columnStart: 'value',
      columnEnd: 'value',
    });
    bean.fillRangeToCell(range!, { rowIndex: 5, rowPinned: null, column: columns[0] });
    expect(rows.map((row) => row.value)).toEqual([1, 2, 3, 4, 5, 6]);
    bean.clearCellRangeCellValues({ dispatchWrapperEvents: true, wrapperEventSource: 'deleteKey' });
    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cellSelectionDeleteStart' }),
    );
    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cellSelectionDeleteEnd' }),
    );
  });
  it('supports range predicates, keyboard extension, and column selection options', () => {
    const columns = ['a', 'b', 'c'].map((id) => ({
      getColId: () => id,
      getColDef: () => ({ field: id }),
    }));
    const { bean } = makeBeanHarness(RangeService, {
      gridOptions: { cellSelection: { enableColumnSelection: true, suppressMultiRanges: false } },
      beans: { gridApi: { getAllGridColumns: () => columns, getDisplayedRowCount: () => 4 } },
    });
    const range = bean.addCellRange({
      rowStartIndex: 1,
      rowEndIndex: 2,
      columnStart: 'a',
      columnEnd: 'b',
    })!;
    expect(bean.getRangeRowCount(range)).toBe(2);
    expect(bean.isCellInAnyRange({ rowIndex: 1, rowPinned: null, column: columns[0] })).toBe(true);
    expect(bean.getCellRangeCount({ rowIndex: 1, rowPinned: null, column: columns[0] })).toBe(1);
    expect(
      bean.isBottomRightCell(range, { rowIndex: 2, rowPinned: null, column: columns[1] }),
    ).toBe(true);
    expect(bean.isContiguousRange(range)).toBe(true);
    expect(bean.isMoreThanOneCell()).toBe(true);
    expect(bean.areAllRangesAbleToMerge()).toBe(true);

    expect(bean.extendLatestRangeInDirection({ key: 'ArrowRight' } as KeyboardEvent)?.column).toBe(
      columns[2],
    );
    bean.extendRangeRowCountBy(bean.getCellRanges()[0]!, 4);
    expect(bean.getCellRanges()[0]?.endRow?.rowIndex).toBe(4);
    bean.extendRangeColumnCountBy(bean.getCellRanges()[0]!, -1);
    expect(bean.getCellRanges()[0]?.columns.map((column) => column.getColId())).toEqual(['a', 'b']);

    const rows: number[] = [];
    bean.forEachRowInRange(bean.getCellRanges()[0]!, (row) => rows.push(row.rowIndex));
    expect(rows).toEqual([1, 2, 3, 4]);
    bean.handleColumnSelection(columns[2], { ctrlKey: true, metaKey: false } as MouseEvent);
    expect(bean.getCellRanges()).toHaveLength(2);
  });
  it('safely rejects invalid ranges and keyboard boundaries while retaining pinned row identity', () => {
    const columns = ['a', 'b'].map((id) => ({
      getColId: () => id,
      getColDef: () => ({ field: id }),
    }));
    const { bean } = makeBeanHarness(RangeService, {
      beans: { gridApi: { getAllGridColumns: () => columns } },
    });
    expect(
      bean.createCellRangeFromCellRangeParams({
        rowStartIndex: null,
        rowEndIndex: 1,
        columnStart: 'a',
      }),
    ).toBeUndefined();
    expect(
      bean.createCellRangeFromCellRangeParams({
        rowStartIndex: 0,
        rowEndIndex: 1,
        columnStart: 'missing',
      }),
    ).toBeUndefined();
    expect(
      bean.createPartialCellRangeFromRangeParams({
        rowStartIndex: 0,
        rowEndIndex: 1,
        columns: [columns[0]],
      })?.columns,
    ).toEqual([columns[0]]);
    expect(bean.extendLatestRangeInDirection({ key: 'ArrowUp' } as KeyboardEvent)).toBeUndefined();
    bean.addCellRange({
      rowStartIndex: 0,
      rowStartPinned: 'top',
      rowEndIndex: 0,
      rowEndPinned: 'top',
      columnStart: 'a',
      columnEnd: 'a',
    });
    expect(bean.isRowInRange({ rowIndex: 0, rowPinned: 'top' }, bean.getCellRanges()[0]!)).toBe(
      true,
    );
    expect(bean.isRowInRange({ rowIndex: 0, rowPinned: null }, bean.getCellRanges()[0]!)).toBe(
      false,
    );
    expect(
      bean.extendLatestRangeInDirection({ key: 'ArrowLeft' } as KeyboardEvent),
    ).toBeUndefined();
    expect(bean.extendLatestRangeInDirection({ key: 'x' } as KeyboardEvent)).toBeUndefined();
    bean.removeAllCellRanges(true);
    expect(bean.getRangeStartRow({})).toEqual({ rowIndex: 0, rowPinned: null });
    expect(bean.getRangeEndRow({})).toEqual({ rowIndex: 0, rowPinned: null });
  });
  it('handles alternate selection input modes and harmless no-op fill paths', () => {
    const columns = ['a', 'b'].map((id) => ({
      getColId: () => id,
      getColDef: () => ({ field: id }),
    }));
    const { bean } = makeBeanHarness(RangeService, {
      gridOptions: { cellSelection: true, suppressMultiRangeSelection: true },
      beans: { gridApi: { getAllGridColumns: () => columns } },
    });
    expect(bean.handleMode()).toBeUndefined();
    expect(bean.headerHighlightEnabled()).toBe(false);
    bean.setRangeToCell({ rowIndex: 0, rowPinned: null, column: columns[0] });
    bean.handleCellMouseDown({ ctrlKey: true, metaKey: false, shiftKey: false } as MouseEvent, {
      rowIndex: 1,
      rowPinned: null,
      column: columns[1],
    });
    expect(bean.getCellRanges()).toHaveLength(1);
    bean.handleCellKeyboardSelect({ shiftKey: true } as KeyboardEvent, {
      rowIndex: 2,
      rowPinned: null,
      column: columns[1],
    });
    expect(bean.getCellRanges()).toHaveLength(1);
    const range = bean.getCellRanges()[0]!;
    bean.fillRangeToCell(range, { rowIndex: 1, rowPinned: null, column: columns[1] });
    bean.fillRangeToCell(range, { rowIndex: 3, rowPinned: 'top', column: columns[1] });
    bean.onDragStart({ target: null } as MouseEvent);
    bean.onDragging({ target: null, buttons: 0 } as MouseEvent);
    bean.onDragStop();
    bean.intersectLastRange();
  });
});
