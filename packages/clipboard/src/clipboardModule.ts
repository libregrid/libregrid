import type { _ClipboardGridApi, BeanCollection, _ModuleWithApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { registerMenuItems } from '@libregrid/menu';
import { VERSION } from './version';
import { GridClipboardService } from './gridClipboardService';

function clipboard(beans: BeanCollection) {
  return beans.clipboardSvc as GridClipboardService | undefined;
}
function copyToClipboard(
  beans: BeanCollection,
  params?: Parameters<GridClipboardService['copyToClipboard']>[0],
) {
  clipboard(beans)?.copyToClipboard(params);
}
function cutToClipboard(
  beans: BeanCollection,
  params?: Parameters<GridClipboardService['cutToClipboard']>[0],
) {
  clipboard(beans)?.cutToClipboard(params);
}
function copySelectedRowsToClipboard(
  beans: BeanCollection,
  params?: Parameters<GridClipboardService['copySelectedRowsToClipboard']>[0],
) {
  clipboard(beans)?.copySelectedRowsToClipboard(params);
}
function copySelectedRangeToClipboard(
  beans: BeanCollection,
  params?: Parameters<GridClipboardService['copySelectedRangeToClipboard']>[0],
) {
  clipboard(beans)?.copySelectedRangeToClipboard(params);
}
function pasteFromClipboard(beans: BeanCollection) {
  clipboard(beans)?.pasteFromClipboard();
}
function copyRangeDown(beans: BeanCollection) {
  clipboard(beans)?.copyRangeDown();
}

/** Registers Clipboard menu contributions and the feature boundary. @feature Clipboard */
export const ClipboardModule: _ModuleWithApi<_ClipboardGridApi> = {
  moduleName: 'Clipboard',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  beans: [GridClipboardService],
  apiFunctions: {
    copyToClipboard,
    cutToClipboard,
    copySelectedRowsToClipboard,
    copySelectedRangeToClipboard,
    pasteFromClipboard,
    copySelectedRangeDown: copyRangeDown,
  },
  onRegister: () =>
    registerMenuItems([
      {
        name: 'copy',
        order: 0,
        factory: (params) => ({
          name: 'Copy',
          icon: 'clipboardCopy',
          action: () =>
            (
              params.api as unknown as { copySelectedRangeToClipboard?: () => void }
            ).copySelectedRangeToClipboard?.(),
        }),
      },
      {
        name: 'copyWithHeaders',
        order: 1,
        factory: (params) => ({
          name: 'Copy with headers',
          icon: 'clipboardCopy',
          action: () =>
            (
              params.api as unknown as {
                copySelectedRangeToClipboard?: (params: { includeHeaders: boolean }) => void;
              }
            ).copySelectedRangeToClipboard?.({ includeHeaders: true }),
        }),
      },
      {
        name: 'copyWithGroupHeaders',
        order: 2,
        factory: (params) => ({
          name: 'Copy with group headers',
          icon: 'clipboardCopy',
          action: () =>
            (
              params.api as unknown as {
                copySelectedRangeToClipboard?: (params: {
                  includeHeaders: boolean;
                  includeGroupHeaders: boolean;
                }) => void;
              }
            ).copySelectedRangeToClipboard?.({ includeHeaders: true, includeGroupHeaders: true }),
        }),
      },
      {
        name: 'cut',
        order: 3,
        factory: (params) => ({
          name: 'Cut',
          icon: 'clipboardCut',
          action: () =>
            (params.api as unknown as { cutToClipboard?: () => void }).cutToClipboard?.(),
        }),
      },
      {
        name: 'paste',
        order: 4,
        factory: (params) => ({
          name: 'Paste',
          icon: 'clipboardPaste',
          action: () =>
            (params.api as unknown as { pasteFromClipboard?: () => void }).pasteFromClipboard?.(),
        }),
      },
    ]),
};
