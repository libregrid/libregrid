import {
  BeanStub,
  type AgColumn,
  type FormulaFunctionParams,
  type FormulaParam,
  type IFormulaDataService,
  type IFormulaService,
  type IRowNode,
  type NamedBean,
} from 'ag-grid-community';
import {
  FORMULA_FUNCTION_NAMES,
  FormulaError,
  type CellFormulaFormat,
  type CellRef,
  type ExprNode,
  type FormulaParamLike,
  type ValidateOptions,
  columnPosition,
  convertFormula,
  evaluate,
  getFormulaFunction,
  parseCellFormula,
  parseExpression,
  shiftFormula,
  validateExpression,
} from './expression';

type FormulaColumn = Parameters<IFormulaService['resolveValue']>[0];
type FormulaRow = Parameters<IFormulaService['resolveValue']>[1];
type NodeRow = IRowNode;

interface ValueServiceLike {
  getValue(column: AgColumn, rowNode: NodeRow, from: string, ignoreAggData?: boolean): unknown;
  getValueFromData(column: AgColumn, rowNode: NodeRow, ignoreAggData?: boolean): unknown;
}

interface ColumnModelLike {
  getNonPivotColById(colId: string): AgColumn | undefined;
  pivotMode: boolean;
}

/** Service column ids (`ag-Grid-*`) never participate in A1 column-letter mapping. */
function isServiceColumn(col: AgColumn): boolean {
  return col.getColId().startsWith('ag-Grid-');
}

const AST_CACHE_LIMIT = 2048;

/**
 * The canonical `formula` bean — Community's formula seam, implementing both
 * gap-plan A2 (calculated columns) and gap-plan A1 (per-cell formulas).
 *
 * `@libregrid/calculated-columns` and `@libregrid/formulas` both declare this
 * class in their module `beans` arrays; the context collects module beans into
 * a `Set`, so exactly one instance serves both features regardless of
 * registration order.
 *
 * - **Calculated-column mode** (`colDef.calculatedExpression`): same-row
 *   `[colId]` expressions evaluated in `ValueService.getValueFromData`
 *   (Phase 18 behaviour, unchanged).
 * - **Per-cell mode** (`colDef.allowFormula`): `=...` strings resolved from the
 *   row-data field or the external `formulaDataSource` (via the
 *   `formulaDataSvc` bean), A1-notation references, ranges, `$` anchors,
 *   `formulaFuncs` custom functions, and the fill-handle offset contract
 *   (`updateFormulaByOffset`).
 *
 * `active` mirrors the docs' compatibility table: per-cell formulas are a
 * Client Row Model feature — tree data, pivot mode and active row grouping
 * keep the flag off so Community's soft-filter stage path never engages.
 *
 * @feature Formulas
 */
export class FormulaService extends BeanStub implements IFormulaService, NamedBean {
  public readonly beanName = 'formula' as const;

  /** Per-cell formulas active (drives Community's soft-filter + error display paths). */
  public active = false;

  /** Parsed-AST cache for calculated-column expressions, keyed by column instance. */
  private astCache = new Map<AgColumn, { expression: string; ast: ExprNode | null }>();
  /** Parsed-AST cache for per-cell formulas, keyed by the formula text itself. */
  private cellAstCache = new Map<string, ExprNode | null>();
  /**
   * External formula text cache (`rowId:colId` → formula string | undefined).
   * `getFormula` is lazy and cached per the docs; invalidated by edits, row
   * refreshes, column changes and `api.refreshFormulas()`.
   */
  private textCache = new Map<string, string | undefined>();
  /** Evaluation errors per cell, keyed `${rowId}:${colId}`. */
  private cellErrors = new Map<string, FormulaError>();
  /** Active calculated-column resolution chain (colIds) for `#CIRCREF!`. */
  private chain: AgColumn[] = [];
  /** Active per-cell resolution chain (`rowId:colId` keys) for `#CIRCREF!`. */
  private cellChain = new Set<string>();
  /** Bumped whenever the column/row layout may have changed; keys the format map. */
  private formatGen = 0;
  private formatCache?: { gen: number; colIds: string[]; rowIds: string[] };

  public override destroy(): void {
    this.astCache.clear();
    this.cellAstCache.clear();
    this.textCache.clear();
    this.cellErrors.clear();
    this.cellChain.clear();
    super.destroy();
  }

  // ------------------------------------------------------------------
  // IFormulaService — value pipeline
  // ------------------------------------------------------------------

  public resolveValue(column: FormulaColumn, row: FormulaRow): unknown {
    const col = column as AgColumn;
    if (col.calculatedExpression !== undefined) {
      return this.resolveCalculated(col, row);
    }
    if (col.allowFormula) {
      return this.resolveCellFormula(col, row);
    }
    return undefined;
  }

  /** Last evaluation error for the cell, evaluating on demand. */
  public getFormulaError(column: FormulaColumn, row: FormulaRow): FormulaError | null {
    const col = column as AgColumn;
    const key = this.key(row, col);
    let error = this.cellErrors.get(key);
    if (error === undefined) {
      this.resolveValue(col, row);
      error = this.cellErrors.get(key);
    }
    return error ?? null;
  }

  /** Parse-only check (dialog deferred mode + validation events). */
  public validateExpression(expression: string, options: ValidateOptions = {}): FormulaError | null {
    return validateExpression(expression, options);
  }

  // ------------------------------------------------------------------
  // IFormulaService — invalidation
  // ------------------------------------------------------------------

  public hasCachedRows(): boolean {
    return this.textCache.size > 0 || this.cellErrors.size > 0;
  }

  public isEvaluationActive(): boolean {
    // Ranges resolve against the live displayed-row set, so the CSRM
    // `formulaRowIndex` stamping pass is not needed.
    return false;
  }

  public refreshFormulas(refreshRows: boolean): void {
    this.textCache.clear();
    this.cellErrors.clear();
    this.formatGen++;
    if (refreshRows) {
      // The Community edit service relies on this hook to repaint rows after
      // batch commits; external-store invalidation flows through the same path.
      this.beans.gridApi?.refreshCells({ force: true });
    }
  }

  public refreshRow(row: FormulaRow | string): boolean {
    const rowId = typeof row === 'string' ? row : row.id;
    let removed = false;
    const prefix = `${rowId}:`;
    for (const map of [this.textCache, this.cellErrors]) {
      for (const key of map.keys()) {
        if (key.startsWith(prefix)) {
          map.delete(key);
          removed = true;
        }
      }
    }
    return removed;
  }

  public onRowsChanged(_changedRowNodes: unknown, _newData: boolean | undefined): void {
    // Row set/order changed: drop the external-formula and error caches
    // conservatively — the next render re-reads and repopulates. Parsed ASTs
    // are keyed by text and stay valid.
    this.textCache.clear();
    this.cellErrors.clear();
    this.formatGen++;
  }

  // ------------------------------------------------------------------
  // IFormulaService — per-cell formula hooks
  // ------------------------------------------------------------------

  public isFormula(value: unknown): value is `=${string}` {
    return typeof value === 'string' && value.length > 1 && value.startsWith('=');
  }

  /**
   * Column-model build hook: decides whether per-cell formulas are active and
   * drops caches that depended on the previous column set.
   */
  public setFormulasActive(colDefList: { allowFormula?: boolean }[]): void {
    const anyAllowFormula = colDefList.some((colDef) => colDef?.allowFormula === true);
    this.active = anyAllowFormula && this.eligible();
    this.textCache.clear();
    this.formatGen++;
  }

  public getDataSourceFormula(row: FormulaRow, column: FormulaColumn): string | undefined {
    const col = column as AgColumn;
    if (!col.allowFormula) return undefined;
    const dataSvc = this.formulaDataSvc();
    if (!dataSvc?.hasDataSource()) return undefined;
    const key = this.key(row, col);
    if (this.textCache.has(key)) return this.textCache.get(key);
    const formula = dataSvc.getFormula({ column: col, rowNode: row });
    this.textCache.set(key, formula);
    return formula;
  }

  /**
   * Convert between the long-hand storage form (col/row IDs) and the shorthand
   * display form (A1). `shorthand: true` converts long-hand → shorthand (the
   * display/export direction Community's `useRawFormula` path uses);
   * `false` converts shorthand → long-hand. Non-formulas yield `null`.
   */
  public normaliseFormula(value: string, shorthand: boolean): string | null {
    if (!this.isFormula(value)) return null;
    const format = this.formatOrNull();
    if (!format) return null;
    try {
      return convertFormula(value, format, !shorthand);
    } catch {
      return null;
    }
  }

  public getColByRef(ref: string): AgColumn | null {
    return this.columnModel().getNonPivotColById(ref) ?? null;
  }

  public getColRef(col: FormulaColumn): string | null {
    return col.colId;
  }

  /** Fill-handle/bulk-edit hook: shift a formula's relative references. */
  public updateFormulaByOffset(params: {
    value: string;
    rowDelta?: number;
    columnDelta?: number;
    useRefFormat?: boolean;
  }): string {
    try {
      const format = this.formatOrNull();
      return shiftFormula(format ? { ...params, format } : { ...params });
    } catch (e) {
      if (e instanceof FormulaError && e.code === '#REF!') return params.value;
      throw e;
    }
  }

  /**
   * Grid positions of every reference in a formula, for editor range
   * highlighting. Cells become 1×1 descriptors; ranges their normalised
   * bounds. `[]` when the formula does not parse or the layout is unmappable.
   */
  public formulaRangeDescriptors(formula: string): {
    rowStart: number;
    rowEnd: number;
    columnStart: string;
    columnEnd: string;
  }[] {
    let ast: ExprNode;
    try {
      ast = parseCellFormula(formula);
    } catch {
      return [];
    }
    const format = this.formatOrNull();
    if (!format) return [];
    const descriptors: { rowStart: number; rowEnd: number; columnStart: string; columnEnd: string }[] = [];
    const pushRef = (start: CellRef, end: CellRef): void => {
      try {
        const colA = start.shorthand ? columnPosition(start.letters) : format.positionOf(start.colId);
        const colB = end.shorthand ? columnPosition(end.letters) : format.positionOf(end.colId);
        const rowA = start.shorthand ? start.row - 1 : format.indexOf(start.rowId);
        const rowB = end.shorthand ? end.row - 1 : format.indexOf(end.rowId);
        // Shorthand rows must still exist in the grid (throws #REF! otherwise).
        format.rowIdAt(rowA);
        format.rowIdAt(rowB);
        descriptors.push({
          rowStart: Math.min(rowA, rowB),
          rowEnd: Math.max(rowA, rowB),
          columnStart: format.colIdAt(Math.min(colA, colB)),
          columnEnd: format.colIdAt(Math.max(colA, colB)),
        });
      } catch {
        // Unmappable reference (e.g. beyond the grid) — skip for highlighting.
      }
    };
    const visit = (n: ExprNode): void => {
      switch (n.kind) {
        case 'cell':
          pushRef(n.ref, n.ref);
          break;
        case 'range':
          pushRef(n.start, n.end);
          break;
        case 'binary':
          visit(n.left);
          visit(n.right);
          break;
        case 'unary':
        case 'percent':
          visit(n.operand);
          break;
        case 'call':
          for (const a of n.args) visit(a);
          break;
        default:
          break;
      }
    };
    visit(ast);
    return descriptors;
  }

  public getFunction(name: string): ((params: FormulaFunctionParams) => unknown) | undefined {
    const custom = this.customFunction(name);
    if (custom) return custom as (params: FormulaFunctionParams) => unknown;
    const builtIn = this.builtInFunction(name);
    if (!builtIn) return undefined;
    // Adapter: the engine's built-ins take scalar args with ranges flattened
    // per argument; community-facing params arrive as FormulaParam objects.
    return (params: FormulaFunctionParams) => {
      const args = [...params.args].map((p: FormulaParam) =>
        p.kind === 'value' ? p.value : 'values' in p ? p.values : [...p],
      );
      return builtIn(args);
    };
  }

  public getFunctionNames(): string[] {
    const names = new Set<string>(FORMULA_FUNCTION_NAMES);
    for (const name of Object.keys(this.gos.get('formulaFuncs') ?? {})) names.add(name);
    return [...names].sort();
  }

  // ------------------------------------------------------------------
  // Calculated-column mode (Phase 18 behaviour)
  // ------------------------------------------------------------------

  private resolveCalculated(column: AgColumn, row: FormulaRow): unknown {
    const expression = column.calculatedExpression ?? null;
    if (expression === null || expression === '') {
      this.clearCellError(row, column);
      return null; // empty expression → blank cells
    }
    const ast = this.getCalculatedAst(column, expression);
    if (ast === null) {
      const error = new FormulaError('#PARSE!', `cannot parse "${expression}"`);
      this.storeCellError(row, column, error);
      return error.code;
    }
    this.chain.push(column);
    try {
      const value = evaluate(ast, {
        resolveColumn: (colId) => {
          const ref = this.columnModel().getNonPivotColById(colId);
          if (!ref) throw new FormulaError('#REF!', `unknown column reference [${colId}]`);
          return this.valueService()?.getValueFromData(ref, row) ?? null;
        },
        isResolving: (colId) => this.chain.some((c) => c.colId === colId),
      });
      this.clearCellError(row, column);
      return value;
    } catch (e) {
      return this.fail(row, column, e);
    } finally {
      this.chain.pop();
    }
  }

  /** Forget a column's AST when its expression is removed (column removed). */
  public forgetColumn(column: AgColumn | null | undefined): void {
    if (column) this.astCache.delete(column);
  }

  private getCalculatedAst(column: AgColumn, expression: string): ExprNode | null {
    const cached = this.astCache.get(column);
    if (cached && cached.expression === expression) return cached.ast;
    let ast: ExprNode | null = null;
    try {
      ast = parseExpression(expression);
    } catch (e) {
      if (!(e instanceof FormulaError) || e.code !== '#PARSE!') {
        throw e;
      }
    }
    this.astCache.set(column, { expression, ast });
    if (this.astCache.size > AST_CACHE_LIMIT) {
      const first = this.astCache.keys().next().value;
      if (first !== undefined) this.astCache.delete(first);
    }
    return ast;
  }

  // ------------------------------------------------------------------
  // Per-cell mode
  // ------------------------------------------------------------------

  private resolveCellFormula(column: AgColumn, row: FormulaRow): unknown {
    if (row.group) {
      // Grouping is not supported (docs compatibility table): group-row cells
      // render blank rather than evaluating a row-positioned formula.
      this.clearCellError(row, column);
      return null;
    }
    const raw = this.rawValue(column, row);
    if (!this.isFormula(raw)) {
      this.clearCellError(row, column);
      return raw ?? null;
    }
    if (!this.eligible()) {
      // Unsupported runtime (grouping, tree data, pivot, non-CSR): formula
      // strings render blank rather than evaluating row-positioned references.
      this.clearCellError(row, column);
      return null;
    }
    const ast = this.getCellAst(raw);
    if (ast === null) {
      return this.fail(row, column, new FormulaError('#PARSE!', `cannot parse "${raw}"`));
    }
    const key = this.key(row, column);
    if (this.cellChain.has(key)) {
      throw new FormulaError('#CIRCREF!', `circular reference through ${column.colId}`);
    }
    this.cellChain.add(key);
    try {
      const value = evaluate(ast, {
        mode: 'cell',
        resolveColumn: (colId) => {
          const ref = this.columnModel().getNonPivotColById(colId);
          if (!ref) throw new FormulaError('#REF!', `unknown column reference [${colId}]`);
          return this.valueService()?.getValueFromData(ref, row) ?? null;
        },
        isResolving: (colId) => this.chain.some((c) => c.colId === colId),
        resolveCell: (ref) => this.resolveCellRef(ref),
        resolveRange: (start, end) => this.resolveCellRange(start, end),
        resolveCustomFunction: (name) => this.customFunction(name) as
          | ((params: { row: unknown; column: unknown; args: Iterable<FormulaParamLike>; values: Iterable<unknown> }) => unknown)
          | undefined,
        functionContext: { row, column },
      });
      this.clearCellError(row, column);
      return value;
    } catch (e) {
      return this.fail(row, column, e);
    } finally {
      this.cellChain.delete(key);
    }
  }

  /** The cell's raw (unresolved) value: pending edit, external store, or data field. */
  private rawValue(column: AgColumn, row: FormulaRow): unknown {
    const dataSvc = this.formulaDataSvc();
    if (dataSvc?.hasDataSource()) {
      const stored = this.getDataSourceFormula(row, column);
      if (stored !== undefined) return stored;
    }
    return this.valueService()?.getValue(column, row, 'edit') ?? null;
  }

  private getCellAst(expression: string): ExprNode | null {
    const cached = this.cellAstCache.get(expression);
    if (cached !== undefined) return cached;
    let ast: ExprNode | null = null;
    try {
      ast = parseCellFormula(expression);
    } catch (e) {
      if (!(e instanceof FormulaError) || e.code !== '#PARSE!') {
        throw e;
      }
    }
    this.cellAstCache.set(expression, ast);
    if (this.cellAstCache.size > AST_CACHE_LIMIT) {
      const first = this.cellAstCache.keys().next().value;
      if (first !== undefined) this.cellAstCache.delete(first);
    }
    return ast;
  }

  /** Resolve one cell reference to its evaluated value. */
  private resolveCellRef(ref: CellRef): unknown {
    const format = this.format();
    const colId = ref.shorthand ? format.colIdAt(columnPosition(ref.letters)) : ref.colId;
    const rowIndex = ref.shorthand ? ref.row - 1 : format.indexOf(ref.rowId);
    const rowNode = this.beans.gridApi?.getDisplayedRowAtIndex(rowIndex);
    const refColumn = this.columnModel().getNonPivotColById(colId);
    if (!rowNode || !refColumn) {
      throw new FormulaError('#REF!', `unknown cell reference`);
    }
    return this.readCell(refColumn, rowNode);
  }

  /** Resolve a rectangular range to bounds + row-major values. */
  private resolveCellRange(start: CellRef, end: CellRef) {
    const format = this.format();
    const colA = start.shorthand ? columnPosition(start.letters) : format.positionOf(start.colId);
    const colB = end.shorthand ? columnPosition(end.letters) : format.positionOf(end.colId);
    const rowA = start.shorthand ? start.row - 1 : format.indexOf(start.rowId);
    const rowB = end.shorthand ? end.row - 1 : format.indexOf(end.rowId);
    const colStart = Math.min(colA, colB);
    const colEnd = Math.max(colA, colB);
    const rowStart = Math.min(rowA, rowB);
    const rowEnd = Math.max(rowA, rowB);
    const columns: AgColumn[] = [];
    for (let p = colStart; p <= colEnd; p++) {
      const col = this.columnModel().getNonPivotColById(format.colIdAt(p));
      if (!col) throw new FormulaError('#REF!', 'range references a missing column');
      columns.push(col);
    }
    const values: unknown[] = [];
    for (let r = rowStart; r <= rowEnd; r++) {
      const rowNode = this.beans.gridApi?.getDisplayedRowAtIndex(r);
      if (!rowNode) throw new FormulaError('#REF!', 'range references a missing row');
      for (const col of columns) {
        values.push(this.readCell(col, rowNode));
      }
    }
    return {
      rowStart,
      rowEnd,
      colStart: columns[0],
      colEnd: columns[columns.length - 1],
      values,
    };
  }

  /** Read one cell: referenced formula cells re-resolve; plain cells read committed data. */
  private readCell(refColumn: AgColumn, rowNode: NodeRow): unknown {
    if (refColumn.allowFormula || refColumn.calculatedExpression !== undefined) {
      const key = `${rowNode.id}:${refColumn.colId}`;
      if (this.cellChain.has(key)) {
        throw new FormulaError('#CIRCREF!', `circular reference through ${refColumn.colId}`);
      }
      this.cellChain.add(key);
      try {
        return this.resolveValue(refColumn, rowNode as FormulaRow);
      } finally {
        this.cellChain.delete(key);
      }
    }
    return this.valueService()?.getValueFromData(refColumn, rowNode) ?? null;
  }

  // ------------------------------------------------------------------
  // Grid-layout format map (A1 ⇄ col/row IDs)
  // ------------------------------------------------------------------

  /**
   * Column letters map over the displayed columns (left + centre + right,
   * excluding `ag-Grid-*` service columns); row numbers map over the displayed
   * rows. Rebuilt lazily whenever `formatGen` changes.
   */
  private format(): CellFormulaFormat {
    const cached = this.formatCache;
    if (cached && cached.gen === this.formatGen) {
      return this.formatFrom(cached.colIds, cached.rowIds);
    }
    const colIds = (this.beans.visibleCols?.allCols ?? [])
      .filter((col) => !isServiceColumn(col))
      .map((col) => col.getColId());
    const rowIds: string[] = [];
    const api = this.beans.gridApi;
    if (api) {
      const count = api.getDisplayedRowCount();
      for (let i = 0; i < count; i++) {
        const node = api.getDisplayedRowAtIndex(i);
        rowIds.push(node?.id ?? '');
      }
    }
    this.formatCache = { gen: this.formatGen, colIds, rowIds };
    return this.formatFrom(colIds, rowIds);
  }

  private formatFrom(colIds: string[], rowIds: string[]): CellFormulaFormat {
    return {
      colIdAt: (position) => {
        const colId = colIds[position];
        if (colId === undefined) throw new FormulaError('#REF!', `column position ${position} is outside the grid`);
        return colId;
      },
      positionOf: (colId) => {
        const position = colIds.indexOf(colId);
        if (position === -1) throw new FormulaError('#REF!', `unknown column "${colId}"`);
        return position;
      },
      rowIdAt: (index) => {
        const rowId = rowIds[index];
        if (rowId === undefined || rowId === '') throw new FormulaError('#REF!', `row ${index} is outside the grid`);
        return rowId;
      },
      indexOf: (rowId) => {
        const index = rowIds.indexOf(rowId);
        if (index === -1) throw new FormulaError('#REF!', `unknown row "${rowId}"`);
        return index;
      },
    };
  }

  private formatOrNull(): CellFormulaFormat | null {
    try {
      return this.format();
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------------------
  // Functions
  // ------------------------------------------------------------------

  private customFunction(
    name: string,
  ):
    | ((params: { row: unknown; column: unknown; args: Iterable<FormulaParamLike>; values: Iterable<unknown> }) => unknown)
    | undefined {
    const funcs = this.gos.get('formulaFuncs');
    if (!funcs) return undefined;
    const entry = funcs[name] ?? funcs[name.toUpperCase()];
    return entry?.func as
      | ((params: { row: unknown; column: unknown; args: Iterable<FormulaParamLike>; values: Iterable<unknown> }) => unknown)
      | undefined;
  }

  private builtInFunction(name: string): ((args: unknown[]) => unknown) | undefined {
    return getFormulaFunction(name);
  }

  // ------------------------------------------------------------------
  // Eligibility + helpers
  // ------------------------------------------------------------------

  /**
   * Per-cell formulas are a CSR feature (docs compatibility table): server-side,
   * infinite and viewport row models, tree data, pivot mode and active row
   * grouping all keep `active` off.
   */
  private eligible(): boolean {
    if (this.gos.get('rowModelType') !== 'clientSide') return false;
    if (this.gos.get('treeData')) return false;
    if (this.columnModel().pivotMode) return false;
    const groupColumns = this.beans.rowGroupColsSvc?.columns;
    if (groupColumns && groupColumns.length > 0) return false;
    return true;
  }

  private fail(row: FormulaRow, column: AgColumn, e: unknown): string {
    const error =
      e instanceof FormulaError ? e : new FormulaError('#ERROR!', e instanceof Error ? e.message : String(e));
    this.storeCellError(row, column, error);
    return error.code;
  }

  private columnModel(): ColumnModelLike {
    const colModel = this.beans.colModel as ColumnModelLike | undefined;
    if (!colModel) throw new Error('formulas: colModel bean missing');
    return colModel;
  }

  private valueService(): ValueServiceLike | undefined {
    return this.beans.valueSvc as ValueServiceLike | undefined;
  }

  private formulaDataSvc(): IFormulaDataService | undefined {
    return this.beans.formulaDataSvc;
  }

  private key(row: FormulaRow, column: AgColumn): string {
    return `${row.id}:${column.colId}`;
  }

  private storeCellError(row: FormulaRow, column: AgColumn, error: FormulaError): void {
    if (this.cellErrors.size > 20_000) this.cellErrors.clear();
    this.cellErrors.set(this.key(row, column), error);
  }

  private clearCellError(row: FormulaRow, column: AgColumn): void {
    this.cellErrors.delete(this.key(row, column));
  }
}
