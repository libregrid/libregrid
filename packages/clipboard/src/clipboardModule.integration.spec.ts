/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { ContextMenuModule, MenuItemRegistry, type MenuActionParams } from '@libregrid/menu';
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

describe('context menu contributions (Phase 14 P0-6)', () => {
  function resolve(name: string, api: Record<string, unknown>) {
    ModuleRegistry.registerModules([AllCommunityModule, ContextMenuModule, ClipboardModule]);
    const registry = new MenuItemRegistry();
    return registry.getItem(name, { column: null, node: null, value: null, api } as MenuActionParams);
  }

  it('replace the Phase-1 null stubs with real factories', () => {
    const api = {
      copySelectedRangeToClipboard: vi.fn(),
      cutToClipboard: vi.fn(),
      pasteFromClipboard: vi.fn(),
    };
    expect(resolve('copy', api)?.name).toBe('Copy');
    expect(resolve('copyWithHeaders', api)?.name).toBe('Copy with headers');
    expect(resolve('copyWithGroupHeaders', api)?.name).toBe('Copy with group headers');
    expect(resolve('cut', api)?.name).toBe('Cut');
    expect(resolve('paste', api)?.name).toBe('Paste');
  });

  it('copy / copyWithHeaders / copyWithGroupHeaders invoke the range-copy API with the right params', () => {
    const api = { copySelectedRangeToClipboard: vi.fn() };
    resolve('copy', api)!.action!({} as never);
    expect(api.copySelectedRangeToClipboard).toHaveBeenCalledTimes(1);
    resolve('copyWithHeaders', api)!.action!({} as never);
    expect(api.copySelectedRangeToClipboard).toHaveBeenLastCalledWith({ includeHeaders: true });
    resolve('copyWithGroupHeaders', api)!.action!({} as never);
    expect(api.copySelectedRangeToClipboard).toHaveBeenLastCalledWith({ includeHeaders: true, includeGroupHeaders: true });
  });

  it('cut and paste invoke the clipboard API', () => {
    const api = { cutToClipboard: vi.fn(), pasteFromClipboard: vi.fn() };
    resolve('cut', api)!.action!({} as never);
    expect(api.cutToClipboard).toHaveBeenCalledTimes(1);
    resolve('paste', api)!.action!({} as never);
    expect(api.pasteFromClipboard).toHaveBeenCalledTimes(1);
  });
});
