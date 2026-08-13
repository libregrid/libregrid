/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GroupCellRendererParams, IRowNode } from 'ag-grid-community';
import { GroupCellRenderer } from './groupCellRenderer';

function makeNode(overrides: Partial<IRowNode> = {}): IRowNode {
  const listeners = new Map<string, Set<(e: unknown) => void>>();
  return {
    group: true,
    expanded: false,
    uiLevel: 0,
    key: 'US',
    allChildrenCount: 2,
    childrenAfterGroup: [{}, {}],
    setExpanded: vi.fn(function (this: IRowNode, expanded: boolean) {
      this.expanded = expanded;
    }),
    addEventListener: vi.fn((type: string, fn: (e: unknown) => void) => {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(fn);
    }),
    removeEventListener: vi.fn((type: string, fn: (e: unknown) => void) => {
      listeners.get(type)?.delete(fn);
    }),
    ...overrides,
  } as unknown as IRowNode;
}

function makeParams(overrides: Partial<GroupCellRendererParams> = {}): GroupCellRendererParams {
  return {
    node: makeNode(),
    value: 'US',
    ...overrides,
  } as unknown as GroupCellRendererParams;
}

describe('GroupCellRenderer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the value and child count, indented by uiLevel', () => {
    const renderer = new GroupCellRenderer();
    const params = makeParams({ node: makeNode({ uiLevel: 2, allChildrenCount: 5 }) });
    renderer.init(params);

    const gui = renderer.getGui();
    expect(gui.textContent).toBe('US(5)');
    expect(gui.style.paddingLeft).toBe('32px');
  });

  it('toggles expansion when the toggle is clicked', () => {
    const renderer = new GroupCellRenderer();
    const node = makeNode({ expanded: false });
    renderer.init(makeParams({ node }));

    renderer.getGui().querySelector<HTMLElement>('.lgr-group-cell-toggle')!.click();

    expect(node.setExpanded).toHaveBeenCalledWith(true, expect.anything());
  });

  it('does not offer a toggle for leaf (non-group) rows', () => {
    const renderer = new GroupCellRenderer();
    const node = makeNode({ group: false, childrenAfterGroup: null, value: undefined });
    renderer.init(makeParams({ node, value: null }));

    const gui = renderer.getGui();
    expect(gui.classList.contains('lgr-group-cell-expandable')).toBe(false);
    expect(gui.hasAttribute('aria-expanded')).toBe(false);
    expect(gui.querySelector('.lgr-group-cell-count')?.textContent).toBe('');
  });

  it('re-renders when the node dispatches expandedChanged', () => {
    const renderer = new GroupCellRenderer();
    const node = makeNode({ expanded: false });
    renderer.init(makeParams({ node }));

    node.expanded = true;
    const listenerCalls = (node.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const [, handler] = listenerCalls.find(([type]) => type === 'expandedChanged')!;
    handler({});

    expect(
      renderer.getGui().querySelector('.lgr-group-cell-toggle')?.classList.contains('lgr-group-cell-toggle-expanded'),
    ).toBe(true);
  });

  it('honours suppressCount and suppressPadding', () => {
    const renderer = new GroupCellRenderer();
    const params = makeParams({
      node: makeNode({ uiLevel: 1 }),
      suppressCount: true,
      suppressPadding: true,
    });
    renderer.init(params);

    const gui = renderer.getGui();
    expect(gui.textContent).toBe('US');
    expect(gui.style.paddingLeft).toBe('');
  });

  it('removes node listeners on destroy', () => {
    const renderer = new GroupCellRenderer();
    const node = makeNode();
    renderer.init(makeParams({ node }));

    renderer.destroy();

    expect(node.removeEventListener).toHaveBeenCalledWith('expandedChanged', expect.any(Function));
    expect(node.removeEventListener).toHaveBeenCalledWith('allChildrenCountChanged', expect.any(Function));
  });
});
