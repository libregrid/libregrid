import { describe, it, expect, vi } from 'vitest';
import type { RowNode } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { GroupFilterStage } from './groupFilterStage';

function makeCsrm(rootNode: unknown) {
  return { getType: () => 'clientSide', rootNode };
}

function node(overrides: Record<string, unknown> = {}): RowNode {
  return { group: false, ...overrides } as unknown as RowNode;
}

function makeFilterManager(overrides: Record<string, unknown> = {}) {
  return {
    isAnyFilterPresent: () => true,
    doesRowPassFilter: vi.fn(() => true),
    doesRowPassAggregateFilters: vi.fn(() => true),
    ...overrides,
  };
}

interface HarnessOptions {
  rootNode?: unknown;
  filterManager?: unknown;
  gridOptions?: Record<string, unknown>;
}

function harness({ rootNode, filterManager, gridOptions = {} }: HarnessOptions = {}) {
  return makeBeanHarness(GroupFilterStage, {
    gridOptions,
    beans: {
      rowModel: makeCsrm(rootNode),
      ...(filterManager ? { filterManager } : {}),
    },
  });
}

describe('GroupFilterStage', () => {
  it('no-ops when there is no client-side row model or root node', () => {
    const noCsrm = makeBeanHarness(GroupFilterStage, {
      gridOptions: {},
      beans: { rowModel: { getType: () => 'serverSide' } },
    });
    expect(() => noCsrm.bean.execute(undefined)).not.toThrow();

    const noRoot = harness({ rootNode: undefined });
    expect(() => noRoot.bean.execute(undefined)).not.toThrow();
  });

  it('carries children through untouched when no filter manager or no active filter', () => {
    const child = node();
    const rootNode = node({ childrenAfterGroup: [child] });

    const noFm = harness({ rootNode });
    noFm.bean.execute(undefined);
    expect(rootNode.childrenAfterFilter).toEqual([child]);

    const inactive = harness({
      rootNode,
      filterManager: makeFilterManager({ isAnyFilterPresent: () => false }),
    });
    inactive.bean.execute(undefined);
    expect(rootNode.childrenAfterFilter).toEqual([child]);
  });

  it('treats missing childrenAfterGroup as an empty child list', () => {
    const rootNode = node();
    const { bean } = harness({ rootNode, filterManager: makeFilterManager() });

    bean.execute(undefined);

    expect(rootNode.childrenAfterFilter).toEqual([]);
  });

  it('keeps groups with surviving descendants, drops empty ones and failing leaves', () => {
    const passingLeaf = node();
    const failingLeaf = node();
    const survivor = node({ group: true, childrenAfterGroup: [passingLeaf, failingLeaf] });
    const doomed = node({ group: true, childrenAfterGroup: [node()] });
    const rootNode = node({ childrenAfterGroup: [survivor, doomed, failingLeaf] });
    const fm = makeFilterManager({
      doesRowPassFilter: vi.fn((row: RowNode) => row === passingLeaf),
    });
    const { bean } = harness({ rootNode, filterManager: fm });

    bean.execute(undefined);

    expect(rootNode.childrenAfterFilter).toEqual([survivor]);
    expect(survivor.childrenAfterFilter).toEqual([passingLeaf]);
    expect(doomed.childrenAfterFilter).toEqual([]);
  });

  it('a leaf must pass both the child and aggregate filter buckets', () => {
    const leafA = node();
    const rootNode = node({ childrenAfterGroup: [leafA] });
    const fm = makeFilterManager({
      doesRowPassAggregateFilters: vi.fn(() => false),
    });
    const { bean } = harness({ rootNode, filterManager: fm });

    bean.execute(undefined);

    expect(rootNode.childrenAfterFilter).toEqual([]);
  });

  it('groupAggFiltering: a group passing aggregate filters keeps its whole subtree', () => {
    const leafA = node();
    const leafB = node();
    const group = node({ group: true, childrenAfterGroup: [leafA, leafB] });
    const rootNode = node({ childrenAfterGroup: [group] });
    const fm = makeFilterManager({
      doesRowPassFilter: vi.fn(() => false),
      doesRowPassAggregateFilters: vi.fn(({ rowNode }: { rowNode: RowNode }) => rowNode === group),
    });
    const { bean } = harness({
      rootNode,
      filterManager: fm,
      gridOptions: { groupAggFiltering: true },
    });

    bean.execute(undefined);

    expect(rootNode.childrenAfterFilter).toEqual([group]);
    expect(group.childrenAfterFilter).toBe(group.childrenAfterGroup);
  });

  it('groupAggFiltering: a group failing aggregate filters falls through to leaf filtering', () => {
    const passingLeaf = node();
    const group = node({ group: true, childrenAfterGroup: [passingLeaf] });
    const rootNode = node({ childrenAfterGroup: [group] });
    const fm = makeFilterManager({
      doesRowPassFilter: vi.fn(() => true),
      doesRowPassAggregateFilters: vi.fn(({ rowNode }: { rowNode: RowNode }) => rowNode === passingLeaf),
    });
    const { bean } = harness({
      rootNode,
      filterManager: fm,
      gridOptions: { groupAggFiltering: true },
    });

    bean.execute(undefined);

    expect(rootNode.childrenAfterFilter).toEqual([group]);
    expect(group.childrenAfterFilter).toEqual([passingLeaf]);
  });
});
