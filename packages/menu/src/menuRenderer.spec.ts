/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { getMenuRenderer, registerMenuRenderer } from './menuRenderer';

let unregister: (() => void) | undefined;

afterEach(() => {
  unregister?.();
  unregister = undefined;
});

describe('menu renderer registration', () => {
  it('is opt-in and restores the previous renderer when unregistered', () => {
    expect(getMenuRenderer()).toBeUndefined();

    const renderer = { render: () => ({ element: document.createElement('div') }) };
    unregister = registerMenuRenderer(renderer);
    expect(getMenuRenderer()).toBe(renderer);

    unregister();
    unregister = undefined;
    expect(getMenuRenderer()).toBeUndefined();
  });
});
