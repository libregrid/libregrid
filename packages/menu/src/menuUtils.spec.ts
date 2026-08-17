/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { withViewportPopupParent } from './menuUtils';

describe('withViewportPopupParent', () => {
  it('defaults the popup parent to the document body for the duration of open, then restores it', () => {
    const setGridOption = vi.fn();
    const api = {
      getGridOption: vi.fn(() => null),
      setGridOption,
    };
    const open = vi.fn();

    withViewportPopupParent(api, open);

    expect(open).toHaveBeenCalledOnce();
    expect(setGridOption).toHaveBeenNthCalledWith(1, 'popupParent', document.body);
    expect(setGridOption).toHaveBeenNthCalledWith(2, 'popupParent', null);
  });

  it('honours an app-configured popupParent without touching it', () => {
    const parent = document.createElement('div');
    const setGridOption = vi.fn();
    const api = { getGridOption: vi.fn(() => parent), setGridOption };
    const open = vi.fn();

    withViewportPopupParent(api, open);

    expect(open).toHaveBeenCalledOnce();
    expect(setGridOption).not.toHaveBeenCalled();
  });

  it('restores the default parent even when open throws', () => {
    const setGridOption = vi.fn();
    const api = { getGridOption: vi.fn(() => null), setGridOption };

    expect(() =>
      withViewportPopupParent(api, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(setGridOption).toHaveBeenLastCalledWith('popupParent', null);
  });

  it('falls back to a plain open when the api is absent or lacks the option methods', () => {
    const open = vi.fn();

    withViewportPopupParent(undefined, open);
    withViewportPopupParent({}, open);
    withViewportPopupParent({ getGridOption: () => null } as never, open);

    expect(open).toHaveBeenCalledTimes(3);
  });
});
