import { describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { MenuItemMapper } from './menuItemMapper';
import { MenuItemRegistry, type MenuActionParams } from './menuItemRegistry';
import { MenuUtils } from './menuUtils';
import './defaultItems';

const params: MenuActionParams = {
  column: null,
  node: null,
  value: 'value',
  api: {} as never,
};

describe('MenuItemMapper', () => {
  it('resolves registered names, preserves separators, and ignores unavailable items', () => {
    const { bean: mapper } = makeBeanHarness(MenuItemMapper);
    const factory = vi.fn(() => ({ name: 'Registered item' }));
    mapper.registry.register({ name: 'registered', factory });
    mapper.registry.register({ name: 'hidden', factory: () => null });

    const custom = { name: 'Custom item' };
    expect(mapper.mapItems(['registered', 'separator', 'hidden', 'missing'], params)).toEqual([
      { name: 'Registered item' },
      'separator',
    ]);
    expect(mapper.mapMixed(['registered', custom, 'separator', 'missing'], params)).toEqual([
      { name: 'Registered item' },
      custom,
      'separator',
    ]);
    expect(factory).toHaveBeenCalledWith(params);
  });

  it('resolves registered submenu contributions recursively', () => {
    const { bean: mapper } = makeBeanHarness(MenuItemMapper);
    mapper.registry.register({ name: 'child', factory: () => ({ name: 'Child' }) });

    expect(mapper.mapMixed([{ name: 'Parent', subMenu: ['child'] }], params)).toEqual([
      { name: 'Parent', subMenu: [{ name: 'Child' }] },
    ]);
  });

  it('flattens multi-item factories in place, for mapItems and mapMixed', () => {
    const { bean: mapper } = makeBeanHarness(MenuItemMapper);
    mapper.registry.register({
      name: 'multi',
      factory: () => [
        { name: 'First half' },
        { name: 'Second half', subMenu: ['child'] },
      ],
    });
    mapper.registry.register({ name: 'child', factory: () => ({ name: 'Child' }) });

    expect(mapper.mapItems(['multi'], params)).toEqual([
      { name: 'First half' },
      { name: 'Second half', subMenu: [{ name: 'Child' }] },
    ]);
    expect(mapper.mapMixed(['multi'], params)).toEqual([
      { name: 'First half' },
      { name: 'Second half', subMenu: [{ name: 'Child' }] },
    ]);
  });

  it('resolves string subMenu entries on registered items, for mapItems and mapMixed', () => {
    const { bean: mapper } = makeBeanHarness(MenuItemMapper);
    mapper.registry.register({ name: 'child', factory: () => ({ name: 'Child' }) });
    mapper.registry.register({
      name: 'parent',
      factory: () => ({ name: 'Parent', subMenu: ['child', 'separator', 'missing'] }),
    });

    // mapItems: the default context/column menu paths resolve by name.
    expect(mapper.mapItems(['parent'], params)).toEqual([
      { name: 'Parent', subMenu: [{ name: 'Child' }, { name: '__separator__' }] },
    ]);
    // mapMixed: string entries in user callbacks resolve the same way.
    expect(mapper.mapMixed(['parent'], params)).toEqual([
      { name: 'Parent', subMenu: [{ name: 'Child' }, { name: '__separator__' }] },
    ]);
  });
});

describe('MenuItemRegistry', () => {
  it('shows the column chooser only when the API is available', () => {
    const registry = new MenuItemRegistry();
    const showColumnChooser = vi.fn();
    const columnChooserParams = { suppressColumnFilter: true };
    const api = { showColumnChooser, isModuleRegistered: () => true };

    const item = registry.getItem('columnChooser', {
      ...params,
      api: api as never,
      column: { getColDef: () => ({ columnChooserParams }) } as never,
    });
    expect(item?.name).toBe('Choose Columns');
    item?.action?.({} as never);
    expect(showColumnChooser).toHaveBeenCalledWith(columnChooserParams);
    expect(registry.getItem('columnChooser', {
      ...params,
      api: { isModuleRegistered: () => false } as never,
    })).toBeNull();
  });

  it('sorts resolved items by contribution order rather than their display names', () => {
    const registry = new MenuItemRegistry();
    registry.register({ name: 'later-key', order: 20, factory: () => ({ name: 'First label' }) });
    registry.register({
      name: 'earlier-key',
      order: 10,
      factory: () => ({ name: 'Second label' }),
    });

    expect(
      registry.buildItems(['later-key', 'earlier-key'], params).map((item) => item.name),
    ).toEqual(['Second label', 'First label']);
  });

  it('keeps list order within one name when sorting by contribution order', () => {
    const registry = new MenuItemRegistry();
    registry.register({
      name: 'a-list',
      order: 5,
      factory: () => [{ name: 'A1' }, { name: 'A2' }],
    });
    registry.register({ name: 'b-single', order: 5, factory: () => ({ name: 'B' }) });

    // Same order: list order (A1, A2) must be preserved relative to B's position
    // as given in the names array (a-list before b-single).
    expect(registry.buildItems(['a-list', 'b-single'], params).map((i) => i.name)).toEqual([
      'A1',
      'A2',
      'B',
    ]);
  });

  it('overwrites matching registrations and exposes registered names', () => {
    const registry = new MenuItemRegistry();
    registry.register({ name: 'replaceable', factory: () => ({ name: 'Old' }) });
    registry.register({ name: 'replaceable', factory: () => ({ name: 'New' }) });

    expect(registry.has('replaceable')).toBe(true);
    expect(registry.getRegisteredNames()).toContain('replaceable');
    expect(registry.getItem('replaceable', params)).toEqual({ name: 'New' });
    expect(registry.getItem('missing', params)).toBeNull();
  });
});

describe('MenuUtils', () => {
  it('hides null and disabled items and supplies the grid API to actions', () => {
    const api = { marker: 'api' };
    const { bean: utils } = makeBeanHarness(MenuUtils, { beans: { gridApi: api } });

    expect(utils.isItemVisible(null)).toBe(false);
    expect(utils.isItemVisible({ name: 'Disabled', disabled: true })).toBe(false);
    expect(utils.isItemVisible({ name: 'Enabled' })).toBe(true);
    expect(utils.buildActionParams(null, null, 42)).toEqual({
      column: null,
      node: null,
      value: 42,
      api,
    });
  });
});
