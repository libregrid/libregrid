/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { ContextMenuService } from './contextMenuSvc';
import type { MenuItemMapper } from './menuItemMapper';

interface PopupOptions {
  eChild: HTMLElement;
  afterGuiAttached(): void;
  closedCallback(): void;
  positionCallback(): void;
}

function setupContextMenu(options: {
  gridOptions?: Record<string, unknown>;
  mappedItems?: unknown[];
} = {}) {
  const hideFunc = vi.fn();
  const addPopup = vi.fn((popup: PopupOptions) => {
    document.body.appendChild(popup.eChild);
    return { hideFunc };
  });
  const positionPopupUnderMouseEvent = vi.fn();
  const mapItems = vi.fn(() => options.mappedItems ?? []);
  const mapMixed = vi.fn(() => options.mappedItems ?? []);
  const mapper = { mapItems, mapMixed } as unknown as MenuItemMapper;
  const { bean, gos } = makeBeanHarness(ContextMenuService, {
    gridOptions: options.gridOptions,
    beans: {
      gridApi: {},
      menuItemMapper: mapper,
      popupSvc: { addPopup, positionPopupUnderMouseEvent },
    },
  });

  return { bean, gos, addPopup, hideFunc, mapItems, mapMixed, positionPopupUnderMouseEvent };
}

describe('ContextMenuService', () => {
  it('does not handle suppressed or control-click context-menu events', () => {
    const suppressed = setupContextMenu({ gridOptions: { suppressContextMenu: true } });
    const suppressedEvent = new MouseEvent('contextmenu');
    const suppressPreventDefault = vi.spyOn(suppressedEvent, 'preventDefault');

    suppressed.bean.handleContextMenuMouseEvent(suppressedEvent, undefined, null, null);
    expect(suppressPreventDefault).not.toHaveBeenCalled();
    expect(suppressed.addPopup).not.toHaveBeenCalled();

    const control = setupContextMenu({ mappedItems: [{ name: 'Item' }] });
    const controlEvent = new MouseEvent('contextmenu', { ctrlKey: true });
    const controlPreventDefault = vi.spyOn(controlEvent, 'preventDefault');
    control.bean.handleContextMenuMouseEvent(controlEvent, undefined, null, null);

    expect(controlPreventDefault).toHaveBeenCalledOnce();
    expect(control.addPopup).not.toHaveBeenCalled();
  });

  it('maps callback items, removes redundant separators, and positions the popup at the mouse', () => {
    const action = vi.fn();
    const { bean, addPopup, mapMixed, positionPopupUnderMouseEvent } = setupContextMenu({
      gridOptions: { getContextMenuItems: () => ['custom'] },
      mappedItems: ['separator', { name: 'First', action }, 'separator', 'separator', { name: 'Second' }, 'separator'],
    });

    bean.showContextMenu({
      column: null,
      rowNode: null,
      value: 'cell value',
      source: 'api',
      mouseEvent: new MouseEvent('contextmenu', { clientX: 12, clientY: 34 }),
    });

    expect(mapMixed).toHaveBeenCalledWith(['custom'], {
      column: null,
      node: null,
      value: 'cell value',
      api: {},
    });
    const popup = addPopup.mock.calls[0]?.[0] as PopupOptions;
    expect(popup.eChild.querySelectorAll('.lgr-menu-separator')).toHaveLength(1);
    expect(popup.eChild.textContent).toBe('FirstSecond');

    popup.positionCallback();
    expect(positionPopupUnderMouseEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'contextMenu',
      ePopup: popup.eChild,
    }));
    const mouseEvent = positionPopupUnderMouseEvent.mock.calls[0]?.[0].mouseEvent as MouseEvent;
    expect([mouseEvent.clientX, mouseEvent.clientY]).toEqual([12, 34]);

    popup.afterGuiAttached();
    popup.eChild.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(action).toHaveBeenCalledOnce();
  });

  it('uses the grid centre for API menus without a mouse event and restores focus when closed', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const focus = vi.spyOn(trigger, 'focus');
    const gridBody = document.createElement('div');
    vi.spyOn(gridBody, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      width: 100,
      height: 40,
    } as DOMRect);
    const hideFunc = vi.fn();
    const addPopup = vi.fn((popup: PopupOptions) => {
      document.body.appendChild(popup.eChild);
      return { hideFunc };
    });
    const { bean } = makeBeanHarness(ContextMenuService, {
      beans: {
        gridApi: { gridBodyCtrl: { eGridBody: gridBody } },
        menuItemMapper: { mapItems: vi.fn(() => [{ name: 'Item' }]) },
        popupSvc: { addPopup, positionPopupUnderMouseEvent: vi.fn() },
      },
    });

    bean.showContextMenu({ column: null, rowNode: null, value: null, source: 'api', anchorToElement: trigger });
    const popup = addPopup.mock.calls[0]?.[0] as PopupOptions;
    popup.closedCallback();

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(bean.getContextMenuPosition()).toEqual({ x: 60, y: 40 });
    trigger.remove();
  });

  it('opens the popup with the popup parent defaulted to the document body', () => {
    const calls: string[] = [];
    const setGridOption = vi.fn((key: string, value: unknown) => {
      calls.push(`set:${key}:${value === document.body ? 'body' : String(value)}`);
    });
    const addPopup = vi.fn((popup: PopupOptions) => {
      calls.push('addPopup');
      document.body.appendChild(popup.eChild);
      return { hideFunc: vi.fn() };
    });
    const { bean } = makeBeanHarness(ContextMenuService, {
      beans: {
        gridApi: { getGridOption: () => null, setGridOption },
        menuItemMapper: { mapItems: vi.fn(() => [{ name: 'Item' }]) },
        popupSvc: { addPopup, positionPopupUnderMouseEvent: vi.fn() },
      },
    });

    bean.showContextMenu({
      column: null,
      rowNode: null,
      value: null,
      source: 'api',
      mouseEvent: new MouseEvent('contextmenu', { clientX: 5, clientY: 6 }),
    });

    // body parent is set just around addPopup and restored straight after,
    // so other popups keep the grid default.
    expect(calls).toEqual(['set:popupParent:body', 'addPopup', 'set:popupParent:null']);
  });

  it('honours an app-configured popupParent', () => {
    const parent = document.createElement('div');
    const setGridOption = vi.fn();
    const addPopup = vi.fn((popup: PopupOptions) => {
      document.body.appendChild(popup.eChild);
      return { hideFunc: vi.fn() };
    });
    const { bean } = makeBeanHarness(ContextMenuService, {
      beans: {
        gridApi: { getGridOption: () => parent, setGridOption },
        menuItemMapper: { mapItems: vi.fn(() => [{ name: 'Item' }]) },
        popupSvc: { addPopup, positionPopupUnderMouseEvent: vi.fn() },
      },
    });

    bean.showContextMenu({
      column: null,
      rowNode: null,
      value: null,
      source: 'api',
      mouseEvent: new MouseEvent('contextmenu', { clientX: 5, clientY: 6 }),
    });

    expect(addPopup).toHaveBeenCalledOnce();
    expect(setGridOption).not.toHaveBeenCalled();
  });
});
