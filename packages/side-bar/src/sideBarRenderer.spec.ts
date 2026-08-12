/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSideBarRenderer, registerSideBarRenderer, renderSideBar } from './sideBarRenderer';

let unregister: (() => void) | undefined;

afterEach(() => {
  unregister?.();
  unregister = undefined;
});

describe('side-bar renderer registration', () => {
  it('is opt-in and restores the previous renderer when unregistered', () => {
    expect(getSideBarRenderer()).toBeUndefined();

    const renderer = { refresh: () => {} };
    unregister = registerSideBarRenderer(renderer);
    expect(getSideBarRenderer()).toBe(renderer);

    unregister();
    unregister = undefined;
    expect(getSideBarRenderer()).toBeUndefined();
  });

  it('replays the latest request to a newly registered renderer and notifies components', () => {
    const request = {
      host: document.createElement('div'),
      panelDefs: [],
      openedPanelId: null,
      position: 'right' as const,
      displayed: true,
      togglePanel: vi.fn(),
    };
    const renderer = { refresh: vi.fn() };
    const changed = vi.fn();
    document.addEventListener('lgr-side-bar-renderer-changed', changed);

    renderSideBar(request);
    unregister = registerSideBarRenderer(renderer);

    expect(renderer.refresh).toHaveBeenCalledWith(request);
    expect(changed).toHaveBeenCalledOnce();
    document.removeEventListener('lgr-side-bar-renderer-changed', changed);
  });

  it('does not uninstall a renderer that replaced it', () => {
    const first = { refresh: vi.fn() };
    const second = { refresh: vi.fn() };
    const unregisterFirst = registerSideBarRenderer(first);
    unregister = registerSideBarRenderer(second);

    unregisterFirst();
    expect(getSideBarRenderer()).toBe(second);
  });
});
