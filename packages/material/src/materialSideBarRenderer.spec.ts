/** @vitest-environment jsdom */
import { ApplicationRef, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerSideBarRenderer, type SideBarRenderRequest } from '@libregrid/side-bar';
import {
  createMaterialSideBarRenderer,
  installMaterialSideBarRenderer,
} from './materialSideBarRenderer';

let cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.reverse()) cleanup();
  cleanups = [];
  document.body.replaceChildren();
});

function request(
  host: HTMLElement,
  openedPanelId: string | null = null,
  togglePanel = vi.fn(),
): SideBarRenderRequest {
  return {
    host,
    panelDefs: [
      { id: 'columns', iconKey: 'columns', labelKey: 'columns', labelDefault: 'Columns' },
    ],
    openedPanelId,
    position: 'right',
    displayed: true,
    togglePanel,
  };
}

describe('Material side-bar renderer', () => {
  it('renders Material buttons into the framework-neutral host and delegates toggles', () => {
    const host = document.createElement('div');
    const togglePanel = vi.fn();
    const renderer = createMaterialSideBarRenderer(
      TestBed.inject(ApplicationRef),
      TestBed.inject(EnvironmentInjector),
    );

    renderer.refresh(request(host, null, togglePanel));
    host.querySelector<HTMLButtonElement>('button')?.click();

    expect(host.textContent).toContain('Columns');
    expect(togglePanel).toHaveBeenCalledWith('columns');
  });

  it('reattaches its portal when native refreshes clear the same host', () => {
    const host = document.createElement('div');
    const renderer = createMaterialSideBarRenderer(
      TestBed.inject(ApplicationRef),
      TestBed.inject(EnvironmentInjector),
    );

    renderer.refresh(request(host));
    expect(host.querySelectorAll('lgr-material-side-bar-buttons')).toHaveLength(1);

    // SideBarComponent.renderButtons() rebuilds this host before asking the
    // optional renderer to refresh. The renderer must detect that Angular's
    // component is no longer connected even though its ComponentRef exists.
    host.replaceChildren();
    renderer.refresh(request(host, 'columns'));
    expect(host.querySelectorAll('lgr-material-side-bar-buttons')).toHaveLength(1);
    expect(host.querySelector('button')?.getAttribute('aria-expanded')).toBe('true');

    host.replaceChildren();
    renderer.refresh(request(host));
    expect(host.querySelectorAll('lgr-material-side-bar-buttons')).toHaveLength(1);
    expect(host.querySelector('button')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('matches the native tab and tabpanel relationship attributes', () => {
    const host = document.createElement('div');
    const renderer = createMaterialSideBarRenderer(
      TestBed.inject(ApplicationRef),
      TestBed.inject(EnvironmentInjector),
    );

    renderer.refresh(request(host, 'columns'));

    const button = host.querySelector('button');
    expect(host.getAttribute('role')).toBe('tablist');
    expect(button?.getAttribute('role')).toBe('tab');
    expect(button?.id).toBe('lgr-side-bar-columns-button');
    expect(button?.getAttribute('aria-controls')).toBe('lgr-side-bar-columns-panel');
    expect(button?.getAttribute('aria-expanded')).toBe('true');
  });

  it('does not replace a renderer the application installed explicitly', () => {
    const customRenderer = { refresh: vi.fn() };
    cleanups.push(registerSideBarRenderer(customRenderer));
    const rendererChanged = vi.fn();
    document.addEventListener('lgr-side-bar-renderer-changed', rendererChanged);

    cleanups.push(
      installMaterialSideBarRenderer(
        TestBed.inject(ApplicationRef),
        TestBed.inject(EnvironmentInjector),
      ),
    );

    expect(rendererChanged).not.toHaveBeenCalled();
    document.removeEventListener('lgr-side-bar-renderer-changed', rendererChanged);
  });
});
