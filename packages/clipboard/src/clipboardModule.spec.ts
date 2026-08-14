import { describe, expect, it, vi } from 'vitest';
import { MenuItemRegistry } from '@libregrid/menu';
import { ClipboardModule } from './clipboardModule';

describe('ClipboardModule public wiring', () => {
  it('forwards every public API and contributes all menu actions', () => {
    const calls = {
      copy: vi.fn(),
      cut: vi.fn(),
      rows: vi.fn(),
      range: vi.fn(),
      paste: vi.fn(),
      down: vi.fn(),
    };
    const beans = {
      clipboardSvc: {
        copyToClipboard: calls.copy,
        cutToClipboard: calls.cut,
        copySelectedRowsToClipboard: calls.rows,
        copySelectedRangeToClipboard: calls.range,
        pasteFromClipboard: calls.paste,
        copyRangeDown: calls.down,
      },
    };
    const apiFunctions = ClipboardModule.apiFunctions as unknown as Record<
      string,
      (beans: unknown, params?: unknown) => void
    >;
    apiFunctions.copyToClipboard(beans, { includeHeaders: true });
    apiFunctions.cutToClipboard(beans);
    apiFunctions.copySelectedRowsToClipboard(beans, { columnKeys: ['name'] });
    apiFunctions.copySelectedRangeToClipboard(beans);
    apiFunctions.pasteFromClipboard(beans);
    apiFunctions.copySelectedRangeDown(beans);
    expect(calls.copy).toHaveBeenCalledWith({ includeHeaders: true });
    expect(calls.cut).toHaveBeenCalledOnce();
    expect(calls.rows).toHaveBeenCalledWith({ columnKeys: ['name'] });
    expect(calls.range).toHaveBeenCalledOnce();
    expect(calls.paste).toHaveBeenCalledOnce();
    expect(calls.down).toHaveBeenCalledOnce();

    ClipboardModule.onRegister?.();
    const registry = new MenuItemRegistry();
    const menuApi = {
      copySelectedRangeToClipboard: vi.fn(),
      cutToClipboard: vi.fn(),
      pasteFromClipboard: vi.fn(),
    };
    const params = { api: menuApi, column: null, node: null, value: null } as never;
    expect(registry.getRegisteredNames()).toEqual(
      expect.arrayContaining(['copy', 'copyWithHeaders', 'copyWithGroupHeaders', 'cut', 'paste']),
    );
    registry.getItem('copy', params)?.action?.();
    registry.getItem('copyWithHeaders', params)?.action?.();
    registry.getItem('copyWithGroupHeaders', params)?.action?.();
    registry.getItem('cut', params)?.action?.();
    registry.getItem('paste', params)?.action?.();
    expect(menuApi.copySelectedRangeToClipboard).toHaveBeenNthCalledWith(1);
    expect(menuApi.copySelectedRangeToClipboard).toHaveBeenNthCalledWith(2, {
      includeHeaders: true,
    });
    expect(menuApi.copySelectedRangeToClipboard).toHaveBeenNthCalledWith(3, {
      includeHeaders: true,
      includeGroupHeaders: true,
    });
    expect(menuApi.cutToClipboard).toHaveBeenCalledOnce();
    expect(menuApi.pasteFromClipboard).toHaveBeenCalledOnce();
  });
});
