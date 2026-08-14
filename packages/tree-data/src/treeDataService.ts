import { BeanStub, type RowNode } from 'ag-grid-community';

/** Mutates the configured tree-data source shape for managed row drops. */
export class TreeDataService extends BeanStub {

  public postConstruct(): void {
    this.addManagedEventListeners({ rowDragEnd: (event) => {
      const drag = event as unknown as { node?: RowNode; overNode?: RowNode; nodes?: RowNode[] };
      const target = drag.overNode;
      for (const node of drag.nodes?.length ? drag.nodes : drag.node ? [drag.node] : []) {
        if (target) this.reparent(node, target);
      }
    } });
  }

  /** Reparent a node under a target, rejecting self/descendant cycles. */
  public reparent(node: RowNode, target: RowNode): boolean {
    if (!node.data || !target.data || node === target || this.isDescendant(target, node)) return false;
    const childrenField = this.gos.get('treeDataChildrenField');
    const parentIdField = this.gos.get('treeDataParentIdField');
    if (typeof childrenField === 'string' && childrenField) this.moveNested(node, target, childrenField);
    else if (typeof parentIdField === 'string' && parentIdField) this.writeField(node.data as Record<string, unknown>, parentIdField, target.id);
    else this.movePath(node, target);
    node.parent = target;
    target.expanded = true;
    const model = this.beans.rowModel as { refreshModel?: (params: { step: 'group'; rowDataUpdated: boolean }) => void };
    model.refreshModel?.({ step: 'group', rowDataUpdated: true });
    return true;
  }

  private movePath(node: RowNode, target: RowNode): void {
    const getPath = this.gos.get('getDataPath') as ((data: Record<string, unknown>) => string[]) | undefined;
    if (!getPath || !node.data || !target.data) return;
    const sourcePath = getPath(node.data as Record<string, unknown>);
    const targetPath = getPath(target.data as Record<string, unknown>);
    if (!sourcePath?.length || !targetPath?.length) return;
    // Preserve the node's own label and make the former leaf a parent simply
    // by giving it a child path beneath it.
    const next = [...targetPath, sourcePath.at(-1)!];
    const writable = node.data as Record<string, unknown>;
    if (Array.isArray(writable['path'])) writable['path'] = next;
  }

  private moveNested(node: RowNode, target: RowNode, field: string): void {
    const data = node.data as Record<string, unknown>;
    const targetData = target.data as Record<string, unknown>;
    const parentData = node.parent?.data as Record<string, unknown> | undefined;
    const sourceChildren = parentData ? this.readField(parentData, field) : undefined;
    if (Array.isArray(sourceChildren)) {
      const index = sourceChildren.indexOf(data);
      if (index >= 0) sourceChildren.splice(index, 1);
    }
    let targetChildren = this.readField(targetData, field);
    if (!Array.isArray(targetChildren)) { targetChildren = []; this.writeField(targetData, field, targetChildren); }
    (targetChildren as Record<string, unknown>[]).push(data);
  }

  private isDescendant(candidate: RowNode, ancestor: RowNode): boolean {
    let current: RowNode | null | undefined = candidate;
    while (current) { if (current === ancestor) return true; current = current.parent; }
    return false;
  }
  private readField(data: Record<string, unknown>, field: string): unknown { return field.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, data); }
  private writeField(data: Record<string, unknown>, field: string, value: unknown): void {
    const keys = field.split('.'); let current = data;
    for (const key of keys.slice(0, -1)) { const next = current[key]; if (!next || typeof next !== 'object') current[key] = {}; current = current[key] as Record<string, unknown>; }
    current[keys.at(-1)!] = value;
  }
}
