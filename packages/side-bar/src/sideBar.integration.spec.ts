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
import { SideBarModule } from './sideBarModule';

class TestToolPanel {
  readonly gui = document.createElement('div');
  refreshCalls = 0;
  params: unknown;

  constructor() {
    this.gui.textContent = 'Test tool panel';
  }

  init(params: unknown): void {
    this.params = params;
  }

  getGui(): HTMLElement {
    return this.gui;
  }

  refresh(): void {
    this.refreshCalls += 1;
  }
}

let api: GridApi | undefined;

beforeAll(() => {
  ModuleRegistry.registerModules([
    AllCommunityModule,
    EnterpriseCoreModule,
    SideBarModule,
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

describe('SideBarModule', () => {
  it('registers without throwing', () => {
    expect(() => ModuleRegistry.registerModules([SideBarModule])).not.toThrow();
  });

  it('boots a grid with the module registered', () => {
    api = mountGrid();
    expect(api).toBeDefined();
    expect(api.getDisplayedRowCount()).toBe(2);
  });

  it('provides side bar API functions', () => {
    api = mountGrid();
    expect(typeof api.getSideBar).toBe('function');
    expect(typeof api.setSideBarVisible).toBe('function');
    expect(typeof api.isSideBarVisible).toBe('function');
    expect(typeof api.setSideBarPosition).toBe('function');
    expect(typeof api.openToolPanel).toBe('function');
    expect(typeof api.closeToolPanel).toBe('function');
    expect(typeof api.getOpenedToolPanel).toBe('function');
    expect(typeof api.isToolPanelShowing).toBe('function');
    expect(typeof api.refreshToolPanel).toBe('function');
    expect(typeof api.getToolPanelInstance).toBe('function');
  });

  it('sideBar grid option accepts boolean true', () => {
    api = mountGrid({ sideBar: true });
    expect(api.isSideBarVisible()).toBe(true);
  });

  it('sideBar grid option accepts boolean false', () => {
    api = mountGrid({ sideBar: false });
    expect(api.isSideBarVisible()).toBe(false);
  });

  it('sideBar grid option accepts a SideBarDef object', () => {
    api = mountGrid({
      sideBar: {
        toolPanels: [],
        position: 'left',
        hiddenByDefault: false,
      },
    });
    expect(api.isSideBarVisible()).toBe(true);
  });

  it('setSideBarVisible toggles visibility', () => {
    api = mountGrid({ sideBar: true });
    expect(api.isSideBarVisible()).toBe(true);
    api.setSideBarVisible(false);
    expect(api.isSideBarVisible()).toBe(false);
    api.setSideBarVisible(true);
    expect(api.isSideBarVisible()).toBe(true);
  });

  it('instantiates, returns, and refreshes registered tool panels', () => {
    api = mountGrid({
      sideBar: {
        toolPanels: [{
          id: 'test',
          labelKey: 'test',
          labelDefault: 'Test',
          iconKey: 'columns',
          toolPanel: TestToolPanel,
          toolPanelParams: { marker: 'passed' },
        }],
      },
    });

    api.openToolPanel('test');
    const panel = api.getToolPanelInstance('test') as TestToolPanel | undefined;
    expect(panel).toBeInstanceOf(TestToolPanel);
    expect(panel?.params).toMatchObject({ marker: 'passed' });

    api.refreshToolPanel();
    expect(panel?.refreshCalls).toBe(1);
  });

  it('renders a panel into the supplied parent element', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    api = mountGrid({
      sideBar: {
        toolPanels: [{
          id: 'external',
          labelKey: 'external',
          labelDefault: 'External',
          iconKey: 'columns',
          toolPanel: TestToolPanel,
        }],
      },
    });

    api.openToolPanel('external', parent);
    expect(parent.textContent).toContain('Test tool panel');
  });
});
