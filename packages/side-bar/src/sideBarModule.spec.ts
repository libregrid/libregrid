/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { EnterpriseCoreModule } from '@libregrid/core';
import { SideBarComponent } from './sideBarComponent';
import { SideBarService } from './sideBarSvc';
import { SideBarModule } from './sideBarModule';
import { sideBarCss } from './sideBarCss';
import { VERSION } from './version';

describe('SideBarModule', () => {
  it('declares its service, selector, dependency, CSS, and version', () => {
    expect(SideBarModule).toMatchObject({
      moduleName: 'SideBar',
      version: VERSION,
      beans: [SideBarService],
      selectors: [SideBarComponent.getSelector()],
      dependsOn: [EnterpriseCoreModule],
      css: [sideBarCss],
    });
  });

  it('forwards every grid API operation to the side bar service', () => {
    const service = {
      getDef: vi.fn().mockReturnValue({ toolPanels: [] }),
      setDisplayed: vi.fn(),
      isDisplayed: vi.fn().mockReturnValue(true),
      setSideBarPosition: vi.fn(),
      openToolPanel: vi.fn(),
      close: vi.fn(),
      openedItem: vi.fn().mockReturnValue('columns'),
      isToolPanelShowing: vi.fn().mockReturnValue(true),
      refresh: vi.fn(),
      getToolPanelInstance: vi.fn().mockReturnValue({}),
    };
    const api = SideBarModule.apiFunctions as unknown as Record<string, (...args: unknown[]) => unknown>;
    const beans = { sideBar: service };
    const parent = document.createElement('div');

    expect(api['getSideBar']!(beans)).toEqual({ toolPanels: [] });
    api['setSideBarVisible']!(beans, false);
    expect(api['isSideBarVisible']!(beans)).toBe(true);
    api['setSideBarPosition']!(beans, 'left');
    api['openToolPanel']!(beans, 'columns', parent);
    api['closeToolPanel']!(beans);
    expect(api['getOpenedToolPanel']!(beans)).toBe('columns');
    expect(api['isToolPanelShowing']!(beans)).toBe(true);
    api['refreshToolPanel']!(beans);
    expect(api['getToolPanelInstance']!(beans, 'columns')).toEqual({});

    expect(service.setDisplayed).toHaveBeenCalledWith(false);
    expect(service.setSideBarPosition).toHaveBeenCalledWith('left');
    expect(service.openToolPanel).toHaveBeenCalledWith('columns', 'api', parent);
    expect(service.close).toHaveBeenCalledWith('api');
    expect(service.refresh).toHaveBeenCalledOnce();
  });

  it('returns safe defaults when the service is not installed', () => {
    const api = SideBarModule.apiFunctions as unknown as Record<string, (...args: unknown[]) => unknown>;

    expect(api['getSideBar']!({})).toBeUndefined();
    expect(api['isSideBarVisible']!({})).toBe(false);
    expect(api['getOpenedToolPanel']!({})).toBeNull();
    expect(api['isToolPanelShowing']!({})).toBe(false);
    expect(api['getToolPanelInstance']!({}, 'columns')).toBeUndefined();
    expect(() => api['openToolPanel']!({}, 'columns')).not.toThrow();
  });
});
