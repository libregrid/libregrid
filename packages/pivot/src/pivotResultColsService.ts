import { _buildColumnTree, BeanStub, type NamedBean } from 'ag-grid-community';
import type {
  AgColumn,
  AgProvidedColumnGroup,
  ColDef,
  ColGroupDef,
  ColKey,
  ColumnEventType,
  IPivotResultColsService,
} from 'ag-grid-community';

type PivotDef = ColDef | ColGroupDef;

function keyId(keys: readonly string[], valueId: string): string {
  return `lgr-pivot:${keys.map((key) => `${key.length}:${key}`).join('|')}|${valueId.length}:${valueId}`;
}


/** Owns generated (or application supplied) pivot result columns. */
export class PivotResultColsService extends BeanStub implements IPivotResultColsService, NamedBean {
  public beanName = 'pivotResultCols' as const;
  public pivotCols: AgColumn[] | null = null;
  public pivotTree: (AgColumn | AgProvidedColumnGroup)[] = [];
  public pivotTreeDepth = 0;
  public pivotHasMarryChildren = false;
  public pivotGroupsById = new Map<string, AgProvidedColumnGroup>();
  public pivotAllGroups: AgProvidedColumnGroup[] = [];
  public suppliedColDefs: PivotDef[] | null = null;
  private existingByKey = new Map<string | ColDef, AgColumn>();
  private existingById: Record<string, AgColumn> = Object.create(null);
  private aggregationOrdered: AgColumn[] | null = null;

  public buildColsInStateOrder(): AgColumn[] {
    const primaries = this.beans.colModel.colDefList ?? [];
    return [...primaries, ...(this.pivotCols ?? [])];
  }
  public buildAllCols(): AgColumn[] { return this.buildColsInStateOrder(); }

  public lookupPivotResultCol(pivotKeys: string[], valueColKey: ColKey): AgColumn | null {
    const valueId = typeof valueColKey === 'string' ? valueColKey : (valueColKey as AgColumn).getColId?.();
    if (!valueId) return null;
    return this.pivotCols?.find((column) => {
      const def = column.getColDef();
      const source = def.pivotValueColumn as AgColumn | null | undefined;
      return source?.getColId() === valueId && JSON.stringify(def.pivotKeys ?? []) === JSON.stringify(pivotKeys);
    }) ?? null;
  }

  public setPivotResultCols(defs: PivotDef[] | null, source: ColumnEventType, appSupplied = false): void {
    this.suppliedColDefs = appSupplied ? defs : null;
    if (!defs || defs.length === 0) {
      this.clear(source);
      return;
    }
    this.build(defs, source);
  }

  /** Temporarily remove results while retaining application-supplied definitions. */
  public hide(source: ColumnEventType): void { this.clear(source); }

  /** Reapply explicit result definitions when pivot mode returns. */
  public restoreSupplied(source: ColumnEventType): void {
    if (this.suppliedColDefs && this.pivotCols === null) this.build(this.suppliedColDefs, source);
  }

  private build(defs: PivotDef[], source: ColumnEventType): void {
    const build = _buildColumnTree(
      this.beans,
      defs,
      false,
      this.pivotGroupsById,
      this.existingByKey,
      this.existingById,
      source,
      true,
      this.beans.colModel.nextBuildToken(),
      null,
    );
    this.pivotCols = build.columns;
    this.pivotTree = build.columnTree;
    this.pivotTreeDepth = build.treeDepth;
    this.pivotHasMarryChildren = build.marryChildren;
    this.pivotGroupsById = build.groupsById;
    this.pivotAllGroups = build.allGroups;
    this.existingByKey = build.colsByKey;
    this.existingById = Object.fromEntries(build.columns.map((column) => [column.getColId(), column]));
    this.aggregationOrdered = null;
    this.refreshColumns(source);
  }

  public setGenerated(defs: PivotDef[], source: ColumnEventType): void {
    if (this.suppliedColDefs) return;
    this.setPivotResultCols(defs, source, false);
  }

  public resortPivotResultCols(source: ColumnEventType): void { this.refreshColumns(source); }
  public getAggregationOrderedList(): AgColumn[] | null { return this.aggregationOrdered ??= this.pivotCols?.slice() ?? null; }
  public recreateColDefsForSource(_sourceCol: AgColumn, _source: ColumnEventType): void { /* rebuilt by pivot stage */ }

  private clear(source: ColumnEventType): void {
    this.pivotCols = null;
    this.pivotTree = [];
    this.pivotTreeDepth = 0;
    this.pivotHasMarryChildren = false;
    this.pivotGroupsById.clear();
    this.pivotAllGroups = [];
    this.aggregationOrdered = null;
    this.refreshColumns(source);
  }

  private refreshColumns(source: ColumnEventType): void {
    this.beans.colModel.refreshCols(false, source);
    this.beans.visibleCols.refresh(source, false);
  }
}

/** Creates deterministic nested pivot definitions from distinct pivot keys. */
export function createGeneratedPivotDefs(
  keySets: readonly string[][],
  valueColumns: readonly AgColumn[],
): PivotDef[] {
  type Branch = { children: Map<string, Branch>; leaves: string[][] };
  const root: Branch = { children: new Map(), leaves: [] };
  for (const keys of keySets) {
    let branch = root;
    for (const key of keys) {
      let next = branch.children.get(key);
      if (!next) { next = { children: new Map(), leaves: [] }; branch.children.set(key, next); }
      branch = next;
    }
    branch.leaves.push(keys);
  }
  const make = (branch: Branch, depth: number): PivotDef[] => {
    const result: PivotDef[] = [];
    for (const [key, child] of branch.children) {
      const children = depth + 1 === keySets[0]?.length
        ? child.leaves.flatMap((keys) => valueColumns.map((valueColumn) => ({
            colId: keyId(keys, valueColumn.getColId()),
            headerName: valueColumns.length === 1 ? key : valueColumn.getColDef().headerName ?? valueColumn.getColId(),
            pivotKeys: keys,
            pivotValueColumn: valueColumn,
            sortable: true,
          } satisfies ColDef)))
        : make(child, depth + 1);
      result.push({ groupId: `lgr-pivot-group:${depth}:${key}`, headerName: key, marryChildren: true, children });
    }
    return result;
  };
  if (keySets.length === 0 || valueColumns.length === 0) return [];
  return make(root, 0);
}

export function generatedPivotColumnId(keys: readonly string[], valueId: string): string { return keyId(keys, valueId); }
