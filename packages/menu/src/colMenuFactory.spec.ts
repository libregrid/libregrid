/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { ColumnMenuFactory } from './colMenuFactory';
import type { MenuItemMapper } from './menuItemMapper';

interface PopupOptions {
  eChild: HTMLElement;
  afterGuiAttached(): void;
  closedCallback(event?: Event): void;
  positionCallback(): void;
}

function createColumn(
  suppressHeaderMenuButton = false,
  columnMenuItems?: unknown,
  overrides: { suppressHeaderFilterButton?: boolean; suppressHeaderContextMenu?: boolean } = {},
) {
  return {
    getColDef: () => ({ suppressHeaderMenuButton, columnMenuItems, ...overrides }),
    getColId: () => 'athlete',
  };
}

describe('ColumnMenuFactory', () => {
  it('uses the modern callback before legacy and column-level menu definitions', () => {
    const mapMixed = vi.fn(() => ['separator', { name: 'Custom item' }]);
    const { bean } = makeBeanHarness(ColumnMenuFactory, {
      gridOptions: {
        getColumnMenuItems: () => ['custom'],
        getMainMenuItems: () => ['legacy'],
      },
      beans: { gridApi: {}, menuItemMapper: { mapMixed } as unknown as MenuItemMapper },
    });
    const column = createColumn(false, ['column']) as never;

    expect(bean.buildColumnMenuItems(column, 'columnChooser')).toEqual([
      { name: '__separator__' },
      { name: 'Custom item' },
    ]);
    expect(mapMixed).toHaveBeenCalledWith(['custom'], expect.objectContaining({ column }));
    expect(bean.isMenuEnabled(createColumn(false) as never)).toBe(true);
    expect(bean.isMenuEnabled(createColumn(true) as never)).toBe(false);
  });

  it('falls back to column definitions and then defaults when callbacks do not return arrays', () => {
    const mapMixed = vi.fn(() => [{ name: 'Column item' }, 'separator']);
    const mapItems = vi.fn(() => [{ name: 'Default item' }, 'separator']);
    const column = createColumn(false, ['column']) as never;
    const { bean, gos } = makeBeanHarness(ColumnMenuFactory, {
      gridOptions: { getColumnMenuItems: () => null },
      beans: { gridApi: {}, menuItemMapper: { mapMixed, mapItems } as unknown as MenuItemMapper },
    });

    expect(bean.buildColumnMenuItems(column)).toEqual([
      { name: 'Column item' },
      { name: '__separator__' },
    ]);
    gos.set('getColumnMenuItems', undefined);
    expect(bean.buildColumnMenuItems(null)).toEqual([
      { name: 'Default item' },
      { name: '__separator__' },
    ]);
    expect(mapItems).toHaveBeenCalledOnce();
  });

  it('renders, positions, and closes a button-triggered menu', () => {
    const action = vi.fn();
    const hideFunc = vi.fn();
    const addPopup = vi.fn((popup: PopupOptions) => {
      document.body.appendChild(popup.eChild);
      return { hideFunc };
    });
    const positionPopupByComponent = vi.fn();
    const dispatchEvent = vi.fn();
    const mapItems = vi.fn(() => [{ name: 'Run', action }, { name: 'Disabled', disabled: true }]);
    const { bean } = makeBeanHarness(ColumnMenuFactory, {
      beans: {
        gridApi: {},
        menuItemMapper: { mapItems } as unknown as MenuItemMapper,
        popupSvc: { addPopup, positionPopupByComponent },
        eventSvc: { dispatchEvent },
      },
    });
    const column = createColumn() as never;
    const button = document.createElement('button');
    const onClosed = vi.fn();

    expect(bean.showMenuAfterButtonClick(column, button, 'columnMenu', onClosed)).toBe(true);
    const popup = addPopup.mock.calls[0]?.[0] as PopupOptions;
    popup.afterGuiAttached();
    expect(document.activeElement).toBe(popup.eChild.querySelector('.lgr-menu-item'));
    popup.positionCallback();
    expect(positionPopupByComponent).toHaveBeenCalledWith(expect.objectContaining({ eventSource: button, ePopup: popup.eChild }));

    popup.eChild.querySelector<HTMLElement>('.lgr-menu-item')?.click();
    expect(action).toHaveBeenCalledOnce();
    expect(hideFunc).toHaveBeenCalledOnce();
    popup.closedCallback();
    expect(onClosed).toHaveBeenCalledOnce();
    expect(dispatchEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({ visible: true, column }));
    expect(dispatchEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({ visible: false, column }));
  });

  it('rejects non-columns and positions mouse-triggered menus under the source event', () => {
    const addPopup = vi.fn((popup: PopupOptions) => {
      document.body.appendChild(popup.eChild);
      return { hideFunc: vi.fn() };
    });
    const positionPopupUnderMouseEvent = vi.fn();
    const { bean } = makeBeanHarness(ColumnMenuFactory, {
      beans: {
        gridApi: {},
        menuItemMapper: { mapItems: vi.fn(() => [{ name: 'Item' }]) } as unknown as MenuItemMapper,
        popupSvc: { addPopup, positionPopupUnderMouseEvent },
      },
    });
    const event = new MouseEvent('contextmenu');

    expect(bean.showMenuAfterButtonClick({}, document.createElement('button'), 'columnMenu')).toBe(false);
    bean.showMenuAfterMouseEvent(createColumn() as never, event, 'columnMenu');
    const popup = addPopup.mock.calls[0]?.[0] as PopupOptions;
    popup.positionCallback();
    expect(positionPopupUnderMouseEvent).toHaveBeenCalledWith(expect.objectContaining({ mouseEvent: event }));
  });

  it('honours header menu, filter-button, and context-menu suppression', () => {
    const addPopup = vi.fn(() => ({ hideFunc: vi.fn() }));
    const { bean } = makeBeanHarness(ColumnMenuFactory, {
      beans: { gridApi: {}, menuItemMapper: { mapItems: vi.fn(() => [{ name: 'Item' }]) } as unknown as MenuItemMapper, popupSvc: { addPopup } },
    });
    const source = document.createElement('button');
    expect(bean.showMenuAfterButtonClick(createColumn(true) as never, source, 'columnMenu')).toBe(false);
    expect(bean.showMenuAfterButtonClick(createColumn(false, undefined, { suppressHeaderFilterButton: true }) as never, source, 'columnMenu', undefined, { filtersOnly: true })).toBe(false);
    bean.showMenuAfterContextMenuEvent(createColumn(false, undefined, { suppressHeaderContextMenu: true }) as never, new MouseEvent('contextmenu'));
    expect(addPopup).not.toHaveBeenCalled();
  });

  it('suppresses the native browser menu when the header context menu opens', () => {
    const addPopup = vi.fn(() => ({ hideFunc: vi.fn() }));
    const { bean } = makeBeanHarness(ColumnMenuFactory, {
      beans: { gridApi: {}, menuItemMapper: { mapItems: vi.fn(() => [{ name: 'Item' }]) } as unknown as MenuItemMapper, popupSvc: { addPopup } },
    });

    const event = new MouseEvent('contextmenu', { cancelable: true, bubbles: true });
    const spy = vi.spyOn(event, 'preventDefault');
    bean.showMenuAfterContextMenuEvent(createColumn() as never, event);
    expect(spy).toHaveBeenCalledOnce();
    expect(addPopup).toHaveBeenCalledOnce();

    // A suppressed header keeps the browser default menu available.
    const suppressed = new MouseEvent('contextmenu', { cancelable: true, bubbles: true });
    const suppressedSpy = vi.spyOn(suppressed, 'preventDefault');
    bean.showMenuAfterContextMenuEvent(createColumn(false, undefined, { suppressHeaderContextMenu: true }) as never, suppressed);
    expect(suppressedSpy).not.toHaveBeenCalled();
  });
});
