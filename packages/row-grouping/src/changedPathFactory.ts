import {
  BeanStub,
  type ChangedPath,
  type ChangedRowsPath,
  type IChangedPathFactory,
  type IRowNode,
  type NamedBean,
  type RowNode,
} from 'ag-grid-community';

/** Tracks edited rows and ancestors for Community's deferred aggregate/refresh pass. */
class RowsPath implements ChangedRowsPath {
  readonly kind = 'rows' as const;
  protected readonly rows = new Set<IRowNode>();

  addRow(node: IRowNode | null | undefined): void {
    while (node && !this.rows.has(node)) {
      this.rows.add(node);
      node = node.parent;
    }
  }

  addCell(node: IRowNode | null | undefined, _colId: string | null | undefined): void {
    this.addRow(node);
  }

  hasRow(node: IRowNode): boolean {
    return this.rows.has(node);
  }

  getSortedRows(): RowNode[] {
    return [...this.rows].sort((a, b) => b.level - a.level) as RowNode[];
  }
}

export class ChangedPathFactory extends BeanStub implements NamedBean, IChangedPathFactory {
  beanName = 'changedPathFactory' as const;

  newPath(_trackCells: boolean): ChangedPath {
    // LibreGrid currently aggregates every value column. Tracking whole rows is
    // conservative and ensures computed/derived columns also refresh.
    return new RowsPath();
  }

  ensureRowsPath(params: Parameters<IChangedPathFactory['ensureRowsPath']>[0]): ChangedPath | undefined {
    // GroupStage rebuilds the hierarchy; leaving the path unset requests a full
    // traversal in Community's downstream stages instead of skipping new groups.
    return params.changedPath;
  }
}
