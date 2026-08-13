/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  type GridApi,
  type GridOptions,
} from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { ContextMenuModule } from './contextMenuModule';
import { ColumnMenuModule } from './columnMenuModule';
import { MenuItemRegistry } from './menuItemRegistry';
import { registerMenuItem } from './registryApi';

let api: GridApi | undefined;

beforeAll(() => {
  ModuleRegistry.registerModules([
    AllCommunityModule,
    EnterpriseCoreModule,
    ContextMenuModule,
    ColumnMenuModule,
  ]);
});

afterEach(() => {
  api?.destroy();
  api = undefined;
});

function mountGrid(options: GridOptions = {}): GridApi {
  const el = document.createElement('div');
  el.style.width = '600px';
  el.style.height = '400px';
  document.body.appendChild(el);
  return createGrid(el, {
    columnDefs: [{ field: 'name' }, { field: 'value' }],
    rowData: [
      { name: 'A', value: 1 },
      { name: 'B', value: 2 },
    ],
    ...options,
  });
}

describe('ContextMenuModule', () => {
  it('registers without throwing', () => {
    expect(() => ModuleRegistry.registerModules([ContextMenuModule])).not.toThrow();
  });

  it('boots a grid with the module registered', () => {
    api = mountGrid();
    expect(api).toBeDefined();
    expect(api.getDisplayedRowCount()).toBe(2);
  });

  it('provides the showContextMenu API function', () => {
    api = mountGrid();
    expect(typeof api.showContextMenu).toBe('function');
  });
});

describe('MenuItemRegistry', () => {
  it('registers and resolves items', () => {
    registerMenuItem({
      name: 'testItem',
      factory: () => ({ name: 'Test Item', action: () => {} }),
    });

    // The registry reads from the global store during construction
    const registry = new MenuItemRegistry();
    const item = registry.getItem('testItem', {
      column: null,
      node: null,
      value: null,
      api: null as never,
    });
    expect(item).not.toBeNull();
    expect(item?.name).toBe('Test Item');
  });

  it('returns null for unknown items', () => {
    const registry = new MenuItemRegistry();
    const item = registry.getItem('nonExistent', {
      column: null,
      node: null,
      value: null,
      api: null as never,
    });
    expect(item).toBeNull();
  });
});

describe('ColumnMenuModule', () => {
  it('registers without throwing', () => {
    expect(() => ModuleRegistry.registerModules([ColumnMenuModule])).not.toThrow();
  });

  it('does not own the column chooser API functions', () => {
    expect(ColumnMenuModule.apiFunctions).toBeUndefined();
  });
});
