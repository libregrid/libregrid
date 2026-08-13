/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attachColumnsToolPanelDragDrop,
  detachColumnsToolPanelDragDrop,
  registerColumnsToolPanelDragDropAdapter,
} from './columnsToolPanelDragDropAdapter';

let unregister: (() => void) | undefined;

afterEach(() => {
  unregister?.();
  unregister = undefined;
});

describe('columns tool panel drag-drop adapter registration', () => {
  it('attaches, cleans up before reattaching, and detaches a root', () => {
    const root = document.createElement('div');
    const firstCleanup = vi.fn();
    const secondCleanup = vi.fn();
    const attach = vi.fn()
      .mockReturnValueOnce(firstCleanup)
      .mockReturnValueOnce(secondCleanup);
    unregister = registerColumnsToolPanelDragDropAdapter({ attach });

    attachColumnsToolPanelDragDrop(root);
    attachColumnsToolPanelDragDrop(root);
    detachColumnsToolPanelDragDrop(root);

    expect(attach).toHaveBeenCalledTimes(2);
    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(secondCleanup).toHaveBeenCalledOnce();
  });

  it('restores the previous adapter when uninstalled without replacing a newer adapter', () => {
    const root = document.createElement('div');
    const firstCleanup = vi.fn();
    const secondCleanup = vi.fn();
    const first = { attach: vi.fn(() => firstCleanup) };
    const second = { attach: vi.fn(() => secondCleanup) };
    const uninstallFirst = registerColumnsToolPanelDragDropAdapter(first);
    const uninstallSecond = registerColumnsToolPanelDragDropAdapter(second);

    uninstallFirst();
    attachColumnsToolPanelDragDrop(root);
    expect(second.attach).toHaveBeenCalledOnce();

    uninstallSecond();
    attachColumnsToolPanelDragDrop(root);
    expect(first.attach).toHaveBeenCalledOnce();
    expect(secondCleanup).toHaveBeenCalledOnce();

    uninstallFirst();
    attachColumnsToolPanelDragDrop(root);
    expect(firstCleanup).toHaveBeenCalledOnce();
  });
});
