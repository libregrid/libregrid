import {
  BeanStub,
  _createUserColumn,
  type AgColumn,
  type AgProvidedColumnGroup,
  type CalculatedColumnsOptions,
  type ColDef,
  type ColumnEventType,
  type ColumnState,
  type ICalculatedColumnsService,
  type MenuItemDef,
  type NamedBean,
  isColumn,
  isProvidedColumnGroup,
} from 'ag-grid-community';
import type { MenuActionParams, MenuItemContribution } from '@libregrid/menu';
import type { CalculatedColumnFormulaService } from './calculatedColumnFormulaService';
import { CalculatedColumnDialog, type CalcDialogHost, type CalcDialogProps, type ColumnReference } from './calculatedColumnsDialog';
import type { FormulaError, FormulaErrorCode } from './expression';

type ColumnTreeBuild = Parameters<ICalculatedColumnsService['contributeTo']>[0];
type HeaderPosition = NonNullable<Parameters<ICalculatedColumnsService['openCalculatedColumnDialog']>[3]>['headerPosition'];

interface UserColumnServiceLike {
  registerOwner(isEnabled: () => boolean, ownedProperties: readonly string[]): void;
  isDeclared(colId: string): boolean;
  getEntry(colId: string): {
    properties?: ColDef;
    created?: boolean;
    parentGroupId?: string | null;
    removed?: boolean;
  } | undefined;
  forEachEntry(callback: (entry: {
    properties?: ColDef;
    created?: boolean;
    parentGroupId?: string | null;
    removed?: boolean;
  }, colId: string) => void): void;
  setCreatedColumn(colId: string, properties: ColDef, parentGroupId: string | null): void;
  setOverride(colId: string, properties: ColDef): void;
  removeColumn(colId: string, declared: boolean): void;
  clear(): boolean;
  setState(states: unknown): boolean;
}

interface ColumnModelLike {
  getNonPivotColById(colId: string): AgColumn | undefined;
  /** Flat primary-column list (the colDef layer), incl. spliced dynamic columns. */
  readonly colDefList: AgColumn[];
  rebuildCols(source: ColumnEventType): void;
}

interface DynamicCol {
  properties: ColDef;
  parentGroupId: string | null;
  /** colId this column sits immediately after (display order). Null = end of its group. */
  anchorColId: string | null;
}

interface ResolvedOptions {
  dataTypes: string[];
  expressionPickers: Array<'columns' | 'functions' | 'operators'>;
  applyMode: 'live' | 'deferred';
  suppressColumnHighlighting: boolean;
}

const DEFAULT_DATA_TYPES: readonly string[] = ['text', 'number', 'date', 'boolean'];
const DEFAULT_PICKERS: ReadonlyArray<'columns' | 'functions' | 'operators'> = ['columns', 'functions', 'operators'];

/**
 * The `calculatedColsSvc` bean — the calculated-column lifecycle (gap-plan A2):
 * dynamic (dialog-created) columns spliced into the Community column build,
 * the user-column-layer record of created/overridden definitions, the
 * add/edit/remove dialog, column + context menu entries, edit highlighting,
 * and the four `calculatedColumn*` grid events.
 *
 * Community v36.1.0 owns the rest: `AgColumn.isCalculatedCol` (set from
 * `calculatedExpression` + `isEnabled()`), the value pipeline
 * (`ValueService.getValueFromData` → the `formula` bean, see
 * `CalculatedColumnFormulaService`), read-only enforcement (edit / paste /
 * setValue all refuse calculated columns), the formula-error CSS + tooltip,
 * the header icon, the `calculatedColumns` option validation, the
 * `anchoredToColId` order-restoration, and the Grid State `userColumns`
 * section (`UserColumnService`).
 *
 * @feature CalculatedColumns
 */
export class CalculatedColumnsService extends BeanStub implements ICalculatedColumnsService, NamedBean {
  public readonly beanName = 'calculatedColsSvc' as const;

  /** Created (dialog-added) columns: colId → record. Declared columns stay in `columnDefs`. */
  private dynamicCols = new Map<string, DynamicCol>();
  /** Created columns parked across a `resetColumnState` (re-added on restore). */
  private parkedCols = new Map<string, DynamicCol>();
  private dialog: CalculatedColumnDialog | null = null;
  private dialogColumn: AgColumn | null = null;
  /** Last known validation state per calc column (flip events). */
  private lastValid = new Map<string, boolean>();
  private createdCounter = 0;

  public postConstruct(): void {
    this.userColumnSvc()?.registerOwner(() => this.isEnabled(), [
      'calculatedExpression',
      'cellDataType',
      'columnGroupShow',
      'headerName',
    ]);
    this.registerMenuItems();
  }

  public override destroy(): void {
    this.closeDialogInternal();
    this.dynamicCols.clear();
    this.parkedCols.clear();
    this.lastValid.clear();
    super.destroy();
  }

  // ------------------------------------------------------------------
  // ICalculatedColumnsService
  // ------------------------------------------------------------------

  public isEnabled(): boolean {
    const option = this.gos.get('calculatedColumns');
    return option != null && option !== false;
  }

  /**
   * Build hook: splice every user-layer created entry that carries a
   * `calculatedExpression` into the build at its anchor. Declared calc
   * columns flow through `columnDefs` normally (the user layer only overrides
   * their properties); this hook is for dialog-created columns only.
   */
  public contributeTo(build: ColumnTreeBuild): void {
    if (!this.isEnabled()) return;
    const svc = this.userColumnSvc();
    if (!svc) return;
    let spliced = false;
    svc.forEachEntry((entry, colId) => {
      if (!entry.created || entry.removed) return;
      if (entry.properties?.calculatedExpression === undefined) return;
      if (this.spliceColumn(build, colId, entry.properties, entry.parentGroupId ?? null)) {
        spliced = true;
      }
    });
    if (spliced) {
      build.columns = this.flattenLeaves(build.columnTree);
    }
  }

  /**
   * `resetColumnState` hook. With `preserveCreatedColumns` (the reset path)
   * created columns are parked so a later `restoreDynamicColumnDefs` (state
   * re-apply) can re-add them; without it (the `setColumnDefs` path) the
   * dynamic set is dropped outright.
   */
  public resetDynamicColumnDefs(preserveCreatedColumns?: boolean): boolean {
    const had = this.dynamicCols.size > 0;
    if (preserveCreatedColumns) {
      for (const [colId, dyn] of this.dynamicCols) {
        this.parkedCols.set(colId, dyn);
      }
    }
    this.dynamicCols.clear();
    return had;
  }

  /**
   * `UserColumnService.setState` hook (Grid State restore): adopt created
   * entries describing calc columns into the dynamic set.
   */
  public adoptUserColumns(): boolean {
    const svc = this.userColumnSvc();
    if (!svc || !this.isEnabled()) return false;
    let changed = false;
    svc.forEachEntry((entry, colId) => {
      if (!entry.created || entry.removed) return;
      if (entry.properties?.calculatedExpression === undefined) return;
      if (!this.dynamicCols.has(colId)) {
        this.dynamicCols.set(colId, {
          properties: entry.properties,
          parentGroupId: entry.parentGroupId ?? null,
          anchorColId: null,
        });
        changed = true;
      }
    });
    return changed;
  }

  /**
   * `setColumnState`/Grid State hook, before the state is matched to live
   * columns: re-create dynamic calc columns the state refers to (from the
   * user layer, or from the parked set after a reset).
   */
  public restoreDynamicColumnDefs(state: ColumnState[]): boolean {
    if (!this.isEnabled()) return false;
    const svc = this.userColumnSvc();
    let changed = false;
    for (const s of state) {
      const colId = s.colId;
      if (!colId) continue;
      const entry = svc?.getEntry(colId);
      if (entry?.created && !entry.removed && entry.properties?.calculatedExpression !== undefined) {
        if (!this.dynamicCols.has(colId)) {
          this.dynamicCols.set(colId, {
            properties: entry.properties,
            parentGroupId: entry.parentGroupId ?? null,
            anchorColId: null,
          });
          changed = true;
        }
        continue;
      }
      const parked = this.parkedCols.get(colId);
      if (parked && !this.dynamicCols.has(colId)) {
        this.dynamicCols.set(colId, parked);
        this.parkedCols.delete(colId);
        svc?.setCreatedColumn(colId, parked.properties, parked.parentGroupId);
        changed = true;
      }
    }
    return changed;
  }

  /** Structural rebuild from `columnDefs` + contributors; then re-validate. */
  public refreshDynamicColumns(source: ColumnEventType): void {
    this.columnModel().rebuildCols(source);
    this.refreshValidation(source);
  }

  public removeCalculatedColumn(column: AgColumn | null | undefined): void {
    if (!column || column.calculatedExpression === undefined) return;
    const colId = column.colId;
    const svc = this.userColumnSvc();
    const declared = svc?.isDeclared(colId) ?? false;
    svc?.removeColumn(colId, declared);
    this.dynamicCols.delete(colId);
    this.parkedCols.delete(colId);
    this.lastValid.delete(colId);
    this.formulaSvc().forgetColumn(column);
    if (this.dialogColumn === column) {
      this.closeDialogInternal();
    }
    this.dispatchEvent({
      type: 'calculatedColumnRemoved',
      column,
      expression: column.calculatedExpression ?? '',
      source: 'calculatedColumn',
    });
    this.refreshDynamicColumns('calculatedColumn');
  }

  public openCalculatedColumnDialog(
    column: AgColumn | null | undefined,
    mode: 'add' | 'edit',
    focusDialog?: boolean,
    restoreFocusParams?: { eventSource?: HTMLElement; headerPosition: HeaderPosition | null },
  ): void {
    if (!column || !this.isEnabled()) return;
    this.closeDialogInternal();

    let target = column;
    if (mode === 'add') {
      const parentGroupId = column.getOriginalParent()?.groupId ?? null;
      const colId = this.nextCreatedColId();
      const properties: ColDef = {
        calculatedExpression: '',
        headerName: `Calculated Column ${this.createdCounter + 1}`,
      };
      this.userColumnSvc()?.setCreatedColumn(colId, properties, parentGroupId);
      this.dynamicCols.set(colId, { properties, parentGroupId, anchorColId: column.colId });
      this.refreshDynamicColumns('calculatedColumn');
      const created = this.columnModel().getNonPivotColById(colId);
      if (!created) {
        // Creation failed (id collision / disabled mid-flight) — roll back.
        this.userColumnSvc()?.removeColumn(colId, false);
        this.dynamicCols.delete(colId);
        this.refreshDynamicColumns('calculatedColumn');
        return;
      }
      target = created;
      this.createdCounter++;
      this.dispatchEvent({
        type: 'calculatedColumnCreated',
        column: target,
        expression: '',
        source: 'calculatedColumn',
      });
    }

    this.dialogColumn = target;
    const colDef = target.getColDef();
    const initial: CalcDialogProps = {
      headerName: typeof colDef.headerName === 'string' ? colDef.headerName : target.colId,
      cellDataType: typeof colDef.cellDataType === 'string' ? colDef.cellDataType : 'text',
      expression: target.calculatedExpression ?? '',
    };
    const host: CalcDialogHost = {
      colId: target.colId,
      validate: (props) => this.validateProps(props),
      apply: (props) => this.applyProps(target, props),
      revert: () => this.applyProps(target, initial),
      close: () => this.closeDialogInternal(),
    };
    this.dialog = new CalculatedColumnDialog(host, this.options(), this.columnReferences(), initial);
    this.dialog.open(this.eRootDiv, focusDialog === true, restoreFocusParams?.eventSource ?? null);
    // Re-evaluate the highlight CSS (header + cells) with the dialog active.
    this.columnModel().rebuildCols('calculatedColumn');
  }

  public isHighlightedColumn(column: AgColumn | null): boolean {
    if (!column || this.options().suppressColumnHighlighting) return false;
    return column === this.dialogColumn;
  }

  // ------------------------------------------------------------------
  // Dialog host
  // ------------------------------------------------------------------

  private validateProps(props: CalcDialogProps): FormulaError | null {
    const expression = props.expression.trim();
    if (expression === '') return null;
    return this.formulaSvc().validateExpression(expression, {
      resolveReference: (id) => this.columnModel().getNonPivotColById(id) !== undefined,
    });
  }

  private applyProps(column: AgColumn, props: CalcDialogProps): FormulaError | null {
    const svc = this.userColumnSvc();
    const colId = column.colId;
    const declared = svc?.isDeclared(colId) ?? false;
    const properties: ColDef = {
      calculatedExpression: props.expression,
      headerName: props.headerName,
      cellDataType: props.cellDataType,
    };
    const dyn = this.dynamicCols.get(colId);
    if (declared) {
      svc?.setOverride(colId, properties);
    } else {
      svc?.setCreatedColumn(colId, properties, dyn?.parentGroupId ?? column.getOriginalParent()?.groupId ?? null);
      if (dyn) dyn.properties = properties;
    }
    const oldExpression = this.expressionOf(column);
    this.refreshDynamicColumns('calculatedColumn');
    const fresh = this.columnModel().getNonPivotColById(colId) ?? column;
    if (oldExpression !== props.expression) {
      this.dispatchEvent({
        type: 'calculatedColumnExpressionChanged',
        column: fresh,
        expression: props.expression,
        oldExpression,
        source: 'calculatedColumn',
      });
    }
    return this.validateProps(props);
  }

  private closeDialogInternal(): void {
    if (this.dialog) {
      this.dialog.destroy();
      this.dialog = null;
    }
    if (this.dialogColumn) {
      this.dialogColumn = null;
      this.columnModel().rebuildCols('calculatedColumn');
    }
  }

  // ------------------------------------------------------------------
  // Splicing (contributeTo internals)
  // ------------------------------------------------------------------

  private spliceColumn(
    build: ColumnTreeBuild,
    colId: string,
    properties: ColDef,
    parentGroupId: string | null,
  ): boolean {
    const def: ColDef = { ...properties, colId };
    const existing = build.colsByKey.get(colId);
    let col: AgColumn;
    if (existing && existing.colKind === 'user' && existing.primary && existing.buildToken !== build.buildToken) {
      col = existing;
      col.buildToken = build.buildToken;
      col.setColDef(def, def, build.source);
    } else if (existing) {
      // The colId is owned by a different kind of column (e.g. declared with
      // a colId the user later reused); the existing column wins.
      return false;
    } else {
      col = _createUserColumn(this.beans, def, colId, true, build.buildToken);
    }

    const dyn = this.dynamicCols.get(colId);
    col.anchoredToColId = dyn?.anchorColId ?? undefined;

    const anchorCol = dyn?.anchorColId ? build.colsByKey.get(dyn.anchorColId) : undefined;
    let container: (AgColumn | AgProvidedColumnGroup)[] | null = null;
    let insertAt = -1;
    if (anchorCol) {
      const found = this.findInTree(build.columnTree, anchorCol);
      if (found) {
        container = found.container;
        insertAt = found.index + 1;
      }
    }
    if (!container) {
      const group = parentGroupId ? this.findGroup(build, parentGroupId) : undefined;
      container = group ? group.children : build.columnTree;
      insertAt = container.length;
    }
    container.splice(insertAt, 0, col);
    build.colsByKey.set(colId, col);

    if (!dyn) {
      this.dynamicCols.set(colId, { properties, parentGroupId, anchorColId: null });
    } else {
      dyn.properties = properties;
    }
    return true;
  }

  private findInTree(
    children: (AgColumn | AgProvidedColumnGroup)[],
    target: AgColumn,
  ): { container: (AgColumn | AgProvidedColumnGroup)[]; index: number } | null {
    for (let i = 0; i < children.length; i++) {
      const node = children[i]!;
      if (node === target) return { container: children, index: i };
      if (isProvidedColumnGroup(node)) {
        const found = this.findInTree(node.children, target);
        if (found) return found;
      }
    }
    return null;
  }

  private findGroup(build: ColumnTreeBuild, groupId: string): AgProvidedColumnGroup | undefined {
    const byId = build.groupsById.get(groupId);
    if (byId) return byId;
    return this.findGroupInTree(build.columnTree, groupId);
  }

  private findGroupInTree(
    children: (AgColumn | AgProvidedColumnGroup)[],
    groupId: string,
  ): AgProvidedColumnGroup | undefined {
    for (const node of children) {
      if (isProvidedColumnGroup(node)) {
        if (node.groupId === groupId) return node;
        const found = this.findGroupInTree(node.children, groupId);
        if (found) return found;
      }
    }
    return undefined;
  }

  private flattenLeaves(children: (AgColumn | AgProvidedColumnGroup)[]): AgColumn[] {
    const out: AgColumn[] = [];
    for (const node of children) {
      if (isProvidedColumnGroup(node)) out.push(...this.flattenLeaves(node.children));
      else out.push(node);
    }
    return out;
  }

  // ------------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------------

  /** Re-validate every calc column after a column-set change; dispatch flips. */
  private refreshValidation(source: ColumnEventType): void {
    for (const col of this.columnModel().colDefList) {
      if (col.isCalculatedCol) {
        this.checkValidation(col, source);
      }
    }
  }

  private checkValidation(col: AgColumn, source: ColumnEventType): void {
    const expression = col.calculatedExpression ?? '';
    if (expression.trim() === '') {
      this.lastValid.delete(col.colId);
      return; // empty expression renders blank cells — always valid
    }
    const error = this.formulaSvc().validateExpression(expression, {
      resolveReference: (id) => this.columnModel().getNonPivotColById(id) !== undefined,
    });
    const valid = error === null;
    const previous = this.lastValid.get(col.colId);
    this.lastValid.set(col.colId, valid);
    if (previous === undefined || previous === valid) return;
    this.dispatchEvent({
      type: 'calculatedColumnValidationStateChanged',
      column: col,
      expression,
      valid,
      ...(valid ? {} : { reason: validationReason(error) }),
      source,
    });
  }

  // ------------------------------------------------------------------
  // Menu
  // ------------------------------------------------------------------

  private registerMenuItems(): void {
    const mapper = this.beans.menuItemMapper as { registry?: { register(contribution: MenuItemContribution): void } } | undefined;
    if (!mapper?.registry) return;
    mapper.registry.register({
      name: 'calculatedColumn',
      order: 42,
      factory: (params: MenuActionParams): MenuItemDef | null => {
        if (!this.isEnabled()) return null;
        const column = params.column;
        if (!column || !isColumn(column)) return null;
        const col = column as AgColumn;
        if (col.isCalculatedCol) {
          return {
            name: 'Calculated Column',
            subMenu: [
              {
                name: 'Edit Calculated Column',
                action: () => this.openCalculatedColumnDialog(col, 'edit', true),
              },
              {
                name: 'Remove Calculated Column',
                action: () => this.removeCalculatedColumn(col),
              },
            ],
          };
        }
        return {
          name: 'Add Calculated Column',
          action: () => this.openCalculatedColumnDialog(col, 'add', true),
        };
      },
    });
    mapper.registry.register({
      name: 'calculatedColumnRemove',
      order: 44,
      factory: (params: MenuActionParams): MenuItemDef | null => {
        if (!this.isEnabled()) return null;
        const column = params.column;
        if (!column || !isColumn(column)) return null;
        const col = column as AgColumn;
        if (!col.isCalculatedCol) return null;
        return {
          name: 'Remove Calculated Column',
          action: () => this.removeCalculatedColumn(col),
        };
      },
    });
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private options(): ResolvedOptions {
    const option = this.gos.get('calculatedColumns');
    const o: CalculatedColumnsOptions = typeof option === 'object' && option !== null ? option : {};
    return {
      dataTypes: o.dataTypes ?? [...DEFAULT_DATA_TYPES],
      expressionPickers: o.expressionPickers ?? [...DEFAULT_PICKERS],
      applyMode: o.applyMode ?? 'live',
      suppressColumnHighlighting: o.suppressColumnHighlighting ?? false,
    };
  }

  private nextCreatedColId(): string {
    for (let i = 1; ; i++) {
      const candidate = `lgr-calc-${this.createdCounter + i}`;
      if (this.columnModel().getNonPivotColById(candidate) === undefined && !this.dynamicCols.has(candidate)) {
        return candidate;
      }
    }
  }

  private expressionOf(col: AgColumn): string {
    return col.calculatedExpression ?? '';
  }

  private columnReferences(): ColumnReference[] {
    const names = new Map<string, number>();
    const columns = this.columnModel().colDefList;
    for (const c of columns) {
      const label = this.displayNameFor(c);
      names.set(label, (names.get(label) ?? 0) + 1);
    }
    return columns.map((c) => {
      const label = this.displayNameFor(c);
      return { colId: c.colId, label: names.get(label)! > 1 ? this.groupedDisplayName(c) : label };
    });
  }

  private displayNameFor(col: AgColumn): string {
    return (
      (this.beans as unknown as { api?: { getDisplayNameForColumn?: (c: AgColumn, t: 'header') => string | undefined } }).api
        ?.getDisplayNameForColumn?.(col, 'header') ??
      col.getColDef().headerName ??
      col.colId
    );
  }

  private groupedDisplayName(col: AgColumn): string {
    const parts: string[] = [this.displayNameFor(col)];
    let parent = col.getOriginalParent();
    while (parent) {
      const def = parent.getColGroupDef();
      parts.unshift(def?.headerName ?? parent.groupId);
      parent = parent.getOriginalParent();
    }
    return parts.join(' › ');
  }

  private formulaSvc(): CalculatedColumnFormulaService {
    const svc = (this.beans as unknown as { formula?: CalculatedColumnFormulaService }).formula;
    if (!svc) throw new Error('calculated-columns: formula bean missing');
    return svc;
  }

  private userColumnSvc(): UserColumnServiceLike | undefined {
    return (this.beans as unknown as { userColumnSvc?: UserColumnServiceLike }).userColumnSvc;
  }

  private columnModel(): ColumnModelLike {
    const colModel = (this.beans as unknown as { colModel?: ColumnModelLike }).colModel;
    if (!colModel) throw new Error('calculated-columns: colModel bean missing');
    return colModel;
  }

  private get eRootDiv(): HTMLElement {
    return (this.beans as unknown as { eRootDiv: HTMLElement }).eRootDiv;
  }

  private dispatchEvent(event: Record<string, unknown>): void {
    const eventSvc = (this.beans as unknown as { eventSvc?: { dispatchEvent(event: unknown): void } }).eventSvc;
    eventSvc?.dispatchEvent(event);
  }
}

function validationReason(error: FormulaError): 'unknownReference' | 'invalidExpression' {
  return error.code === ('#REF!' as FormulaErrorCode) ? 'unknownReference' : 'invalidExpression';
}
