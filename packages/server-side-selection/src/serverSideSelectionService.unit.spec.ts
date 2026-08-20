import { describe, expect, it, vi } from 'vitest';
import type { RowNode, SelectionEventSourceType } from 'ag-grid-community';
import { ServerSideSelectionService } from './serverSideSelectionService';

interface FakeNodeOptions {
  id?: string;
  selected?: boolean;
  selectable?: boolean;
  group?: boolean;
  data?: unknown;
  parent?: RowNode | null;
  childrenAfterGroup?: RowNode[] | null;
  childrenAfterFilter?: RowNode[] | null;
  childrenAfterAggFilter?: RowNode[] | null;
  footer?: boolean;
  expanded?: boolean;
  destroyed?: boolean;
  rowPinned?: 'top' | 'bottom' | null;
  pinnedSibling?: RowNode;
}

const selectedState = new WeakMap<RowNode, boolean>();

function fakeNode(options: FakeNodeOptions = {}): RowNode {
  const node = {
    id: options.id,
    data: options.data,
    selectable: options.selectable ?? true,
    group: options.group ?? false,
    parent: options.parent ?? null,
    childrenAfterGroup: options.childrenAfterGroup ?? null,
    childrenAfterFilter: options.childrenAfterFilter ?? null,
    childrenAfterAggFilter: options.childrenAfterAggFilter ?? null,
    footer: options.footer ?? false,
    expanded: options.expanded ?? false,
    destroyed: options.destroyed ?? false,
    rowPinned: options.rowPinned ?? null,
    pinnedSibling: options.pinnedSibling,
    isSelected: () => selectedState.get(node as unknown as RowNode) ?? false,
  } as unknown as RowNode;
  (node as unknown as { primaryRow: RowNode }).primaryRow = node;
  selectedState.set(node, options.selected ?? false);
  node.__selected = options.selected ?? false;
  return node;
}

function setSelected(node: RowNode, selected: boolean): void {
  selectedState.set(node, selected);
  node.__selected = selected;
}

interface HarnessOptions {
  filteredNodes?: RowNode[];
  pageRows?: Array<RowNode | undefined>;
  rowSelection?: unknown;
  groupSelectsDescendants?: boolean;
  groupSelectsFiltered?: boolean;
}

interface ServiceInternals {
  groupSelectsDescendants: boolean;
  groupSelectsFiltered: boolean;
  selectionBatchDepth: number;
  pendingSelectionChanged: boolean;
  pendingSelectionSource: SelectionEventSourceType | null;
  resetNodes(): void;
  selectChildren(
    node: RowNode,
    newValue: boolean,
    source: SelectionEventSourceType,
    event: Event | undefined,
  ): number;
  endSelectionBatch(): void;
  isRowSelectionBlocked: ReturnType<typeof vi.fn>;
  inferNodeSelections: ReturnType<typeof vi.fn>;
}

function internal(service: ServerSideSelectionService): ServiceInternals {
  return service as unknown as ServiceInternals;
}

function createHarness(nodes: RowNode[], options: HarnessOptions = {}) {
  const service = new ServerSideSelectionService();
  let rowSelection = options.rowSelection ?? { mode: 'multiRow' };
  const filteredNodes = options.filteredNodes ?? nodes;
  const pageRows = options.pageRows ?? nodes;
  const dispatchEvent = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();
  const setRoot = vi.fn();
  const calculateSelectedFromChildren = vi.fn((): boolean | null => true);
  const updateRowSelectable = vi.fn();
  const selectRowNode = vi.fn((node: RowNode, value: boolean | undefined): boolean => {
    const next = value === true;
    const changed = node.isSelected() !== next;
    setSelected(node, next);
    return changed;
  });

  Object.assign(service as unknown as Record<string, unknown>, {
    beans: {
      rowModel: {
        forEachNode: (callback: (node: RowNode, index: number) => void) => nodes.forEach(callback),
        forEachNodeAfterFilter: (callback: (node: RowNode, index: number) => void) =>
          filteredNodes.forEach(callback),
        getRow: (index: number) => pageRows[index],
        getRowNode: (id: string) => nodes.find((node) => node.id === id),
      },
      pageBounds: {
        getFirstRow: () => 0,
        getLastRow: () => Math.max(0, pageRows.length - 1),
      },
    },
    gos: {
      beanName: 'gos',
      get: (key: string) => {
        if (key === 'rowSelection') return rowSelection;
        if (key === 'treeData') return false;
        return undefined;
      },
    },
    selectionCtx: { selectAll: false, setRoot, reset: vi.fn() },
    eventSvc: { dispatchEvent },
    groupSelectsDescendants: options.groupSelectsDescendants ?? false,
    groupSelectsFiltered: options.groupSelectsFiltered ?? false,
    selectionBatchDepth: 0,
    pendingSelectionChanged: false,
    pendingSelectionSource: null,
    selectRowNode,
    calculateSelectedFromChildren,
    updateRowSelectable,
    warn,
    error,
  });

  return {
    service,
    dispatchEvent,
    warn,
    error,
    setRoot,
    selectRowNode,
    calculateSelectedFromChildren,
    updateRowSelectable,
    setRowSelection: (value: unknown) => {
      rowSelection = value;
    },
  };
}

describe('ServerSideSelectionService unit behavior', () => {
  it('projects the loaded selected set into nodes, rows, counts and state', () => {
    const selected = fakeNode({ id: 'a', selected: true, data: { id: 'a' } });
    const group = fakeNode({ id: 'group', selected: true, group: true, data: { group: true } });
    const withoutData = fakeNode({ id: 'empty', selected: true });
    const unselected = fakeNode({ id: 'b', data: { id: 'b' } });
    const { service } = createHarness([selected, group, withoutData, unselected]);

    expect(service.getSelectedNodes()).toEqual([selected, group, withoutData]);
    expect(service.getSelectedRows()).toEqual([{ id: 'a' }, { group: true }]);
    expect(service.getSelectionCount()).toBe(3);
    expect(service.isEmpty()).toBe(false);
    expect(service.getSelectionState()).toEqual(['a', 'group', 'empty']);
    expect(service.getBestCostNodeSelection()).toEqual([selected, group, withoutData]);

    internal(service).groupSelectsDescendants = true;
    expect(service.getSelectedNodes()).toEqual([selected, withoutData]);

    setSelected(selected, false);
    setSelected(group, false);
    setSelected(withoutData, false);
    expect(service.isEmpty()).toBe(true);
    expect(service.getSelectionState()).toBeNull();
    expect(service.getBestCostNodeSelection()).toBeUndefined();
  });

  it('validates and applies loaded-row selection state', () => {
    const first = fakeNode({ id: 'a', selected: true });
    const second = fakeNode({ id: 'b' });
    const replacement = fakeNode({ id: 'replacement' });
    const { service, error } = createHarness([first, second]);

    service.setSelectionState({ bad: true } as unknown as string[], 'api');
    expect(error).toHaveBeenCalledWith(103);

    const resetNodes = vi.fn();
    const setNodesSelected = vi.fn();
    Object.assign(service as unknown as Record<string, unknown>, { resetNodes, setNodesSelected });
    service.setSelectionState(['b', 'not-loaded'], 'api', true);
    expect(resetNodes).toHaveBeenCalledOnce();
    expect(setNodesSelected).toHaveBeenCalledWith({
      nodes: [second],
      newValue: true,
      clearSelection: false,
      source: 'api',
    });

    setNodesSelected.mockClear();
    service.setSelectionState(undefined, 'api');
    expect(setNodesSelected).not.toHaveBeenCalled();

    service.syncInRowNode(replacement, first);
    expect(replacement.__selected).toBe(true);
    setSelected(replacement, false);
    service.syncInRowNode(replacement);
    expect(replacement.__selected).toBe(false);
    expect(service.removeFromSelection(first, 'api')).toBeUndefined();
  });

  it('handles setNodesSelected guards, finish actions and descendant groups', () => {
    const leaf = fakeNode({ id: 'leaf' });
    const { service, warn, dispatchEvent, setRoot, selectRowNode, setRowSelection } = createHarness(
      [leaf],
    );

    expect(service.setNodesSelected({ nodes: [], newValue: true, source: 'api' })).toBe(0);

    setRowSelection(undefined);
    expect(service.setNodesSelected({ nodes: [leaf], newValue: true, source: 'api' })).toBe(0);
    expect(warn).toHaveBeenCalledWith(132);

    setRowSelection({ mode: 'singleRow' });
    expect(
      service.setNodesSelected({
        nodes: [leaf, fakeNode({ id: 'other' })],
        newValue: true,
        source: 'api',
      }),
    ).toBe(0);
    expect(warn).toHaveBeenCalledWith(130);

    setRowSelection({ mode: 'multiRow' });
    const event = {} as Event;
    expect(
      service.setNodesSelected({
        nodes: [leaf],
        newValue: true,
        clearSelection: true,
        event,
        source: 'api',
      }),
    ).toBe(1);
    expect(setRoot).toHaveBeenCalledWith(leaf);
    expect(dispatchEvent).toHaveBeenCalledOnce();

    const invalidPinned = fakeNode({ id: 'pinned', rowPinned: 'top' });
    const idless = fakeNode();
    const destroyed = fakeNode({ id: 'destroyed', destroyed: true });
    const manualPinned = fakeNode({
      id: 'manual-pinned',
      rowPinned: 'bottom',
      pinnedSibling: leaf,
    });
    selectRowNode.mockClear();
    service.setNodesSelected({
      nodes: [undefined, invalidPinned, idless, destroyed, manualPinned] as unknown as RowNode[],
      newValue: true,
      suppressFinishActions: true,
      source: 'api',
    });
    expect(warn).toHaveBeenCalledWith(59);
    expect(warn).toHaveBeenCalledWith(60);
    expect(selectRowNode).toHaveBeenCalledTimes(1);
    expect(selectRowNode).toHaveBeenCalledWith(manualPinned, true, undefined, 'api');

    const child = fakeNode({ id: 'child' });
    const group = fakeNode({ id: 'group', group: true, childrenAfterGroup: [child] });
    const grouped = createHarness([group, child], { groupSelectsDescendants: true });
    expect(
      grouped.service.setNodesSelected({
        nodes: [group],
        newValue: true,
        event,
        source: 'checkboxSelected',
      }),
    ).toBeGreaterThan(0);
    expect(child.isSelected()).toBe(true);

    internal(grouped.service).groupSelectsFiltered = true;
    group.childrenAfterAggFilter = null;
    expect(internal(grouped.service).selectChildren(group, false, 'api', undefined)).toBe(0);
  });

  it('handles blocked, range and direct selection events', () => {
    const first = fakeNode({ id: 'a' });
    const second = fakeNode({ id: 'b', selected: true });
    const { service } = createHarness([first, second]);
    const internals = internal(service);
    internals.isRowSelectionBlocked = vi.fn(() => true);
    internals.inferNodeSelections = vi.fn();
    const event = { shiftKey: false, metaKey: false, ctrlKey: false } as MouseEvent;

    expect(service.handleSelectionEvent(event, first, 'rowClicked')).toBe(0);
    internals.isRowSelectionBlocked.mockReturnValue(false);
    internals.inferNodeSelections.mockReturnValue(null);
    expect(service.handleSelectionEvent(event, first, 'rowClicked')).toBe(0);

    internals.inferNodeSelections.mockReturnValue({
      select: [first],
      deselect: [second],
      reset: false,
    });
    expect(service.handleSelectionEvent(event, first, 'rowClicked')).toBe(1);
    expect(first.isSelected()).toBe(true);
    expect(second.isSelected()).toBe(false);

    setSelected(second, true);
    internals.inferNodeSelections.mockReturnValue({
      select: [first],
      deselect: [],
      reset: true,
    });
    service.handleSelectionEvent(event, first, 'rowClicked');
    expect(second.isSelected()).toBe(false);

    const setNodesSelected = vi.fn(() => 4);
    Object.assign(service as unknown as Record<string, unknown>, { setNodesSelected });
    internals.inferNodeSelections.mockReturnValue({
      node: second,
      newValue: true,
      clearSelection: false,
      keepDescendants: true,
    });
    expect(service.handleSelectionEvent(event, second, 'checkboxSelected')).toBe(4);
    expect(setNodesSelected).toHaveBeenCalledWith(
      expect.objectContaining({ keepDescendants: true, source: 'checkboxSelected' }),
    );

    internals.inferNodeSelections.mockReturnValue({
      node: second,
      newValue: false,
      clearSelection: true,
    });
    service.handleSelectionEvent(event, second, 'rowClicked');
    expect(setNodesSelected).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ keepDescendants: expect.anything() }),
    );
  });

  it('calculates select-all state across all, filtered and current-page scopes', () => {
    const selected = fakeNode({ id: 'selected', selected: true });
    const unselected = fakeNode({ id: 'unselected' });
    const disabled = fakeNode({ id: 'disabled', selectable: false });
    const { service } = createHarness([selected, unselected, disabled], {
      filteredNodes: [selected],
      pageRows: [undefined, selected, unselected],
    });

    expect(service.getSelectAllState()).toBeNull();
    expect(service.getSelectAllState('filtered')).toBe(true);
    expect(service.getSelectAllState('currentPage')).toBeNull();
    expect(service.hasNodesToSelect()).toBe(true);

    setSelected(selected, false);
    expect(service.getSelectAllState()).toBe(false);
    expect(service.hasNodesToSelect()).toBe(true);
    selected.selectable = false;
    unselected.selectable = false;
    expect(service.hasNodesToSelect()).toBe(false);
  });

  it('selects and deselects scope nodes, including collapsed group descendants', () => {
    const grandchild = fakeNode({ id: 'grandchild' });
    const child = fakeNode({ id: 'child', childrenAfterFilter: [grandchild] });
    const group = fakeNode({
      id: 'group',
      group: true,
      expanded: false,
      childrenAfterFilter: [child],
    });
    const footer = fakeNode({ id: 'footer', group: true, footer: true });
    const { service, dispatchEvent, warn, setRowSelection, calculateSelectedFromChildren } =
      createHarness([group, child, grandchild, footer], { pageRows: [group, footer] });

    setRowSelection(undefined);
    service.selectAllRowNodes({ source: 'uiSelectAll' });
    expect(warn).toHaveBeenCalledWith(132);
    setRowSelection({ mode: 'singleRow' });
    service.selectAllRowNodes({ source: 'uiSelectAll' });
    expect(warn).toHaveBeenCalledWith(130);

    setRowSelection({ mode: 'multiRow' });
    service.selectAllRowNodes({ source: 'uiSelectAllCurrentPage', selectAll: 'currentPage' });
    expect(group.isSelected()).toBe(true);
    expect(child.isSelected()).toBe(true);
    expect(grandchild.isSelected()).toBe(true);
    expect(footer.isSelected()).toBe(true);
    expect(dispatchEvent).toHaveBeenCalled();

    service.deselectAllRowNodes({ source: 'uiSelectAllCurrentPage', selectAll: 'currentPage' });
    expect(group.isSelected()).toBe(false);
    expect(child.isSelected()).toBe(false);
    expect(grandchild.isSelected()).toBe(false);

    setSelected(child, true);
    setSelected(grandchild, true);
    service.deselectAllRowNodes({ source: 'api' });
    expect(child.isSelected()).toBe(false);
    expect(grandchild.isSelected()).toBe(false);

    internal(service).groupSelectsDescendants = true;
    calculateSelectedFromChildren.mockReturnValue(false);
    setSelected(group, true);
    service.selectAllRowNodes({ source: 'api', selectAll: 'filtered' });
    service.deselectAllRowNodes({ source: 'api', selectAll: 'filtered' });
    expect(group.isSelected()).toBe(false);
  });

  it('resets, rolls up groups and batches selectable-change events', () => {
    const leaf = fakeNode({ id: 'leaf', selected: true });
    const group = fakeNode({ id: 'group', group: true });
    const {
      service,
      dispatchEvent,
      calculateSelectedFromChildren,
      updateRowSelectable,
      setRowSelection,
    } = createHarness([leaf, group]);

    expect(service.updateGroupsFromChildrenSelections('api')).toBe(false);
    service.reset('api');
    expect(leaf.isSelected()).toBe(false);
    expect(dispatchEvent).toHaveBeenCalledOnce();
    service.reset('api');
    expect(dispatchEvent).toHaveBeenCalledOnce();

    internal(service).groupSelectsDescendants = true;
    calculateSelectedFromChildren.mockReturnValueOnce(null).mockReturnValue(true);
    expect(service.updateGroupsFromChildrenSelections('api')).toBe(false);
    expect(service.updateGroupsFromChildrenSelections('api')).toBe(true);

    setRowSelection(undefined);
    service.updateSelectable();
    expect(updateRowSelectable).not.toHaveBeenCalled();

    setRowSelection({ mode: 'multiRow' });
    updateRowSelectable.mockImplementation(() =>
      service.dispatchSelectionChanged('selectableChanged'),
    );
    service.updateSelectableAfterGrouping(undefined);
    expect(updateRowSelectable).toHaveBeenCalledTimes(2);
    expect(dispatchEvent).toHaveBeenCalledTimes(2);

    const internals = internal(service);
    internals.selectionBatchDepth = 1;
    service.dispatchSelectionChanged('rowClicked');
    expect(internals.pendingSelectionChanged).toBe(true);
    service.flushPendingSelectionChanged();
    expect(dispatchEvent).toHaveBeenCalledTimes(2);
    internals.selectionBatchDepth = 0;
    service.flushPendingSelectionChanged();
    expect(dispatchEvent).toHaveBeenCalledTimes(3);

    internals.selectionBatchDepth = 1;
    internals.pendingSelectionChanged = true;
    internals.pendingSelectionSource = null;
    internals.endSelectionBatch();
    expect(dispatchEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: 'api', serverSideState: null }),
    );

    expect(service.refreshMasterNodeState(leaf)).toBeUndefined();
    expect(service.setDetailSelectionState(leaf, {}, {} as never)).toBeUndefined();
  });
});
