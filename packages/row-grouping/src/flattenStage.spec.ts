import { describe, it, expect, vi } from 'vitest';
import type { RowNode } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { FlattenStage } from './flattenStage';

function makeCsrm(rootNode: unknown) {
  return { getType: () => 'clientSide', rootNode };
}

function node(overrides: Record<string, unknown> = {}): RowNode {
  return { group: false, ...overrides } as unknown as RowNode;
}

interface HarnessOptions {
  rootNode?: unknown;
  gridOptions?: Record<string, unknown>;
  withFooterSvc?: boolean;
}

function harness({ rootNode, gridOptions = {}, withFooterSvc }: HarnessOptions = {}) {
  const footerSvc = { addTotalRows: vi.fn() };
  const { bean, ...rest } = makeBeanHarness(FlattenStage, {
    gridOptions,
    beans: {
      rowModel: makeCsrm(rootNode),
      ...(withFooterSvc ? { footerSvc } : {}),
    },
  });
  return { bean, footerSvc, ...rest };
}

describe('FlattenStage', () => {
  it('returns [] when there is no client-side row model or root node', () => {
    const noCsrm = makeBeanHarness(FlattenStage, {
      gridOptions: {},
      beans: { rowModel: { getType: () => 'serverSide' } },
    });
    expect(noCsrm.bean.execute()).toEqual([]);

    const noRoot = harness({ rootNode: undefined });
    expect(noRoot.bean.execute()).toEqual([]);
  });

  it('returns [] when the root has no children arrays at all', () => {
    const { bean } = harness({ rootNode: node() });
    expect(bean.execute()).toEqual([]);
  });

  it('flattens expanded groups depth-first, skipping collapsed subtrees', () => {
    const hiddenLeaf = node();
    const collapsed = node({ group: true, expanded: false, childrenAfterGroup: [hiddenLeaf] });
    const innerLeaf = node();
    const expanded = node({ group: true, expanded: true, childrenAfterGroup: [innerLeaf] });
    const topLeaf = node();
    const rootNode = node({ childrenAfterSort: [topLeaf, expanded, collapsed] });
    const { bean } = harness({ rootNode });

    expect(bean.execute()).toEqual([topLeaf, expanded, innerLeaf, collapsed]);
  });

  it('falls back through childrenAfterAggFilter/Filter/Group when no sort ran', () => {
    const viaAggFilter = node({ childrenAfterAggFilter: [node()] });
    const viaFilter = node({ childrenAfterFilter: [node()] });
    const viaGroup = node({ childrenAfterGroup: [node()] });
    for (const rootNode of [viaAggFilter, viaFilter, viaGroup]) {
      const { bean } = harness({ rootNode });
      expect(bean.execute().length).toBe(1);
    }
  });

  it('calls footerSvc around the whole list and around each expanded group', () => {
    const expanded = node({ group: true, expanded: true, childrenAfterGroup: [node()] });
    const collapsed = node({ group: true, expanded: false, childrenAfterGroup: [node()] });
    const rootNode = node({ childrenAfterSort: [expanded, collapsed] });
    const { bean, footerSvc } = harness({ rootNode, withFooterSvc: true });

    bean.execute();

    expect(footerSvc.addTotalRows).toHaveBeenCalledWith(0, rootNode, expect.any(Function), true, true, 'top');
    expect(footerSvc.addTotalRows).toHaveBeenCalledWith(3, rootNode, expect.any(Function), true, true, 'bottom');
    expect(footerSvc.addTotalRows).toHaveBeenCalledWith(1, expanded, expect.any(Function), true, false, 'top');
    expect(footerSvc.addTotalRows).toHaveBeenCalledWith(2, expanded, expect.any(Function), true, false, 'bottom');
    expect(footerSvc.addTotalRows).not.toHaveBeenCalledWith(
      expect.anything(),
      collapsed,
      expect.any(Function),
      true,
      false,
      expect.anything(),
    );
  });

  it('works without footerSvc', () => {
    const expanded = node({ group: true, expanded: true, childrenAfterGroup: [node()] });
    const rootNode = node({ childrenAfterSort: [expanded] });
    const { bean } = harness({ rootNode });
    expect(bean.execute()).toEqual([expanded, expanded.childrenAfterGroup![0]!]);
  });

  it('groupHideOpenParents hides an expanded group row but still flattens its children', () => {
    const innerLeaf = node();
    const expanded = node({ group: true, expanded: true, childrenAfterGroup: [innerLeaf] });
    const collapsed = node({ group: true, expanded: false, childrenAfterGroup: [node()] });
    const rootNode = node({ childrenAfterSort: [expanded, collapsed] });
    const { bean } = harness({ rootNode, gridOptions: { groupHideOpenParents: true } });

    expect(bean.execute()).toEqual([innerLeaf, collapsed]);
  });

  describe('groupHideParentOfSingleChild', () => {
    it('collapses a chain of single-child groups down to the leaf', () => {
      const leafChild = node();
      const innerGroup = node({ group: true, expanded: true, childrenAfterGroup: [leafChild] });
      const outerGroup = node({ group: true, expanded: true, childrenAfterSort: [innerGroup] });
      const rootNode = node({ childrenAfterSort: [outerGroup] });
      const { bean } = harness({
        rootNode,
        gridOptions: { groupHideParentOfSingleChild: true },
      });

      expect(bean.execute()).toEqual([leafChild]);
    });

    it('leafGroupsOnly keeps a group whose only child is itself a group', () => {
      const leafChild = node();
      const innerGroup = node({ group: true, expanded: true, childrenAfterGroup: [leafChild] });
      const outerGroup = node({ group: true, expanded: true, childrenAfterGroup: [innerGroup] });
      const rootNode = node({ childrenAfterSort: [outerGroup] });
      const { bean } = harness({
        rootNode,
        gridOptions: { groupHideParentOfSingleChild: 'leafGroupsOnly' },
      });

      // Outer kept (its only child is a group); inner collapses onto its leaf.
      expect(bean.execute()).toEqual([outerGroup, leafChild]);
    });

    it('keeps groups with more than one child', () => {
      const group = node({
        group: true,
        expanded: true,
        childrenAfterGroup: [node(), node()],
      });
      const rootNode = node({ childrenAfterSort: [group] });
      const { bean } = harness({
        rootNode,
        gridOptions: { groupHideParentOfSingleChild: true },
      });

      expect(bean.execute()!.length).toBe(3);
    });

    it('keeps a group with no children arrays', () => {
      const group = node({ group: true, expanded: true });
      const rootNode = node({ childrenAfterSort: [group] });
      const { bean } = harness({
        rootNode,
        gridOptions: { groupHideParentOfSingleChild: true },
      });

      expect(bean.execute()).toEqual([group]);
    });
  });
});
