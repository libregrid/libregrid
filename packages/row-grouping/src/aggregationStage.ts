import {
  BeanStub,
  type NamedBean,
  type GridOptions,
  type _IRowNodeAggregationStage,
  _getClientSideRowModel,
  _forEachChangedGroupDepthFirst,
  _getGrandTotalRow,
} from 'ag-grid-community';
import type { AgColumn, ChangedPath, ColAggFunc, IAggFunc, RowNode } from 'ag-grid-community';

function isValueColumn(col: AgColumn): boolean {
  if (col.aggregationActive || col.getAggFunc() != null) return true;
  const colDef = col.getColDef() as Record<string, unknown>;
  return colDef['aggFunc'] != null || colDef['enableValue'] === true;
}

function pivotKey(value: unknown): string {
  if (value === null) return '\u0000null';
  if (value === undefined) return '\u0000undefined';
  return String(value);
}

/**
 * Computes `aggData` for every group node — bean `aggStage`, step `'aggregate'`.
 *
 * Walks the tree deepest-first so child group results are ready when a parent
 * group aggregates them. Aggregates over `childrenAfterFilter` when a filter
 * is active (default behaviour); `suppressAggFilteredOnly` is restored by
 * `FilterAggregateStage`, which re-aggregates over all children.
 *
 * @feature Row Grouping -> Aggregation
 */
export class AggregationStage extends BeanStub implements _IRowNodeAggregationStage, NamedBean {
  beanName = 'aggStage' as const;

  readonly step = 'aggregate' as const;
  readonly refreshProps: (keyof GridOptions)[] | null = [
    'aggFuncs',
    'getGroupRowAgg',
    'alwaysAggregateAtRootLevel',
    'suppressAggFilteredOnly',
    'groupAggFiltering',
    'grandTotalRow',
  ];

  public execute(_changedPath: ChangedPath | undefined): void {
    const csrm = _getClientSideRowModel(this.beans);
    const rootNode = csrm?.rootNode;
    if (!rootNode) return;

    const valueCols = (this.beans.colModel.getCols() ?? []).filter(isValueColumn);
    const pivotCols = this.beans.pivotResultCols?.pivotCols ?? null;
    const getGroupRowAgg = this.gos.get('getGroupRowAgg') as
      | ((params: { rowNode: RowNode }) => Record<string, unknown> | null | undefined)
      | undefined;
    if (valueCols.length === 0 && !pivotCols?.length && !getGroupRowAgg) return;

    // grandTotalRow needs a root aggregate to display regardless of
    // alwaysAggregateAtRootLevel — there is nothing else it could show.
    const alwaysRoot = this.gos.get('alwaysAggregateAtRootLevel') === true || !!_getGrandTotalRow(this.gos) || !!pivotCols?.length;

    // Full traversal: after groupStage rebuilds the tree every group node is
    // new, so a changedPath (root-only on load) would skip them. Incremental
    // re-aggregation (`aggregateOnlyChangedColumns`) is a later optimisation.
    _forEachChangedGroupDepthFirst(rootNode, csrm.hierarchical ?? true, null, (node) => {
      const isRoot = node === rootNode;
      const children = node.childrenAfterFilter ?? node.childrenAfterGroup;
      if (!children || children.length === 0) return;
      if (!node.group && !isRoot) return;
      if (isRoot && !alwaysRoot && !node.group) return;

      node.childrenAfterAggFilter = children;
      if (getGroupRowAgg) {
        const result = getGroupRowAgg({ rowNode: node });
        if (result) {
          node.aggData = Object.assign(Object.create(null), node.aggData, result);
          return;
        }
      }
      this.aggregateNode(node, valueCols, children);
      if (pivotCols?.length) this.aggregatePivotNode(node, pivotCols, children);
    });
  }

  /** Re-aggregates only the root node, leaving group aggregates untouched. */
  public aggregateRootOnly(): void {
    const csrm = _getClientSideRowModel(this.beans);
    const rootNode = csrm?.rootNode;
    if (!rootNode) return;
    const children = rootNode.childrenAfterAggFilter ?? rootNode.childrenAfterGroup;
    if (!children) return;
    this.aggregateNodeOver(rootNode, children);
  }

  /** Re-aggregates one node over an explicit child set (used by FilterAggregateStage). */
  public aggregateNodeOver(node: RowNode, children: RowNode[]): void {
    const valueCols = (this.beans.colModel.getCols() ?? []).filter(isValueColumn);
    if (valueCols.length === 0) return;
    this.aggregateNode(node, valueCols, children);
  }

  private aggregateNode(node: RowNode, valueCols: AgColumn[], children: RowNode[]): void {
    if (!node.aggData) node.aggData = Object.create(null);
    for (const col of valueCols) {
      const colId = col.getColId();
      const values: unknown[] = [];
      const aggChildren: RowNode[] = [];
      for (const child of children) {
        if (child.group) {
          aggChildren.push(child);
          values.push(child.aggData?.[colId]);
        } else {
          aggChildren.push(child);
          values.push(this.beans.valueSvc.getValue(col, child, 'data', true));
        }
      }
      const aggFunc = this.resolveAggFunc(col);
      if (!aggFunc) continue;
      const params = this.gos.addCommon({
        values,
        column: col,
        colDef: col.getColDef(),
        rowNode: node,
        data: node.data,
        aggregatedChildren: aggChildren,
      });
      const result = aggFunc(params as unknown as Parameters<IAggFunc>[0]);
      node.aggData[colId] = result ?? null;
    }
  }

  /**
   * Result columns must aggregate from raw leaves, not a child group's already
   * pivoted values: a child can contain several pivot-key buckets. This is a
   * deliberately straightforward traversal; changed-path optimisation belongs
   * to the later performance phase and must not compromise totals correctness.
   */
  private aggregatePivotNode(node: RowNode, pivotCols: AgColumn[], children: RowNode[]): void {
    if (!node.aggData) node.aggData = Object.create(null);
    const leaves = this.collectLeaves(children);
    for (const resultCol of pivotCols) {
      const def = resultCol.getColDef();
      const source = def.pivotValueColumn as AgColumn | null | undefined;
      if (!source) continue;
      const keys = def.pivotKeys ?? [];
      const values = leaves
        .filter((leaf) => (this.beans.pivotColsSvc?.columns ?? []).every((pivotCol, index) =>
          pivotKey(this.beans.valueSvc.getValue(pivotCol, leaf, 'data', true)) === keys[index],
        ))
        .map((leaf) => this.beans.valueSvc.getValue(source, leaf, 'data', true));
      const aggFunc = this.resolveAggFunc(source);
      if (!aggFunc) continue;
      const params = this.gos.addCommon({
        values,
        column: resultCol,
        colDef: resultCol.getColDef(),
        rowNode: node,
        data: node.data,
        aggregatedChildren: leaves,
      });
      node.aggData[resultCol.getColId()] = aggFunc(params as unknown as Parameters<IAggFunc>[0]) ?? null;
    }
  }

  private collectLeaves(children: RowNode[]): RowNode[] {
    const leaves: RowNode[] = [];
    const visit = (node: RowNode) => {
      const descendants = node.childrenAfterFilter ?? node.childrenAfterGroup;
      if (node.group && descendants) {
        for (const child of descendants) visit(child);
      } else {
        leaves.push(node);
      }
    };
    for (const child of children) visit(child);
    return leaves;
  }

  private resolveAggFunc(col: AgColumn): IAggFunc | undefined {
    const colDef = col.getColDef() as Record<string, unknown>;
    const declared: ColAggFunc = col.getAggFunc() ?? (colDef['aggFunc'] as ColAggFunc);
    const choice = declared ?? (colDef['defaultAggFunc'] as string | undefined) ?? 'sum';
    if (typeof choice === 'function') return choice as IAggFunc;
    if (typeof choice === 'string') return this.beans.aggFuncSvc?.getAggFunc(choice);
    return undefined;
  }
}
