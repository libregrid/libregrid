import { describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { GridClipboardService } from './gridClipboardService';
describe('GridClipboardService paste', () => {
  it('applies parsed data, respects suppression, and emits paste events', () => {
    const setDataValue = vi.fn();
    const dispatchEvent = vi.fn();
    const column = { getColDef: () => ({ field: 'name' }) };
    const { bean } = makeBeanHarness(GridClipboardService, {
      beans: {
        rangeSvc: { getCellRanges: () => [{ startRow: { rowIndex: 0 }, columns: [column] }] },
        gridApi: { getDisplayedRowAtIndex: () => ({ data: { name: 'old' }, setDataValue }) },
        eventSvc: { dispatchEvent },
      },
    });
    bean.pasteData('new');
    expect(setDataValue).toHaveBeenCalledWith(column, 'new', 'clipboard');
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'pasteStart' }));
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'pasteEnd' }));
  });
  it('emits an edit request instead of mutating in read-only edit mode', () => {
    const setDataValue = vi.fn();
    const dispatchEvent = vi.fn();
    const column = { getColDef: () => ({ field: 'name' }) };
    const { bean } = makeBeanHarness(GridClipboardService, {
      gridOptions: { readOnlyEdit: true },
      beans: {
        rangeSvc: { getCellRanges: () => [{ startRow: { rowIndex: 0 }, columns: [column] }] },
        gridApi: { getDisplayedRowAtIndex: () => ({ data: { name: 'old' }, setDataValue }) },
        eventSvc: { dispatchEvent },
      },
    });
    bean.pasteData('new');
    expect(setDataValue).not.toHaveBeenCalled();
    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cellEditRequest', newValue: 'new' }),
    );
  });
  it('cuts the selected range and processes cell and header values before writing TSV', () => {
    const sendToClipboard = vi.fn();
    const dispatchEvent = vi.fn();
    const clearCellRangeCellValues = vi.fn();
    const column = {
      getColId: () => 'name',
      getColDef: () => ({ field: 'name', headerName: 'Name' }),
    };
    const { bean } = makeBeanHarness(GridClipboardService, {
      gridOptions: {
        sendToClipboard,
        processCellForClipboard: ({ value }: { value: unknown }) => String(value).toUpperCase(),
        processHeaderForClipboard: ({ value }: { value: string }) => `Column ${value}`,
      },
      beans: {
        rangeSvc: {
          getCellRanges: () => [
            { startRow: { rowIndex: 0 }, endRow: { rowIndex: 0 }, columns: [column] },
          ],
          clearCellRangeCellValues,
        },
        gridApi: { getDisplayedRowAtIndex: () => ({ data: { name: 'alpha' } }) },
        eventSvc: { dispatchEvent },
      },
    });
    bean.cutToClipboard({ includeHeaders: true });
    expect(sendToClipboard).toHaveBeenCalledWith({ data: 'Column Name\r\nALPHA' });
    expect(clearCellRangeCellValues).toHaveBeenCalledWith({ cellEventSource: 'clipboard' });
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'cutStart' }));
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'cutEnd' }));
  });
  it('extends the active range by one row for the copy-range-down API', () => {
    const fillRangeToCell = vi.fn();
    const column = { getColId: () => 'name', getColDef: () => ({ field: 'name' }) };
    const range = { endRow: { rowIndex: 2, rowPinned: null }, columns: [column] };
    const { bean } = makeBeanHarness(GridClipboardService, {
      beans: { rangeSvc: { getCellRanges: () => [range], fillRangeToCell } },
    });
    bean.copyRangeDown();
    expect(fillRangeToCell).toHaveBeenCalledWith(range, {
      rowIndex: 3,
      rowPinned: null,
      column,
    });
  });
  it('copies selected rows, skips groups, and accepts explicit column keys', () => {
    const sent = vi.fn();
    const name = { getColId: () => 'name', getColDef: () => ({ field: 'name' }) };
    const amount = { getColId: () => 'amount', getColDef: () => ({ field: 'amount' }) };
    const { bean } = makeBeanHarness(GridClipboardService, {
      gridOptions: { sendToClipboard: ({ data }: { data: string }) => sent(data) },
      beans: {
        gridApi: {
          getColumn: (key: string) => (key === 'name' ? name : null),
          getSelectedNodes: () => [
            { data: { name: 'Alpha', amount: 1 } },
            { data: { name: 'Group' }, group: true },
          ],
        },
      },
    });
    bean.copySelectedRowsToClipboard({ columnKeys: ['name'], includeHeaders: true });
    expect(sent).toHaveBeenCalledWith('name\r\nAlpha');
    expect(amount.getColId()).toBe('amount');
  });
  it('writes copied ranges to the browser clipboard when no host callback is configured', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const previousClipboard = Object.getOwnPropertyDescriptor(globalThis.navigator, 'clipboard');
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const column = { getColId: () => 'name', getColDef: () => ({ field: 'name' }) };
    const { bean } = makeBeanHarness(GridClipboardService, {
      beans: {
        rangeSvc: {
          getCellRanges: () => [
            { startRow: { rowIndex: 0 }, endRow: { rowIndex: 0 }, columns: [column] },
          ],
        },
        gridApi: { getDisplayedRowAtIndex: () => ({ data: { name: 'Alpha' } }) },
      },
    });

    try {
      bean.copySelectedRangeToClipboard({ includeHeaders: true });
      expect(writeText).toHaveBeenCalledWith('name\r\nAlpha');
    } finally {
      if (previousClipboard)
        Object.defineProperty(globalThis.navigator, 'clipboard', previousClipboard);
      else delete (globalThis.navigator as { clipboard?: unknown }).clipboard;
    }
  });
  it('honours suppression, clipboard reads, custom parsing, and per-column paste rejection', async () => {
    const readText = vi.fn().mockResolvedValue('accepted\tblocked');
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });
    const setDataValue = vi.fn();
    const accepted = { getColId: () => 'accepted', getColDef: () => ({ field: 'accepted' }) };
    const blocked = {
      getColId: () => 'blocked',
      getColDef: () => ({ field: 'blocked', suppressPaste: true }),
    };
    const { bean } = makeBeanHarness(GridClipboardService, {
      gridOptions: {
        processDataFromClipboard: () => [['custom', 'ignored']],
        processCellFromClipboard: ({ value }: { value: string }) => value.toUpperCase(),
      },
      beans: {
        rangeSvc: {
          getCellRanges: () => [{ startRow: { rowIndex: 0 }, columns: [accepted, blocked] }],
        },
        gridApi: { getDisplayedRowAtIndex: () => ({ data: {}, setDataValue }) },
      },
    });
    bean.pasteFromClipboard();
    await vi.waitFor(() => expect(readText).toHaveBeenCalledOnce());
    await vi.waitFor(() =>
      expect(setDataValue).toHaveBeenCalledWith(accepted, 'CUSTOM', 'clipboard'),
    );
    expect(setDataValue).not.toHaveBeenCalledWith(blocked, expect.anything(), 'clipboard');

    const suppressed = makeBeanHarness(GridClipboardService, {
      gridOptions: { suppressClipboardPaste: true },
    }).bean;
    suppressed.pasteFromClipboard();
    expect(readText).toHaveBeenCalledOnce();
  });
  it('handles empty range/row selections and direct parsing defaults', () => {
    const sent = vi.fn();
    const { bean } = makeBeanHarness(GridClipboardService, {
      gridOptions: { sendToClipboard: ({ data }: { data: string }) => sent(data) },
      beans: {
        rangeSvc: { getCellRanges: () => [] },
        gridApi: { getSelectedNodes: () => [], getAllGridColumns: () => [] },
      },
    });
    bean.copyToClipboard();
    bean.copySelectedRowsToClipboard();
    expect(sent).toHaveBeenNthCalledWith(1, '');
    expect(sent).toHaveBeenNthCalledWith(2, '');
    expect(bean.parse('a\tb\r\n1\t2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    bean.pasteData('ignored');
  });
});
