import { ApplicationRef, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import type { SideBarRenderRequest } from '@libregrid/side-bar';
import { createMaterialSideBarRenderer } from './materialSideBarRenderer';

describe('Material side-bar renderer', () => {
  it('renders Material buttons into the framework-neutral host and delegates toggles', () => {
    const host = document.createElement('div');
    const togglePanel = vi.fn();
    const renderer = createMaterialSideBarRenderer(
      TestBed.inject(ApplicationRef),
      TestBed.inject(EnvironmentInjector),
    );

    const request: SideBarRenderRequest = {
      host,
      panelDefs: [{ id: 'columns', iconKey: 'columns', labelKey: 'columns', labelDefault: 'Columns' }],
      openedPanelId: null,
      position: 'right',
      displayed: true,
      togglePanel,
    };
    renderer.refresh(request);
    host.querySelector<HTMLButtonElement>('button')?.click();

    expect(host.textContent).toContain('Columns');
    expect(togglePanel).toHaveBeenCalledWith('columns');
  });
});
