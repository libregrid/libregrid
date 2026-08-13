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
    expect(gui.hasAttribute('role')).toBe(false);
    expect(gui.querySelector('.lgr-group-cell-count')?.textContent).toBe('');
  });

  it('exposes role="button" and aria-expanded on expandable group cells only', () => {
    const renderer = new GroupCellRenderer();
    const node = makeNode({ expanded: false });
    renderer.init(makeParams({ node }));

    const gui = renderer.getGui();
    expect(gui.getAttribute('role')).toBe('button');
    expect(gui.getAttribute('aria-expanded')).toBe('false');

    node.expanded = true;
    const listenerCalls = (node.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const [, handler] = listenerCalls.find(([type]) => type === 'expandedChanged')!;
    handler({});

    expect(gui.getAttribute('aria-expanded')).toBe('true');
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

  it('shows the literal "Total" for a footer row instead of the raw value, with no toggle/count', () => {
    const renderer = new GroupCellRenderer();
    const node = makeNode({ footer: true, key: 'US', childrenAfterGroup: null, allChildrenCount: 0 });
    renderer.init(makeParams({ node, value: 'US' }));

    const gui = renderer.getGui();
    expect(gui.textContent).toBe('Total');
    expect(gui.classList.contains('lgr-group-cell-total')).toBe(true);
    expect(gui.classList.contains('lgr-group-cell-expandable')).toBe(false);
  });

  it('uses cellRendererParams.totalValueGetter (function form) to label a footer row', () => {
    const renderer = new GroupCellRenderer();
    const node = makeNode({ footer: true, key: 'US', childrenAfterGroup: null });
    const totalValueGetter = vi.fn(() => 'Grand Total');
    renderer.init(makeParams({ node, value: 'US', totalValueGetter }));

    expect(renderer.getGui().textContent).toBe('Grand Total');
    expect(totalValueGetter).toHaveBeenCalled();
  });

  it('toggles expansion on double-click unless suppressDoubleClickExpand', () => {
    const renderer = new GroupCellRenderer();
    const node = makeNode({ expanded: false });
    renderer.init(makeParams({ node }));

    renderer.getGui().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(node.setExpanded).toHaveBeenCalledWith(true, expect.anything());

    const suppressed = new GroupCellRenderer();
    const suppressedNode = makeNode({ expanded: false });
    suppressed.init(makeParams({ node: suppressedNode, suppressDoubleClickExpand: true }));

    suppressed.getGui().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(suppressedNode.setExpanded).not.toHaveBeenCalled();
  });

  it('toggles expansion on Enter unless suppressEnterExpand; other keys are ignored', () => {
    const renderer = new GroupCellRenderer();
    const node = makeNode({ expanded: true });
    renderer.init(makeParams({ node }));

    const gui = renderer.getGui();
    gui.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(node.setExpanded).not.toHaveBeenCalled();

    gui.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(node.setExpanded).toHaveBeenCalledWith(false, expect.anything());

    const suppressed = new GroupCellRenderer();
    const suppressedNode = makeNode({ expanded: false });
    suppressed.init(makeParams({ node: suppressedNode, suppressEnterExpand: true }));

    suppressed.getGui().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(suppressedNode.setExpanded).not.toHaveBeenCalled();
  });

  it('toggle interactions no-op on non-group nodes and on groups with no children', () => {
    const leaf = new GroupCellRenderer();
    const leafNode = makeNode({ group: false, childrenAfterGroup: null });
    leaf.init(makeParams({ node: leafNode, value: 'x' }));

    leaf.getGui().querySelector<HTMLElement>('.lgr-group-cell-toggle')!.click();
    leaf.getGui().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(leafNode.setExpanded).not.toHaveBeenCalled();

    const empty = new GroupCellRenderer();
    const emptyNode = makeNode({ childrenAfterGroup: [] });
    empty.init(makeParams({ node: emptyNode }));

    empty.getGui().querySelector<HTMLElement>('.lgr-group-cell-toggle')!.click();
    expect(emptyNode.setExpanded).not.toHaveBeenCalled();
  });

  it('falls back to childrenAfterGroup.length, then 0, for the child count', () => {
    const byLength = new GroupCellRenderer();
    const nodeNoCount = makeNode({ allChildrenCount: null, childrenAfterGroup: [{}, {}, {}] });
    byLength.init(makeParams({ node: nodeNoCount }));
    expect(byLength.getGui().querySelector('.lgr-group-cell-count')?.textContent).toBe('(3)');

    const none = new GroupCellRenderer();
    const nodeNothing = makeNode({ allChildrenCount: undefined, childrenAfterGroup: null });
    none.init(makeParams({ node: nodeNothing }));
    expect(none.getGui().querySelector('.lgr-group-cell-count')?.textContent).toBe('');
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
