import {
  BeanStub,
  type NamedBean,
  type GridOptions,
  type _IRowNodeAggregationStage,
  _getClientSideRowModel,
  _forEachChangedGroupDepthFirst,
} from 'ag-grid-community';
import type { AgColumn, ChangedPath, ColAggFunc, IAggFunc, RowNode } from 'ag-grid-community';

function isValueColumn(col: AgColumn): boolean {
  if (col.aggregationActive || col.getAggFunc() != null) return true;
  const colDef = col.getColDef() as Record<string, unknown>;
  return colDef['aggFunc'] != null || colDef['enableValue'] === true;
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
  ];

  public execute(_changedPath: ChangedPath | undefined): void {
    const csrm = _getClientSideRowModel(this.beans);
    const rootNode = csrm?.rootNode;
    if (!rootNode) return;

    const valueCols = (this.beans.colModel.getCols() ?? []).filter(isValueColumn);
    const getGroupRowAgg = this.gos.get('getGroupRowAgg') as
      | ((params: { rowNode: RowNode }) => Record<string, unknown> | null | undefined)
      | undefined;
    if (valueCols.length === 0 && !getGroupRowAgg) return;

    const alwaysRoot = this.gos.get('alwaysAggregateAtRootLevel') === true;

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

  private resolveAggFunc(col: AgColumn): IAggFunc | undefined {
    const colDef = col.getColDef() as Record<string, unknown>;
    const declared: ColAggFunc = col.getAggFunc() ?? (colDef['aggFunc'] as ColAggFunc);
    const choice = declared ?? (colDef['defaultAggFunc'] as string | undefined) ?? 'sum';
    if (typeof choice === 'function') return choice as IAggFunc;
    if (typeof choice === 'string') return this.beans.aggFuncSvc?.getAggFunc(choice);
    return undefined;
  }
}
