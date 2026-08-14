/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { ClipboardModule } from './clipboardModule';
let api: GridApi | undefined;
afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});
describe('ClipboardModule', () =>
  it('copies a selected range as TSV through GridApi', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, CellSelectionModule, ClipboardModule]);
    const sent = vi.fn();
    const host = document.createElement('div');
    document.body.appendChild(host);
    api = createGrid(host, {
      columnDefs: [{ field: 'name' }, { field: 'amount' }],
      rowData: [
        { name: 'A', amount: 1 },
        { name: 'B', amount: 2 },
      ],
      sendToClipboard: ({ data }) => sent(data),
    });
    api.addCellRange({
      rowStartIndex: 0,
      rowEndIndex: 1,
      columnStart: 'name',
      columnEnd: 'amount',
    });
    await vi.waitFor(() => expect(api?.getCellRanges()).toHaveLength(1));
    api.copySelectedRangeToClipboard({ includeHeaders: true });
    expect(sent).toHaveBeenCalledWith('name\tamount\r\nA\t1\r\nB\t2');
  }));
