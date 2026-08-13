import { describe, it, expect, vi } from 'vitest';
import type { RowNode } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { FilterAggregateStage } from './filterAggregateStage';

function makeCsrm(rootNode: unknown, hierarchical?: boolean) {
  const csrm: Record<string, unknown> = { getType: () => 'clientSide', rootNode };
  if (hierarchical !== undefined) csrm.hierarchical = hierarchical;
  return csrm;
}

function node(overrides: Record<string, unknown> = {}): RowNode {
  return { group: true, childrenAfterGroup: null, ...overrides } as unknown as RowNode;
}

interface HarnessOptions {
  rootNode?: unknown;
  hierarchical?: boolean;
  gridOptions?: Record<string, unknown>;
  withAggStage?: boolean;
}

function harness({ rootNode, hierarchical, gridOptions = {}, withAggStage }: HarnessOptions = {}) {
  const aggStage = { aggregateNodeOver: vi.fn() };
  const { bean, ...rest } = makeBeanHarness(FilterAggregateStage, {
    gridOptions,
    beans: {
      rowModel: makeCsrm(rootNode, hierarchical),
      ...(withAggStage ? { aggStage } : {}),
    },
  });
  return { bean, aggStage, ...rest };
}

describe('FilterAggregateStage', () => {
  it('no-ops when there is no client-side row model or root node', () => {
    const noCsrm = makeBeanHarness(FilterAggregateStage, {
      gridOptions: {},
      beans: { rowModel: { getType: () => 'serverSide' } },
    });
    expect(() => noCsrm.bean.execute(undefined)).not.toThrow();

    const noRoot = harness({ rootNode: undefined });
    expect(() => noRoot.bean.execute(undefined)).not.toThrow();
  });

  it('defaults to hierarchical traversal when csrm.hierarchical is unset', () => {
    const leaf = node({ group: false });
    const child = node({ childrenAfterGroup: [leaf] });
    const rootNode = node({ childrenAfterGroup: [child] });
    const { bean } = harness({ rootNode, hierarchical: undefined });

    bean.execute(undefined);

    expect(child.childrenAfterAggFilter).toBe(child.childrenAfterGroup);
    expect(rootNode.childrenAfterAggFilter).toBe(rootNode.childrenAfterGroup);
  });

  it('skips nodes without childrenAfterGroup', () => {
    const rootNode = node();
    delete (rootNode as Record<string, unknown>).childrenAfterGroup;
    const { bean } = harness({ rootNode, hierarchical: false });

    bean.execute(undefined);

    expect(rootNode.childrenAfterAggFilter).toBeUndefined();
  });

  it('sets childrenAfterAggFilter from childrenAfterFilter, else the full child set', () => {
    const leaf = node({ group: false });
    const trimmed = node({ childrenAfterGroup: [leaf, node({ group: false })], childrenAfterFilter: [leaf] });
    const untouched = node({ childrenAfterGroup: [node({ group: false })] });
    const rootNode = node({ childrenAfterGroup: [trimmed, untouched] });
    const { bean } = harness({ rootNode });

    bean.execute(undefined);

    expect(trimmed.childrenAfterAggFilter).toBe(trimmed.childrenAfterFilter);
    expect(untouched.childrenAfterAggFilter).toBe(untouched.childrenAfterGroup);
    expect(rootNode.childrenAfterAggFilter).toBe(rootNode.childrenAfterGroup);
  });

  it('does not re-aggregate without suppressAggFilteredOnly', () => {
    const leaf = node({ group: false });
    const trimmed = node({ childrenAfterGroup: [leaf, node({ group: false })], childrenAfterFilter: [leaf] });
    const rootNode = node({ childrenAfterGroup: [trimmed] });
    const { bean, aggStage } = harness({ rootNode, withAggStage: true });

    bean.execute(undefined);

    expect(aggStage.aggregateNodeOver).not.toHaveBeenCalled();
  });

  it('re-aggregates only filter-trimmed groups over their full child set', () => {
    const leaf = node({ group: false });
    const trimmed = node({ childrenAfterGroup: [leaf, node({ group: false })], childrenAfterFilter: [leaf] });
    const sameLength = node({
      childrenAfterGroup: [node({ group: false })],
      childrenAfterFilter: [node({ group: false })],
    });
    const rootNode = node({ childrenAfterGroup: [trimmed, sameLength] });
    const { bean, aggStage } = harness({
      rootNode,
      gridOptions: { suppressAggFilteredOnly: true },
      withAggStage: true,
    });

    bean.execute(undefined);

    expect(aggStage.aggregateNodeOver).toHaveBeenCalledTimes(1);
    expect(aggStage.aggregateNodeOver).toHaveBeenCalledWith(trimmed, trimmed.childrenAfterGroup);
  });

  it('suppressAggFilteredOnly without an aggStage bean does nothing extra', () => {
    const leaf = node({ group: false });
    const trimmed = node({ childrenAfterGroup: [leaf, node({ group: false })], childrenAfterFilter: [leaf] });
    const rootNode = node({ childrenAfterGroup: [trimmed] });
    const { bean } = harness({
      rootNode,
      gridOptions: { suppressAggFilteredOnly: true },
    });

    bean.execute(undefined);

    expect(trimmed.childrenAfterAggFilter).toBe(trimmed.childrenAfterFilter);
  });
});
