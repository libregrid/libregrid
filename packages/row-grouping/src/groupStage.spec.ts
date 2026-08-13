import { describe, it, expect, vi } from 'vitest';
import type { AgColumn, RefreshModelParams, RowNode } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { GroupStage } from './groupStage';

function makeCsrm(rootNode: unknown, overrides: Record<string, unknown> = {}) {
  return {
    getType: () => 'clientSide',
    rootNode,
    refreshModel: vi.fn(),
    ...overrides,
  };
}

function makeCol(overrides: Record<string, unknown> = {}): AgColumn {
  const colDef = { field: 'country', ...(overrides.colDef as Record<string, unknown>) };
  return {
    getColId: () => 'country',
    getColDef: () => colDef,
    rowGroupActive: true,
    ...overrides,
  } as unknown as AgColumn;
}

function leaf(data: Record<string, unknown>): RowNode {
  return { data } as unknown as RowNode;
}

const PARAMS = {} as RefreshModelParams;

interface HarnessOptions {
  rootNode?: unknown;
  gridOptions?: Record<string, unknown>;
  rowGroupColsSvc?: unknown;
  colModel?: unknown;
  csrmOverrides?: Record<string, unknown>;
  serverSide?: boolean;
}

function harness({
  rootNode,
  gridOptions = {},
  rowGroupColsSvc,
  colModel = { getCols: () => [] },
  csrmOverrides,
  serverSide,
}: HarnessOptions = {}) {
  const csrm = serverSide
    ? { getType: () => 'serverSide' }
    : makeCsrm(rootNode, csrmOverrides);
  const { bean, ...rest } = makeBeanHarness(GroupStage, {
    gridOptions,
    beans: {
      rowModel: csrm,
      colModel,
      ...(rowGroupColsSvc === undefined ? {} : { rowGroupColsSvc }),
    },
  });
  return { bean, csrm, ...rest };
}

describe('GroupStage', () => {
  it('execute returns undefined when there is no client-side row model or root node', () => {
    const noCsrm = harness({ serverSide: true });
    expect(noCsrm.bean.execute(PARAMS)).toBeUndefined();

    const noRoot = harness({ rootNode: undefined });
    expect(noRoot.bean.execute(PARAMS)).toBeUndefined();
  });

  describe('no row-group columns', () => {
    it('flattens to allLeafChildren and marks the model non-hierarchical', () => {
      const leaves = [leaf({ country: 'US' }), leaf({ country: 'UK' })];
      const rootNode = { allLeafChildren: leaves } as unknown as RowNode;
      const { bean, csrm } = harness({ rootNode });

      expect(bean.execute(PARAMS)).toBeUndefined();

      expect(csrm.hierarchical).toBe(false);
      expect(rootNode.childrenAfterGroup).toBe(leaves);
      expect(rootNode.allChildrenCount).toBe(2);
    });

    it('handles missing allLeafChildren with a zero count', () => {
      const rootNode = {} as unknown as RowNode;
      const { bean } = harness({ rootNode });

      bean.execute(PARAMS);

      expect(rootNode.childrenAfterGroup).toBeUndefined();
      expect(rootNode.allChildrenCount).toBe(0);
    });

    it('falls back to colModel columns with rowGroupActive or colDef.rowGroup', () => {
      const active = makeCol();
      const viaColDef = makeCol({
        getColId: () => 'city',
        colDef: { field: 'city', rowGroup: true },
        rowGroupActive: false,
      });
      const plain = makeCol({
        getColId: () => 'sales',
        colDef: { field: 'sales' },
        rowGroupActive: false,
      });
      const rootNode = {
        allLeafChildren: [leaf({ city: 'NY' }), leaf({ city: 'SF' })],
      } as unknown as RowNode;
      const { bean, csrm } = harness({
        rootNode,
        rowGroupColsSvc: { columns: [] },
        colModel: { getCols: () => [active, viaColDef, plain] },
      });

      // `active` wins (svc returns [] so colModel filter runs, active col first).
      expect(bean.execute(PARAMS)).toBe(true);
      expect(csrm.hierarchical).toBe(true);
      const groups = rootNode.childrenAfterGroup!;
      expect(groups.map((g) => g.field)).toEqual(['country']);
    });

    it('treats colModel.getCols() returning undefined as no columns', () => {
      const rootNode = { allLeafChildren: [leaf({})] } as unknown as RowNode;
      const { bean, csrm } = harness({
        rootNode,
        rowGroupColsSvc: { columns: [] },
        colModel: { getCols: () => undefined },
      });

      expect(bean.execute(PARAMS)).toBeUndefined();
      expect(csrm.hierarchical).toBe(false);
    });
  });

  describe('grouping', () => {
    const rootWithLeaves = (leaves: RowNode[]) =>
      ({ allLeafChildren: leaves }) as unknown as RowNode;
    const svc = { columns: [makeCol()] };

    it('builds a single-level tree from rowGroupColsSvc columns', () => {
      const rootNode = rootWithLeaves([
        leaf({ country: 'US' }),
        leaf({ country: 'US' }),
        leaf({ country: 'UK' }),
      ]);
      const { bean, csrm } = harness({ rootNode, rowGroupColsSvc: svc });

      expect(bean.execute(PARAMS)).toBe(true);
      expect(csrm.hierarchical).toBe(true);

      const groups = rootNode.childrenAfterGroup!;
      expect(groups.map((g) => g.key)).toEqual(['US', 'UK']);
      expect(groups[0]!.allChildrenCount).toBe(2);
      expect(rootNode.allChildrenCount).toBe(3);
      expect(groups[0]!.firstChild).toBe(true);
      expect(groups[1]!.lastChild).toBe(true);
      expect(groups[1]!.childIndex).toBe(1);
      expect(groups[0]!.childrenAfterGroup![0]!.parent).toBe(groups[0]);

      expect(bean.getNonLeaf(groups[0]!.id!)).toBe(groups[0]);
      expect(bean.getNonLeaf('nope')).toBeUndefined();
    });

    it('uses the colId as field when the colDef has none', () => {
      const colNoField = makeCol({ getColId: () => 'nation', colDef: { field: undefined } });
      const rootNode = rootWithLeaves([leaf({ nation: 'US' })]);
      const { bean } = harness({
        rootNode,
        rowGroupColsSvc: { columns: [colNoField] },
      });

      bean.execute(PARAMS);

      expect(rootNode.childrenAfterGroup![0]!.field).toBe('nation');
      expect(rootNode.childrenAfterGroup![0]!.key).toBe('US');
    });

    it('builds an empty tree when allLeafChildren is missing', () => {
      const rootNode = {} as unknown as RowNode;
      const { bean, csrm } = harness({ rootNode, rowGroupColsSvc: svc });

      expect(bean.execute(PARAMS)).toBe(true);
      expect(csrm.hierarchical).toBe(true);
      expect(rootNode.childrenAfterGroup).toEqual([]);
      expect(rootNode.allChildrenCount).toBe(0);
    });

    it('prefixes group ids with the root node id when present', () => {
      const rootNode = { id: 'myRoot', allLeafChildren: [leaf({ country: 'US' })] } as unknown as RowNode;
      const { bean } = harness({ rootNode, rowGroupColsSvc: svc });

      bean.execute(PARAMS);

      expect(rootNode.childrenAfterGroup![0]!.id).toBe('myRoot-country-US');
    });

    it('expands per groupDefaultExpanded: -1, a numeric depth, or not at all', () => {
      for (const [option, expected] of [
        [-1, true],
        [1, true],
        [0, false],
        [undefined, false],
      ] as const) {
        const rootNode = rootWithLeaves([leaf({ country: 'US' })]);
        const { bean } = harness({
          rootNode,
          rowGroupColsSvc: svc,
          gridOptions: option === undefined ? {} : { groupDefaultExpanded: option },
        });
        bean.execute(PARAMS);
        expect(rootNode.childrenAfterGroup![0]!.expanded).toBe(expected);
      }
    });

    it('expands only levels below a numeric groupDefaultExpanded', () => {
      const cols = [
        makeCol(),
        makeCol({ getColId: () => 'city', colDef: { field: 'city' } }),
      ];
      const rootNode = rootWithLeaves([leaf({ country: 'US', city: 'NY' })]);
      const { bean } = harness({
        rootNode,
        rowGroupColsSvc: { columns: cols },
        gridOptions: { groupDefaultExpanded: 1 },
      });

      bean.execute(PARAMS);

      const top = rootNode.childrenAfterGroup![0]!;
      expect(top.expanded).toBe(true);
      expect(top.childrenAfterGroup![0]!.expanded).toBe(false);
    });

    it('isGroupOpenByDefault takes priority over groupDefaultExpanded', () => {
      const isGroupOpenByDefault = vi.fn(() => true);
      const rootNode = rootWithLeaves([leaf({ country: 'US' })]);
      const { bean } = harness({
        rootNode,
        rowGroupColsSvc: svc,
        gridOptions: { groupDefaultExpanded: 0, isGroupOpenByDefault },
      });

      bean.execute(PARAMS);

      expect(rootNode.childrenAfterGroup![0]!.expanded).toBe(true);
      expect(isGroupOpenByDefault).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'US', field: 'country', level: 0 }),
      );
    });

    it('groupAllowUnbalanced attaches rows without a value directly to the parent', () => {
      const rootNode = rootWithLeaves([
        leaf({ country: 'US' }),
        leaf({ country: null }),
        leaf({ country: '' }),
      ]);
      const { bean } = harness({
        rootNode,
        rowGroupColsSvc: svc,
        gridOptions: { groupAllowUnbalanced: true },
      });

      bean.execute(PARAMS);

      const children = rootNode.childrenAfterGroup!;
      expect(children.length).toBe(3);
      expect(children[0]!.group).toBe(true);
      expect(children[1]!.group).toBeUndefined();
      expect(children[1]!.parent).toBe(rootNode);
      expect(children[2]!.level).toBe(0);
    });

    it('without groupAllowUnbalanced, blank values join a (Blanks)-style bucket', () => {
      const rootNode = rootWithLeaves([leaf({ country: null }), leaf({ country: 'US' })]);
      const { bean } = harness({ rootNode, rowGroupColsSvc: svc });

      bean.execute(PARAMS);

      expect(rootNode.childrenAfterGroup!.map((g) => g.key)).toEqual(['', 'US']);
    });

    it('orders groups via initialGroupOrderComparator', () => {
      const rootNode = rootWithLeaves([
        leaf({ country: 'US' }),
        leaf({ country: 'UK' }),
      ]);
      const { bean } = harness({
        rootNode,
        rowGroupColsSvc: svc,
        gridOptions: {
          initialGroupOrderComparator: (p: { nodeA: RowNode; nodeB: RowNode }) =>
            (p.nodeB.key ?? '').localeCompare(p.nodeA.key ?? ''),
        },
      });

      bean.execute(PARAMS);

      expect(rootNode.childrenAfterGroup!.map((g) => g.key)).toEqual(['US', 'UK']);
    });
  });

  describe('small surface methods', () => {
    it('extractData returns an empty array', () => {
      const { bean } = harness({});
      expect(bean.extractData()).toEqual([]);
    });

    it('getNestedDataGetter / onPropChange / clearNonLeafs are inert', () => {
      const { bean } = harness({});
      expect(bean.getNestedDataGetter()).toBeUndefined();
      expect(bean.onPropChange(new Set())).toBe(false);
      expect(() => bean.clearNonLeafs()).not.toThrow();
    });

    it('loadGroupData returns null for leaves and the group data for groups', () => {
      const { bean } = harness({});
      expect(bean.loadGroupData({ group: false } as unknown as RowNode)).toBeNull();
      const group = { group: true, _groupData: { country: 'US' } } as unknown as RowNode;
      expect(bean.loadGroupData(group)).toEqual({ country: 'US' });
      expect(bean.loadGroupData({ group: true } as unknown as RowNode)).toBeNull();
    });

    it('loadLeafs flattens nested groups and handles missing children', () => {
      const { bean } = harness({});
      const leafA = { group: false } as unknown as RowNode;
      const leafB = { group: false } as unknown as RowNode;
      const emptyGroup = { group: true, childrenAfterGroup: null } as unknown as RowNode;
      const inner = {
        group: true,
        childrenAfterGroup: [leafB],
      } as unknown as RowNode;
      const root = {
        group: true,
        childrenAfterGroup: [leafA, inner, emptyGroup],
      } as unknown as RowNode;

      expect(bean.loadLeafs(root)).toEqual([leafA, leafB]);
      expect(bean.loadLeafs({ group: true } as unknown as RowNode)).toBeNull();
    });

    it('invalidateGroupCols refreshes the model at the group step when a csrm exists', () => {
      const withCsrm = harness({ rootNode: {} });
      withCsrm.bean.invalidateGroupCols();
      expect(withCsrm.csrm.refreshModel).toHaveBeenCalledWith({ step: 'group' });

      const withoutCsrm = harness({ serverSide: true });
      expect(() => withoutCsrm.bean.invalidateGroupCols()).not.toThrow();
    });
  });
});
