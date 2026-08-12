import { ApplicationRef, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { createMaterialMenuRenderer } from './materialMenuRenderer';

describe('Material menu renderer', () => {
  it('renders actions, keyboard navigation, submenus, and destroys its attached view', async () => {
    const applicationRef = TestBed.inject(ApplicationRef);
    const detachView = vi.spyOn(applicationRef, 'detachView');
    const renderer = createMaterialMenuRenderer(
      applicationRef,
      TestBed.inject(EnvironmentInjector),
    );
    const action = vi.fn();
    const onItemSelected = vi.fn();
    const result = renderer.render({
      kind: 'context',
      items: [
        { name: 'First', action },
        { name: 'Disabled', disabled: true },
        { name: 'Second', action, suppressCloseOnSelect: true },
        { name: 'Parent', subMenu: [{ name: 'Child', action }, 'unavailable'] },
      ],
      params: {} as never,
      onItemSelected,
      fallback: () => document.createElement('div'),
    });
    document.body.appendChild(result.element);
    const items = result.element.querySelectorAll<HTMLButtonElement>('.lgr-menu-item');
    items[0]?.focus();
    items[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    items[0]?.click();
    items[2]?.click();
    items[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    items[3]?.click();
    applicationRef.tick();
    const child = result.element.querySelector<HTMLButtonElement>('.lgr-sub-menu .lgr-menu-item');
    expect(child).toBeDefined();
    child?.click();

    expect(action).toHaveBeenCalledTimes(3);
    expect(onItemSelected).toHaveBeenCalledTimes(3);
    items[3]?.click();
    applicationRef.tick();
    expect(result.element.querySelector('.lgr-sub-menu')).toBeNull();
    result.destroy?.();
    expect(detachView).toHaveBeenCalledOnce();
    result.element.remove();
  });
});
