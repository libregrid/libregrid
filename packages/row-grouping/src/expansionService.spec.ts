import { describe, it, expect, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import type { RowNode } from 'ag-grid-community';
import { ExpansionService } from './expansionService';

function makeGroupNode(overrides: Record<string, unknown> = {}): RowNode {
  return {
    group: true,
    level: 0,
    childrenAfterGroup: [],
    dispatchRowEvent: vi.fn(),
    ...overrides,
  } as unknown as RowNode;
}

function setup(rootNode?: RowNode) {
  const refreshModel = vi.fn();
  const rowModel = { getType: () => 'clientSide', rootNode, refreshModel };
  const harness = makeBeanHarness(ExpansionService, { beans: { rowModel } });
  return { ...harness, refreshModel };
}

describe('ExpansionService', () => {
  describe('isExpanded', () => {
    it('treats the root (level -1) as always expanded, otherwise reads _expanded', () => {
      const { bean, destroy } = setup();
      expect(bean.isExpanded(makeGroupNode({ level: -1 }))).toBe(true);
      expect(bean.isExpanded(makeGroupNode({ _expanded: true }))).toBe(true);
      expect(bean.isExpanded(makeGroupNode())).toBe(false);
      destroy();
    });
  });

  describe('isExpandable', () => {
    it('is expandable only for group nodes with children after grouping', () => {
      const { bean, destroy } = setup();
      expect(bean.isExpandable(makeGroupNode({ childrenAfterGroup: [{}] }))).toBe(true);
      expect(bean.isExpandable(makeGroupNode({ childrenAfterGroup: [] }))).toBe(false);
      expect(bean.isExpandable(makeGroupNode({ childrenAfterGroup: null }))).toBe(false);
      expect(bean.isExpandable(makeGroupNode({ group: false, childrenAfterGroup: [{}] }))).toBe(false);
      destroy();
    });
  });

  describe('setExpanded', () => {
    it('is a no-op when the node is already in the requested state', () => {
      const { bean, refreshModel, destroy } = setup(makeGroupNode());
      const node = makeGroupNode({ _expanded: true });
      bean.setExpanded(node, true);
      expect(node.dispatchRowEvent).not.toHaveBeenCalled();
      expect(refreshModel).not.toHaveBeenCalled();
      destroy();
    });

    it('sets expanded, dispatches expandedChanged and refreshes the model', () => {
      const { bean, refreshModel, destroy } = setup(makeGroupNode());
      const node = makeGroupNode({ _expanded: false });
      bean.setExpanded(node, true);
      expect(node.expanded).toBe(true);
      expect(node.dispatchRowEvent).toHaveBeenCalledWith('expandedChanged');
      expect(refreshModel).toHaveBeenCalledWith({ step: 'map' });
      destroy();
    });
  });

  describe('setExpansionState', () => {
    it('expands exactly the groups whose ids are in the state, then refreshes', () => {
      const a = makeGroupNode({ id: 'a' });
      const b = makeGroupNode({ id: 'b' });
      const root = makeGroupNode({ group: false, childrenAfterGroup: [a, b] });
      const { bean, refreshModel, destroy } = setup(root);

      bean.setExpansionState({ expandedRowGroupIds: ['a'] }, 'api');

      expect(a.expanded).toBe(true);
      expect(b.expanded).toBe(false);
      expect(refreshModel).toHaveBeenCalledWith({ step: 'map' });
      destroy();
    });

    it('collapses everything when the state has no ids', () => {
      const a = makeGroupNode({ id: 'a', expanded: true });
      const root = makeGroupNode({ group: false, childrenAfterGroup: [a] });
      const { bean, destroy } = setup(root);

      bean.setExpansionState({} as never, 'api');

      expect(a.expanded).toBe(false);
      destroy();
    });
  });

  describe('setDetailsExpansionState', () => {
    it('is a no-op (master/detail is out of scope)', () => {
      const { bean, refreshModel, destroy } = setup(makeGroupNode());
      expect(() => bean.setDetailsExpansionState({} as never)).not.toThrow();
      expect(refreshModel).not.toHaveBeenCalled();
      destroy();
    });
  });

  describe('getExpansionState', () => {
    it('collects ids of expanded groups, skipping groups without ids', () => {
      const a = makeGroupNode({ id: 'a', _expanded: true });
      const b = makeGroupNode({ _expanded: true });
      const c = makeGroupNode({ id: 'c', _expanded: false });
      const root = makeGroupNode({ group: false, childrenAfterGroup: [a, b, c] });
      const { bean, destroy } = setup(root);
      expect(bean.getExpansionState()).toEqual({ expandedRowGroupIds: ['a'] });
      destroy();
    });

    it('returns an empty state when there is no root node', () => {
      const { bean, destroy } = setup(undefined);
      expect(bean.getExpansionState()).toEqual({ expandedRowGroupIds: [] });
      destroy();
    });
  });

  describe('addExpandedCss', () => {
    it('pushes the expanded or contracted class for group rows only', () => {
      const { bean, destroy } = setup();
      const classes: string[] = [];
      bean.addExpandedCss(classes, makeGroupNode({ _expanded: true }));
      bean.addExpandedCss(classes, makeGroupNode({ _expanded: false }));
      bean.addExpandedCss(classes, makeGroupNode({ group: false }));
      expect(classes).toEqual(['ag-row-group-expanded', 'ag-row-group-contracted']);
      destroy();
    });
  });

  describe('getRowExpandedListeners', () => {
    it('returns inert listeners', () => {
      const { bean, destroy } = setup();
      const listeners = bean.getRowExpandedListeners({} as never);
      expect(() => {
        listeners.expandedChanged();
        listeners.hasChildrenChanged();
      }).not.toThrow();
      destroy();
    });
  });
});
