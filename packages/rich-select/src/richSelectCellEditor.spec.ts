/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi } from 'ag-grid-community';
import { RichSelectCellEditor } from './richSelectCellEditor';
import { RichSelectModule } from './richSelectModule';

afterEach(() => document.body.replaceChildren());
describe('RichSelectCellEditor', () => {
  it('virtualises a large filtered list and supports keyboard selection', () => {
    const editor = new RichSelectCellEditor<unknown, string>(); const stopEditing = vi.fn();
    editor.init({ value: 'Value 0', values: Array.from({ length: 50_000 }, (_, index) => `Value ${index}`), allowTyping: true, filterList: true, searchType: 'matchAny', cellHeight: 20, stopEditing } as never);
    document.body.append(editor.getGui());
    const input = editor.getGui().querySelector<HTMLInputElement>('input')!; input.value = '49999'; input.dispatchEvent(new Event('input'));
    expect(editor.getGui().querySelectorAll('.lgr-rich-select-option')).toHaveLength(1);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(editor.getValue()).toBe('Value 49999'); expect(stopEditing).toHaveBeenCalled();
  });
  it('uses paged values and multi-select without rendering every loaded row', async () => {
    const editor = new RichSelectCellEditor<unknown, number>();
    editor.init({ value: [1, 2], multiSelect: true, valuesPage: async ({ startRow, endRow }) => ({ values: Array.from({ length: endRow - startRow }, (_, index) => startRow + index), lastRow: 10_000 }), valuesPageSize: 100, cellHeight: 20 } as never);
    document.body.append(editor.getGui()); await vi.waitFor(() => expect(editor.getGui().querySelectorAll('.lgr-rich-select-option').length).toBeLessThan(30));
    expect(editor.getValue()).toEqual([1, 2]);
  });
  it('supports formatter/parser, custom rendering, popup lifecycle, navigation, and escape', async () => {
    const stopEditing = vi.fn(); const editor = new RichSelectCellEditor<unknown, string>();
    editor.init({ value: 'A', values: ['A', 'B'], allowTyping: false, formatValue: (value) => `Label ${value}`, parseValue: (value) => `parsed:${value}`, cellRenderer: ({ value }: { value: string }) => { const node = document.createElement('strong'); node.textContent = value; return node; }, stopEditing } as never);
    document.body.append(editor.getGui()); await vi.waitFor(() => expect(editor.getGui().querySelector('strong')?.textContent).toBe('A'));
    expect(editor.isPopup()).toBe(true); expect(editor.getPopupPosition()).toBe('under'); editor.afterGuiAttached();
    const list = editor.getGui().querySelector<HTMLElement>('.lgr-rich-select-list')!;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(stopEditing).toHaveBeenCalledWith(true, expect.any(KeyboardEvent)); expect(editor.getValue()).toBe('parsed:A'); editor.destroy(); expect(editor.getGui().childElementCount).toBe(0);
  });
  it('loads the next paged source when the virtual list reaches its threshold', async () => {
    const editor = new RichSelectCellEditor<unknown, number>(); const pages: number[] = [];
    editor.init({ valuesPage: async ({ startRow, endRow }) => { pages.push(startRow); return { values: Array.from({ length: endRow - startRow }, (_, index) => startRow + index), lastRow: 300 }; }, valuesPageSize: 100, valuesPageLoadThreshold: 1 } as never);
    document.body.append(editor.getGui()); await vi.waitFor(() => expect(pages).toEqual([0]));
    const list = editor.getGui().querySelector<HTMLElement>('.lgr-rich-select-list')!;
    Object.defineProperties(list, { clientHeight: { value: 100 }, scrollHeight: { value: 200, configurable: true } }); list.scrollTop = 150; list.dispatchEvent(new Event('scroll'));
    await vi.waitFor(() => expect(pages).toEqual([0, 100]));
  });
  it('filters using match, match-any, and fuzzy modes and toggles multi-select choices', async () => {
    for (const searchType of ['match', 'matchAny', 'fuzzy'] as const) {
      const editor = new RichSelectCellEditor<unknown, string>(); editor.init({ values: ['alpha', 'beta'], allowTyping: true, filterList: true, searchType, multiSelect: true } as never); document.body.append(editor.getGui());
      const input = editor.getGui().querySelector<HTMLInputElement>('input')!; input.value = searchType === 'match' ? 'al' : searchType === 'matchAny' ? 'et' : 'aa'; input.dispatchEvent(new Event('input'));
      await vi.waitFor(() => expect(editor.getGui().querySelectorAll('.lgr-rich-select-option')).toHaveLength(1));
      editor.getGui().querySelector<HTMLElement>('.lgr-rich-select-option')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      const expected = searchType === 'matchAny' ? 'beta' : 'alpha'; expect(editor.getValue()).toEqual([expected]); editor.getGui().querySelector<HTMLElement>('.lgr-rich-select-option')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); expect(editor.getValue()).toEqual([]); editor.destroy();
    }
  });
  it('commits a selected value through a real grid cell edit', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, RichSelectModule]);
    const host = document.createElement('div'); document.body.append(host);
    let api: GridApi<{ status: string }> | undefined;
    try {
      api = createGrid(host, { columnDefs: [{ field: 'status', editable: true, cellEditor: 'agRichSelectCellEditor', cellEditorParams: { values: ['Draft', 'Published'], allowTyping: true, filterList: true } }], rowData: [{ status: 'Draft' }] });
      api.startEditingCell({ rowIndex: 0, colKey: 'status' });
      await vi.waitFor(() => expect(host.querySelector('.lgr-rich-select')).toBeTruthy());
      const input = host.querySelector<HTMLInputElement>('.lgr-rich-select input')!; input.value = 'Published'; input.dispatchEvent(new Event('input')); input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await vi.waitFor(() => expect(api?.getDisplayedRowAtIndex(0)?.data.status).toBe('Published'));
    } finally { api?.destroy(); }
  });
});
