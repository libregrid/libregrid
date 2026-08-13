/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BeanCollection, SideBarDef } from 'ag-grid-community';
import { SideBarComponent } from './sideBarComponent';

class TestPanel {
  readonly gui = document.createElement('div');
  readonly init = vi.fn();
  readonly refresh = vi.fn();
  readonly destroy = vi.fn();

  constructor() {
    this.gui.textContent = 'Panel content';
  }

  getGui(): HTMLElement {
    return this.gui;
  }
}

interface SideBarServiceStub {
  comp?: SideBarComponent;
  getDef: ReturnType<typeof vi.fn>;
  getPosition: ReturnType<typeof vi.fn>;
  getToolPanelDefs: ReturnType<typeof vi.fn>;
  isDisplayed: ReturnType<typeof vi.fn>;
  openToolPanel: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

function createComponent(def: SideBarDef, displayed = true): {
  component: SideBarComponent;
  service: SideBarServiceStub;
  events: { dispatchEvent: ReturnType<typeof vi.fn> };
} {
  const service: SideBarServiceStub = {
    getDef: vi.fn().mockReturnValue(def),
    getPosition: vi.fn().mockReturnValue(def.position ?? 'right'),
    getToolPanelDefs: vi.fn().mockReturnValue(def.toolPanels ?? []),
    isDisplayed: vi.fn().mockReturnValue(displayed),
    openToolPanel: vi.fn(),
    close: vi.fn(),
  };
  const events = { dispatchEvent: vi.fn() };
  const component = new SideBarComponent();
  (component as unknown as { preWireBeans(beans: BeanCollection): void }).preWireBeans({
    sideBar: service,
    eventSvc: events,
    gridApi: { marker: 'api' },
  } as unknown as BeanCollection);
  component.postConstruct();
  return { component, service, events };
}

describe('SideBarComponent', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('renders buttons, opens panels, and reports visibility changes', () => {
    const { component, service, events } = createComponent({
      toolPanels: [{ id: 'columns', labelKey: 'columns', labelDefault: 'Columns', iconKey: 'columns', toolPanel: TestPanel }],
    });
    const button = component.getGui().querySelector<HTMLButtonElement>('.lgr-side-bar-button');

    expect(button?.textContent).toBe('Columns');
    button?.click();
    expect(service.openToolPanel).toHaveBeenCalledWith('columns', 'sideBarButtonClicked');

    component.openToolPanel('columns');
    const panel = component.getToolPanelInstance('columns') as unknown as TestPanel;
    expect(panel).toBeInstanceOf(TestPanel);
    expect(panel.init).toHaveBeenCalledWith(expect.objectContaining({ api: { marker: 'api' } }));
    expect(component.getGui().textContent).toContain('Panel content');
    expect(events.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'toolPanelVisibleChanged', key: 'columns', visible: true,
    }));

    component.close();
    expect(component.openedItem()).toBeNull();
    expect(events.dispatchEvent).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'toolPanelVisibleChanged', key: 'columns', visible: false,
    }));
  });

  it('uses default panels, applies layout options, and refreshes existing panels', () => {
    const { component } = createComponent({
      toolPanels: [{ id: 'filters', labelKey: 'filters', labelDefault: 'Filters', iconKey: 'filters', toolPanel: TestPanel }],
      defaultToolPanel: 'filters',
      position: 'left',
      hideButtons: true,
    });
    const panel = component.getToolPanelInstance('filters') as unknown as TestPanel;

    expect(component.openedItem()).toBe('filters');
    expect(component.getGui().classList).toContain('lgr-side-bar-left');
    expect(component.getGui().classList).toContain('lgr-side-bar-buttons-hidden');
    component.refresh();
    expect(panel.refresh).toHaveBeenCalledOnce();
    component.destroy();
    expect(panel.destroy).toHaveBeenCalledOnce();
  });

  it('clamps resized panel widths and retains each panel width', () => {
    const { component, events } = createComponent({
      toolPanels: [{ id: 'columns', labelKey: 'columns', labelDefault: 'Columns', iconKey: 'columns', minWidth: 150, maxWidth: 300, width: 250 }],
    });
    component.openToolPanel('columns');
    const handle = component.getGui().querySelector<HTMLElement>('.lgr-side-bar-resize-handle');
    handle?.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: -100, bubbles: true }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

    expect(component.getGui().querySelector<HTMLElement>('.lgr-side-bar-panel')?.style.width).toBe('300px');
    expect(events.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'toolPanelSizeChanged', key: 'columns', width: 300,
    }));
  });

  it('renders a missing-panel message and honours supplied panel hosts', () => {
    const { component } = createComponent({ toolPanels: [] });
    component.openToolPanel('missing');
    expect(component.getGui().textContent).toContain("Panel 'missing' not found");

    const { component: hosted } = createComponent({
      toolPanels: [{ id: 'columns', labelKey: 'columns', labelDefault: 'Columns', iconKey: 'columns', toolPanel: TestPanel }],
    });
    const parent = document.createElement('div');
    hosted.openToolPanel('columns', 'api', parent);
    expect(parent.textContent).toContain('Panel content');
  });
});
