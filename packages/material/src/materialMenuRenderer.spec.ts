/** @vitest-environment jsdom */
import { ApplicationRef, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMaterialMenuRenderer } from './materialMenuRenderer';

describe('Material menu renderer', () => {
  afterEach(() => {
    document.body.querySelectorAll('.lgr-sub-menu').forEach((el) => el.remove());
  });

  it('delegates to the shared Quartz renderer: actions, keyboard nav, nested submenus, destroy', async () => {
    const renderer = createMaterialMenuRenderer(
      TestBed.inject(ApplicationRef),
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
    const rows = result.element.querySelectorAll<HTMLElement>('.lgr-menu-item');
    expect(rows).toHaveLength(4);
    expect(rows[1]?.getAttribute('aria-disabled')).toBe('true');

    // Keyboard navigation skips disabled rows.
    rows[0]?.focus();
    rows[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(rows[2]);

    // Item activation + close.
    rows[0]?.click();
    expect(action).toHaveBeenCalledTimes(1);
    expect(onItemSelected).toHaveBeenCalledTimes(1);

    // suppressCloseOnSelect keeps the menu open.
    rows[2]?.click();
    expect(action).toHaveBeenCalledTimes(2);
    expect(onItemSelected).toHaveBeenCalledTimes(1);

    // Escape closes.
    rows[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onItemSelected).toHaveBeenCalledTimes(2);

    // Submenus render inside the menu element with Quartz styling.
    rows[3]?.click();
    const submenu = result.element.querySelector<HTMLElement>('.lgr-sub-menu');
    expect(submenu).not.toBeNull();
    expect(submenu?.classList.contains('lgr-menu')).toBe(true);
    expect(rows[3]?.getAttribute('aria-expanded')).toBe('true');
    const child = submenu?.querySelector<HTMLElement>('.lgr-menu-item');
    expect(child?.textContent).toBe('Child');
    child?.click();
    expect(action).toHaveBeenCalledTimes(3);
    expect(onItemSelected).toHaveBeenCalledTimes(3);

    // Destroy removes nested submenus.
    result.destroy?.();
    expect(result.element.querySelector('.lgr-sub-menu')).toBeNull();
    result.element.remove();
  });
});
