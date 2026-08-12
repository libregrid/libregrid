/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { SideBarService } from './sideBarSvc';

describe('SideBarService', () => {
  let destroy: (() => void) | undefined;

  afterEach(() => destroy?.());

  it('normalises sideBar grid options and refreshes its component after option changes', () => {
    const comp = { refresh: vi.fn() };
    const harness = makeBeanHarness(SideBarService, {
      gridOptions: { sideBar: { toolPanels: [], position: 'left', hiddenByDefault: true } },
    });
    destroy = harness.destroy;
    harness.bean.comp = comp as never;

    expect(harness.bean.getDef()).toMatchObject({ position: 'left', hiddenByDefault: true });
    expect(harness.bean.isDisplayed()).toBe(false);
    expect(harness.bean.getPosition()).toBe('left');

    harness.gos.set('sideBar', 'columns');
    expect(harness.bean.getDef()).toEqual({ toolPanels: ['columns'] });
    expect(harness.bean.isDisplayed()).toBe(true);
    expect(harness.bean.getPosition()).toBe('right');
    expect(comp.refresh).toHaveBeenCalledOnce();

    harness.gos.set('sideBar', false);
    expect(harness.bean.getDef()).toBeUndefined();
    expect(harness.bean.isDisplayed()).toBe(false);
  });

  it('merges configured and registered panel definitions by id', () => {
    const harness = makeBeanHarness(SideBarService, {
      gridOptions: { sideBar: { toolPanels: [{ id: 'configured', labelKey: 'configured', labelDefault: 'Configured', iconKey: 'columns' }] } },
    });
    destroy = harness.destroy;

    harness.bean.registerToolPanel({ id: 'configured', labelKey: 'replacement', labelDefault: 'Replacement', iconKey: 'columns' });
    harness.bean.registerToolPanel({ id: 'registered', labelKey: 'registered', labelDefault: 'Registered', iconKey: 'filters' });

    expect(harness.bean.getToolPanelDefs()).toEqual([
      { id: 'configured', labelKey: 'replacement', labelDefault: 'Replacement', iconKey: 'columns' },
      { id: 'registered', labelKey: 'registered', labelDefault: 'Registered', iconKey: 'filters' },
    ]);
  });

  it('keeps state and delegates public operations to its component', () => {
    const comp = {
      refresh: vi.fn(),
      setDisplayed: vi.fn(),
      setSideBarPosition: vi.fn(),
      openToolPanel: vi.fn(),
      close: vi.fn(),
      getToolPanelInstance: vi.fn().mockReturnValue({ marker: 'panel' }),
      setState: vi.fn(),
    };
    const harness = makeBeanHarness(SideBarService, { gridOptions: { sideBar: true } });
    destroy = harness.destroy;
    harness.bean.comp = comp as never;
    const parent = document.createElement('div');

    harness.bean.setDisplayed(false);
    harness.bean.setSideBarPosition('left');
    harness.bean.openToolPanel('columns', 'api', parent);
    expect(harness.bean.isToolPanelShowing()).toBe(true);
    expect(harness.bean.getToolPanelInstance('columns')).toEqual({ marker: 'panel' });
    harness.bean.close('api');

    const state = { visible: true, position: 'left' as const, openToolPanel: 'filters', toolPanels: {} };
    harness.bean.setState(state);

    expect(comp.setDisplayed).toHaveBeenCalledWith(false);
    expect(comp.setSideBarPosition).toHaveBeenCalledWith('left');
    expect(comp.openToolPanel).toHaveBeenCalledWith('columns', 'api', parent);
    expect(comp.close).toHaveBeenCalledWith('api');
    expect(comp.setState).toHaveBeenCalledWith(state);
    expect(harness.bean.getState()).toEqual(state);
  });
});
