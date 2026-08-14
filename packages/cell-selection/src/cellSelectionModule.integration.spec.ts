/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { CellSelectionModule } from './cellSelectionModule';
let api: GridApi | undefined;
afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});
describe('CellSelectionModule', () =>
  it('adds, returns, and clears a range through GridApi', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, CellSelectionModule]);
    const host = document.createElement('div');
    document.body.appendChild(host);
    api = createGrid(host, {
      columnDefs: [{ field: 'a' }, { field: 'b' }],
      rowData: [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ],
    });
    api.addCellRange({ rowStartIndex: 0, rowEndIndex: 1, columnStart: 'a', columnEnd: 'b' });
    await vi.waitFor(() => expect(api?.getCellRanges()).toHaveLength(1));
    expect(api.getCellRanges()?.[0]?.columns.map((column) => column.getColId())).toEqual([
      'a',
      'b',
    ]);
    api.clearCellSelection();
    expect(api.getCellRanges()).toEqual([]);
  }));
