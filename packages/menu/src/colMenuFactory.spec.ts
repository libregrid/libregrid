/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { AgProvidedColumnGroup, type MenuItemDef } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { ColumnMenuFactory } from './colMenuFactory';
import { MenuItemMapper } from './menuItemMapper';

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

  it('hides per-column items in group-header menus and keeps group-targetable items', () => {
    // A real registry (default items registered at module scope) so the item
    // factories actually run, plus the runtime registration the owning
    // package performs for 'editColumnName'.
    const mapper = makeBeanHarness(MenuItemMapper, {}).bean;
    mapper.registry.register({
      name: 'editColumnName',
      factory: (params) => (params.column ? { name: 'Edit Column Name' } : null),
      order: 41,
    });
    const { bean } = makeBeanHarness(ColumnMenuFactory, {
      beans: { gridApi: { isModuleRegistered: () => false }, menuItemMapper: mapper },
    });
    const group = createGroup();

    const names = (target: unknown) =>
      bean
        .buildColumnMenuItems(target as never)
        .filter((item) => item !== 'separator')
        .map((item) => (item as MenuItemDef).name);

    const groupNames = names(group);
    // Single-column operations do not apply to a group:
    expect(groupNames).not.toContain('Sort Ascending');
    expect(groupNames).not.toContain('Sort Descending');
    expect(groupNames).not.toContain('Clear Sort');
    expect(groupNames).not.toContain('Auto-Size This Column');
    expect(groupNames).not.toContain('Choose Columns');
    expect(groupNames).not.toContain('Filter');
    // Grid-level and group-targetable items remain:
    expect(groupNames).toContain('Auto-Size All Columns');
    expect(groupNames).toContain('Reset Columns');
    expect(groupNames).toContain('Edit Column Name');

    // A column target still gets the per-column items.
    const columnNames = names(createColumn(false));
    expect(columnNames).toContain('Sort Ascending');
    expect(columnNames).toContain('Auto-Size This Column');
    expect(columnNames).toContain('Edit Column Name');
  });

  it('opens a group-header context menu with the group as the menu target', () => {
    const mapper = makeBeanHarness(MenuItemMapper, {}).bean;
    mapper.registry.register({
      name: 'editColumnName',
      factory: (params) => (params.column ? { name: 'Edit Column Name' } : null),
      order: 41,
    });
    const addPopup = vi.fn((popup: PopupOptions) => {
      document.body.appendChild(popup.eChild);
      return { hideFunc: vi.fn() };
    });
    const { bean } = makeBeanHarness(ColumnMenuFactory, {
      beans: {
        gridApi: { isModuleRegistered: () => false },
        menuItemMapper: mapper,
        popupSvc: { addPopup, positionPopupUnderMouseEvent: vi.fn() },
      },
    });
    const event = new MouseEvent('contextmenu');
    const group = createGroup();

    bean.showMenuAfterContextMenuEvent(group, event);
    expect(addPopup).toHaveBeenCalledOnce();
    const items = Array.from((addPopup.mock.calls[0]?.[0] as PopupOptions).eChild.querySelectorAll('.lgr-menu-item'));
    const rendered = items.length;
    const texts = items.map((el) => el.textContent);
    expect(rendered).toBeGreaterThan(0);
    expect(texts).toContain('Edit Column Name');
    expect(texts).not.toContain('Sort Ascending');

    // A group def suppressing the header context menu stays closed.
    const suppressed = createGroup({ suppressHeaderContextMenu: true });
    bean.showMenuAfterContextMenuEvent(suppressed, new MouseEvent('contextmenu'));
    expect(addPopup).toHaveBeenCalledTimes(1);
  });
});

/** A real AgProvidedColumnGroup instance — the factory gate uses `isProvidedColumnGroup` (instanceof). */
function createGroup(overrides: { suppressHeaderContextMenu?: boolean } = {}) {
  const group = new AgProvidedColumnGroup(
    { headerName: 'Where & How Much', headerNameEditable: true, ...overrides } as never,
    'where',
    false,
    0,
  );
  (group as unknown as { displayInstances: unknown[] }).displayInstances = [{ colIdSanitised: 'where' }];
  return group;
}
