import { describe, it, expect } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import type { AgColumn, IAggFuncParams, RowNode } from 'ag-grid-community';
import type { GridOptions } from 'ag-grid-community';
import { AggregationStage } from './aggregationStage';
import { AggFuncService } from './aggFuncService';

function leaf(value?: number): RowNode {
  return { group: false, childrenAfterGroup: null, value } as unknown as RowNode;
}

function group(children: RowNode[]): RowNode {
  return { group: true, childrenAfterGroup: children } as unknown as RowNode;
}

function root(children: RowNode[]): RowNode {
  return { group: false, level: -1, childrenAfterGroup: children } as unknown as RowNode;
}

function makeCol(colDef: Record<string, unknown>): AgColumn {
  return {
    aggregationActive: false,
    getColId: () => 'sales',
    getColDef: () => colDef,
    getAggFunc: () => null,
  } as unknown as AgColumn;
}

const sumCol = () => makeCol({ aggFunc: 'sum' });

interface SetupOptions {
  rootNode?: RowNode;
  cols?: AgColumn[];
  gridOptions?: Partial<GridOptions>;
  rowModelType?: string;
  aggFuncSvc?: unknown;
}

function setup({
  rootNode,
  cols = [],
  gridOptions = {},
  rowModelType = 'clientSide',
  aggFuncSvc,
}: SetupOptions = {}) {
  const rowModel = { getType: () => rowModelType, rootNode };
  const valueSvc = { getValue: (_col: unknown, node: { value?: unknown }) => node.value };
  return makeBeanHarness(AggregationStage, {
    gridOptions,
    beans: {
      rowModel,
      colModel: { getCols: () => cols },
      valueSvc,
      ...(aggFuncSvc ? { aggFuncSvc } : {}),
    },
  });
}

function realAggFuncs() {
  return makeBeanHarness(AggFuncService, { gridOptions: {} }).bean;
}

describe('AggregationStage', () => {
  describe('execute', () => {
    it('does nothing when there is no client-side root node', () => {
      const { bean, destroy } = setup({ rowModelType: 'serverSide', cols: [sumCol()] });
      expect(() => bean.execute(undefined)).not.toThrow();
      destroy();
    });

    it('does nothing when there are no value columns and no getGroupRowAgg', () => {
      const g = group([leaf(10)]);
      const r = root([g]);
      const { bean, destroy } = setup({ rootNode: r, cols: [] });
      bean.execute(undefined);
      expect(g.aggData).toBeUndefined();
      destroy();
    });

    it('aggregates group nodes and skips the root by default', () => {
      const g = group([leaf(10), leaf(20)]);
      const r = root([g]);
      const { bean, destroy } = setup({ rootNode: r, cols: [sumCol()], aggFuncSvc: realAggFuncs() });
      bean.execute(undefined);
      expect(g.aggData?.['sales']).toBe(30);
      expect(r.aggData).toBeUndefined();
      destroy();
    });

    it('aggregates the root when alwaysAggregateAtRootLevel is set, using child group results', () => {
      const g = group([leaf(10), leaf(20)]);
      const r = root([g]);
      const { bean, destroy } = setup({
        rootNode: r,
        cols: [sumCol()],
        gridOptions: { alwaysAggregateAtRootLevel: true },
        aggFuncSvc: realAggFuncs(),
      });
      bean.execute(undefined);
      expect(r.aggData?.['sales']).toBe(30);
      destroy();
    });

    it('aggregates the root when a grand total row is configured', () => {
      const g = group([leaf(5)]);
      const r = root([g]);
      const { bean, destroy } = setup({
        rootNode: r,
        cols: [sumCol()],
        gridOptions: { grandTotalRow: 'bottom' },
        aggFuncSvc: realAggFuncs(),
      });
      bean.execute(undefined);
      expect(r.aggData?.['sales']).toBe(5);
      destroy();
    });

    it('skips non-group, non-root nodes that carry children', () => {
      const inner = { group: false, childrenAfterGroup: [leaf(99)] } as unknown as RowNode;
      const g = group([leaf(10), inner]);
      const r = root([g]);
      const { bean, destroy } = setup({ rootNode: r, cols: [sumCol()], aggFuncSvc: realAggFuncs() });
      bean.execute(undefined);
      expect(inner.aggData).toBeUndefined();
      expect(g.aggData?.['sales']).toBe(10);
      destroy();
    });

    it('uses a truthy getGroupRowAgg result instead of column aggregation', () => {
      const g = group([leaf(10)]);
      const r = root([g]);
      const { bean, destroy } = setup({
        rootNode: r,
        cols: [],
        gridOptions: { getGroupRowAgg: () => ({ total: 7 }) },
      });
      bean.execute(undefined);
      expect(g.aggData?.['total']).toBe(7);
      expect(g.aggData?.['sales']).toBeUndefined();
      destroy();
    });

    it('falls through to column aggregation when getGroupRowAgg returns a falsy value', () => {
      const g = group([leaf(10), leaf(20)]);
      const r = root([g]);
      const { bean, destroy } = setup({
        rootNode: r,
        cols: [sumCol()],
        gridOptions: { getGroupRowAgg: () => null },
        aggFuncSvc: realAggFuncs(),
      });
      bean.execute(undefined);
      expect(g.aggData?.['sales']).toBe(30);
      destroy();
    });

    it('supports a function-form aggFunc from the colDef', () => {
      const g = group([leaf(1), leaf(2)]);
      const r = root([g]);
      const fnCol = makeCol({ aggFunc: (params: IAggFuncParams) => params.values.length });
      const { bean, destroy } = setup({ rootNode: r, cols: [fnCol] });
      bean.execute(undefined);
      expect(g.aggData?.['sales']).toBe(2);
      destroy();
    });

    it('leaves the column unset when a string aggFunc cannot be resolved', () => {
      const g = group([leaf(1)]);
      const r = root([g]);
      const { bean, destroy } = setup({
        rootNode: r,
        cols: [makeCol({ aggFunc: 'missing' })],
        aggFuncSvc: { getAggFunc: () => undefined },
      });
      bean.execute(undefined);
      expect(g.aggData?.['sales']).toBeUndefined();
      destroy();
    });

    it('leaves the column unset when the resolved choice is neither a function nor a string', () => {
      const g = group([leaf(1)]);
      const r = root([g]);
      const { bean, destroy } = setup({ rootNode: r, cols: [makeCol({ aggFunc: 123 })] });
      bean.execute(undefined);
      expect(g.aggData?.['sales']).toBeUndefined();
      destroy();
    });
  });

  describe('aggregateRootOnly', () => {
    it('re-aggregates only the root over its filtered children', () => {
      const r = {
        group: false,
        level: -1,
        childrenAfterAggFilter: [leaf(10), leaf(20)],
      } as unknown as RowNode;
      const { bean, destroy } = setup({ rootNode: r, cols: [sumCol()], aggFuncSvc: realAggFuncs() });
      bean.aggregateRootOnly();
      expect(r.aggData?.['sales']).toBe(30);
      destroy();
    });

    it('does nothing when the root has no children', () => {
      const r = { group: false, level: -1 } as unknown as RowNode;
      const { bean, destroy } = setup({ rootNode: r, cols: [sumCol()], aggFuncSvc: realAggFuncs() });
      bean.aggregateRootOnly();
      expect(r.aggData).toBeUndefined();
      destroy();
    });

    it('does nothing without a client-side root node', () => {
      const { bean, destroy } = setup({ rowModelType: 'serverSide', cols: [sumCol()] });
      expect(() => bean.aggregateRootOnly()).not.toThrow();
      destroy();
    });
  });

  describe('aggregateNodeOver', () => {
    it('aggregates an explicit child set', () => {
      const node = { group: true } as unknown as RowNode;
      const { bean, destroy } = setup({ cols: [sumCol()], aggFuncSvc: realAggFuncs() });
      bean.aggregateNodeOver(node, [leaf(5), leaf(7)]);
      expect(node.aggData?.['sales']).toBe(12);
      destroy();
    });

    it('does nothing when there are no value columns', () => {
      const node = { group: true } as unknown as RowNode;
      const { bean, destroy } = setup({ cols: [] });
      bean.aggregateNodeOver(node, [leaf(5)]);
      expect(node.aggData).toBeUndefined();
      destroy();
    });
  });
});
