import {
  BeanStub,
  type _IRowNodeFlattenStage,
  type GridOptions,
  type NamedBean,
  type RowNode,
  _getClientSideRowModel,
} from 'ag-grid-community';

export class FlattenStage extends BeanStub implements _IRowNodeFlattenStage, NamedBean {
  beanName = 'flattenStage' as const;

  readonly step = 'map' as const;
  readonly refreshProps: (keyof GridOptions)[] | null = null;

  public execute(): RowNode[] {
    const csrm = _getClientSideRowModel(this.beans);
    const rootNode = csrm?.rootNode;
    if (!rootNode) return [];

    const result: RowNode[] = [];
    this.flatten(rootNode, result);
    return result;
  }

  private flatten(node: RowNode, out: RowNode[]): void {
    const children = node.childrenAfterAggFilter ?? node.childrenAfterFilter ?? node.childrenAfterGroup;
    if (!children) return;

    for (const child of children) {
      if (child.group && !child.expanded) {
        out.push(child);
      } else if (child.group && child.expanded) {
        out.push(child);
        this.flatten(child, out);
      } else {
        out.push(child);
      }
    }
  }
}
