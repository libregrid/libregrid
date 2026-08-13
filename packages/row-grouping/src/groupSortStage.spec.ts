import { describe, it, expect, vi } from 'vitest';
import type { RowNode, SortOption } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { GroupSortStage } from './groupSortStage';

function makeCsrm(rootNode: unknown) {
  return { getType: () => 'clientSide', rootNode };
}

function makeChild(overrides: Record<string, unknown> = {}): RowNode {
  return {
    group: false,
    dispatchRowEvent: vi.fn(),
    ...overrides,
  } as unknown as RowNode;
}

interface HarnessOptions {
  rootNode?: unknown;
  sortOptions?: SortOption[] | undefined;
  noSortSvc?: boolean;
  noSorter?: boolean;
  gridOptions?: Record<string, unknown>;
}

function harness({ rootNode, sortOptions, noSortSvc, noSorter, gridOptions }: HarnessOptions = {}) {
  const doFullSortInPlace = vi.fn((rows: RowNode[]) => rows.slice().reverse());
  return {
    ...makeBeanHarness(GroupSortStage, {
      gridOptions: gridOptions ?? {},
      beans: {
        rowModel: makeCsrm(rootNode),
        ...(noSortSvc ? {} : { sortSvc: { getSortOptions: () => sortOptions } }),
        ...(noSorter ? {} : { rowNodeSorter: { doFullSortInPlace } }),
      },
    }),
    doFullSortInPlace,
  };
}

describe('GroupSortStage', () => {
  it('no-ops when there is no client-side row model or no root node', () => {
    const a = makeBeanHarness(GroupSortStage, {
      gridOptions: {},
      beans: { rowModel: { getType: () => 'serverSide' } },
    });
    expect(() => a.bean.execute(undefined, undefined)).not.toThrow();

    const { bean } = harness({ rootNode: undefined });
    expect(() => bean.execute(undefined, undefined)).not.toThrow();
  });

  it('leaves a level without childrenAfterAggFilter untouched; postSortRows gets []', () => {
    const postSortRows = vi.fn();
    const rootNode = makeChild();
    const { bean } = harness({ rootNode, gridOptions: { postSortRows } });

    bean.execute(undefined, undefined);

    expect(rootNode.childrenAfterSort).toBeUndefined();
    expect(postSortRows).toHaveBeenCalledWith(expect.objectContaining({ nodes: [] }));
  });

  it('carries childrenAfterAggFilter through unchanged and stamps position flags', () => {
    const first = makeChild({ firstChild: true, lastChild: false, childIndex: 0 });
    const second = makeChild();
    const rootNode = makeChild({ childrenAfterAggFilter: [first, second] });
    const postSortRows = vi.fn();
    const { bean } = harness({ rootNode, sortOptions: [], gridOptions: { postSortRows } });

    bean.execute(undefined, undefined);

    expect(rootNode.childrenAfterSort).toEqual([first, second]);
    expect(rootNode.childrenAfterSort).not.toBe(rootNode.childrenAfterAggFilter);
    // `first` already had correct flags -> no dispatch; `second` had none -> all three fire.
    expect(first.dispatchRowEvent).not.toHaveBeenCalled();
    expect(second.dispatchRowEvent).toHaveBeenCalledWith('firstChildChanged');
    expect(second.dispatchRowEvent).toHaveBeenCalledWith('lastChildChanged');
    expect(second.dispatchRowEvent).toHaveBeenCalledWith('childIndexChanged');
    expect(second.firstChild).toBe(false);
    expect(second.lastChild).toBe(true);
    expect(second.childIndex).toBe(1);
    expect(postSortRows).toHaveBeenCalledWith(
      expect.objectContaining({ nodes: [first, second] }),
    );
  });

  it('sorts via rowNodeSorter when sort options exist, recursing into child groups', () => {
    const grandchild = makeChild();
    const childGroup = makeChild({ group: true, childrenAfterAggFilter: [grandchild] });
    const rootNode = makeChild({ childrenAfterAggFilter: [makeChild(), childGroup] });
    const { bean, doFullSortInPlace } = harness({
      rootNode,
      sortOptions: [{ colId: 'sales', sort: 'asc' } as SortOption],
    });

    bean.execute(undefined, undefined);

    expect(doFullSortInPlace).toHaveBeenCalledTimes(2);
    expect(rootNode.childrenAfterSort).toEqual([childGroup, expect.anything()]);
    expect(childGroup.childrenAfterSort).toEqual([grandchild]);
  });

  it('falls back to a plain copy when sortSvc is absent or returns no options', () => {
    const child = makeChild();
    const rootNode = makeChild({ childrenAfterAggFilter: [child] });

    const noSvc = harness({ rootNode, noSortSvc: true });
    noSvc.bean.execute(undefined, undefined);
    expect(rootNode.childrenAfterSort).toEqual([child]);
    expect(noSvc.doFullSortInPlace).not.toHaveBeenCalled();

    const undefinedOptions = harness({ rootNode, sortOptions: undefined });
    undefinedOptions.bean.execute(undefined, undefined);
    expect(undefinedOptions.doFullSortInPlace).not.toHaveBeenCalled();
  });

  it('falls back to a plain copy when options exist but rowNodeSorter is missing', () => {
    const child = makeChild();
    const rootNode = makeChild({ childrenAfterAggFilter: [child] });
    const { bean, doFullSortInPlace } = harness({
      rootNode,
      sortOptions: [{ colId: 'sales', sort: 'asc' } as SortOption],
      noSorter: true,
    });

    bean.execute(undefined, undefined);

    expect(doFullSortInPlace).not.toHaveBeenCalled();
    expect(rootNode.childrenAfterSort).toEqual([child]);
  });

  it('does not recurse into non-group children', () => {
    const leaf = makeChild();
    const rootNode = makeChild({ childrenAfterAggFilter: [leaf] });
    const { bean } = harness({ rootNode, sortOptions: [] });

    bean.execute(undefined, undefined);

    expect(leaf.childrenAfterSort).toBeUndefined();
  });

  it('syncs childrenAfterSort onto node siblings at every sorted level', () => {
    const childSibling = makeChild();
    const childGroup = makeChild({
      group: true,
      childrenAfterAggFilter: [makeChild()],
      sibling: childSibling,
    });
    const rootSibling = makeChild();
    const rootNode = makeChild({ childrenAfterAggFilter: [childGroup], sibling: rootSibling });
    const { bean } = harness({ rootNode, sortOptions: [] });

    bean.execute(undefined, undefined);

    expect(rootSibling.childrenAfterSort).toBe(rootNode.childrenAfterSort);
    expect(childSibling.childrenAfterSort).toBe(childGroup.childrenAfterSort);
  });
});
