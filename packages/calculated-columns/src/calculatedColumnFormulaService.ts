import { BeanStub, type AgColumn, type IFormulaService, type NamedBean } from 'ag-grid-community';
import {
  FORMULA_FUNCTION_NAMES,
  FormulaError,
  getFormulaFunction,
  type ExprNode,
  evaluate,
  parseExpression,
  validateExpression,
  type ValidateOptions,
} from './expression';

type FormulaColumn = Parameters<IFormulaService['resolveValue']>[0];
type FormulaRow = Parameters<IFormulaService['resolveValue']>[1];
type ChangedRowNodes = Parameters<IFormulaService['onRowsChanged']>[0];

interface ValueServiceLike {
  getValueFromData(column: AgColumn, rowNode: FormulaRow, ignoreAggData?: boolean): unknown;
}

interface ColumnModelLike {
  getNonPivotColById(colId: string): AgColumn | undefined;
}

/**
 * The `formula` bean — Community's formula seam, implemented for calculated
 * columns (gap-plan A2). Community routes every calculated-column cell value
 * through `formula.resolveValue(column, rowNode)` (ValueService hot path) and
 * drives the formula-error CSS class + cell tooltip from
 * `formula.getFormulaError(column, rowNode)`, so this service is the whole
 * value pipeline for `colDef.calculatedExpression`.
 *
 * Scope: same-row bracket references, the public operator set and the public
 * provided functions. Per-cell formulas (the `=` value form, `FormulaModule`,
 * gap-plan A1) are not implemented: `active` stays `false`, the data-source
 * hooks return no data, and `resolveValue` for non-calculated columns yields
 * `undefined`. The engine in `expression.ts` is written to be reused by A1
 * (its function registry is exposed through `getFunction`/`getFunctionNames`).
 *
 * @feature CalculatedColumns
 */
export class CalculatedColumnFormulaService extends BeanStub implements IFormulaService, NamedBean {
  public readonly beanName = 'formula' as const;

  /** No per-cell formula values are stored (A1 scope) — the flag stays false. */
  public active = false;

  /** Parsed-AST cache, keyed by the column instance and its expression text. */
  private astCache = new Map<AgColumn, { expression: string; ast: ExprNode | null }>();
  /** Errors per cell, keyed `${rowId}:${colId}`; bounded, cleared on refresh. */
  private cellErrors = new Map<string, FormulaError>();
  /** Active resolution chain (single-threaded recursion) for #CIRCREF!. */
  private chain: AgColumn[] = [];

  public override destroy(): void {
    this.astCache.clear();
    this.cellErrors.clear();
    super.destroy();
  }

  // ------------------------------------------------------------------
  // IFormulaService — value pipeline
  // ------------------------------------------------------------------

  public resolveValue(column: FormulaColumn, row: FormulaRow): unknown {
    if (!this.isCalculated(column)) return undefined;
    const expression = this.expressionOf(column);
    if (expression === null || expression === '') {
      this.clearCellError(row, column);
      return null; // empty expression → blank cells
    }
    const ast = this.getAst(column, expression);
    if (ast === null) {
      const error = new FormulaError('#PARSE!', `cannot parse "${expression}"`);
      this.storeCellError(row, column, error);
      return error.code;
    }
    this.chain.push(column as AgColumn);
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
      const error =
        e instanceof FormulaError ? e : new FormulaError('#ERROR!', e instanceof Error ? e.message : String(e));
      this.storeCellError(row, column, error);
      return error.code;
    } finally {
      this.chain.pop();
    }
  }

  /** Last evaluation error for the cell, evaluating on demand. */
  public getFormulaError(column: FormulaColumn, row: FormulaRow): FormulaError | null {
    if (!this.isCalculated(column)) return null;
    const expression = this.expressionOf(column);
    if (expression === null || expression === '') return null;
    const key = this.key(row, column);
    let error = this.cellErrors.get(key);
    if (error === undefined) {
      this.resolveValue(column, row);
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
    return this.cellErrors.size > 0;
  }

  public isEvaluationActive(): boolean {
    return false;
  }

  public refreshFormulas(): void {
    this.cellErrors.clear();
  }

  public refreshRow(row: FormulaRow | string): boolean {
    const rowId = typeof row === 'string' ? row : row.id;
    let removed = false;
    const prefix = `${rowId}:`;
    for (const key of this.cellErrors.keys()) {
      if (key.startsWith(prefix)) {
        this.cellErrors.delete(key);
        removed = true;
      }
    }
    return removed;
  }

  public onRowsChanged(_changedRowNodes: ChangedRowNodes, newData: boolean | undefined): void {
    if (newData) {
      this.cellErrors.clear();
      return;
    }
    // Row set/order changed without a full data reset: drop per-cell errors
    // conservatively — the next render re-evaluates and repopulates.
    this.cellErrors.clear();
  }

  // ------------------------------------------------------------------
  // IFormulaService — per-cell formula hooks (A1 scope: no-ops)
  // ------------------------------------------------------------------

  public isFormula(value: unknown): value is `=${string}` {
    return typeof value === 'string' && value.length > 1 && value.startsWith('=');
  }

  public setFormulasActive(_columns: AgColumn[]): void {
    // A1 scope — no per-cell formulas.
  }

  public getDataSourceFormula(_row: FormulaRow, _column: FormulaColumn): string | undefined {
    return undefined;
  }

  public normaliseFormula(value: string): string | null {
    return value;
  }

  public getColByRef(ref: string): AgColumn | null {
    return this.columnModel().getNonPivotColById(ref) ?? null;
  }

  public getColRef(col: FormulaColumn): string | null {
    return col.colId;
  }

  public updateFormulaByOffset(params: { value: string; rowDelta?: number; columnDelta?: number; useRefFormat?: boolean }): string {
    return params.value;
  }

  public getFunction(name: string): ((params: unknown) => unknown) | undefined {
    return getFormulaFunction(name) as ((params: unknown) => unknown) | undefined;
  }

  public getFunctionNames(): string[] {
    return [...FORMULA_FUNCTION_NAMES];
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  /** Forget a column's AST when its expression is removed (column removed). */
  public forgetColumn(column: AgColumn | null | undefined): void {
    if (column) this.astCache.delete(column);
  }

  private isCalculated(column: FormulaColumn): boolean {
    return (column as AgColumn).calculatedExpression !== undefined;
  }

  private expressionOf(column: FormulaColumn): string | null {
    return (column as AgColumn).calculatedExpression ?? null;
  }

  private getAst(column: AgColumn, expression: string): ExprNode | null {
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
    if (this.astCache.size > 1024) {
      const first = this.astCache.keys().next().value;
      if (first !== undefined) this.astCache.delete(first);
    }
    return ast;
  }

  private columnModel(): ColumnModelLike {
    const colModel = (this.beans as unknown as { colModel?: ColumnModelLike }).colModel;
    if (!colModel) throw new Error('calculated-columns: colModel bean missing');
    return colModel;
  }

  private valueService(): ValueServiceLike | undefined {
    return (this.beans as unknown as { valueSvc?: ValueServiceLike }).valueSvc;
  }

  private key(row: FormulaRow, column: FormulaColumn): string {
    return `${row.id}:${column.colId}`;
  }

  private storeCellError(row: FormulaRow, column: FormulaColumn, error: FormulaError): void {
    if (this.cellErrors.size > 20_000) this.cellErrors.clear();
    this.cellErrors.set(this.key(row, column), error);
  }

  private clearCellError(row: FormulaRow, column: FormulaColumn): void {
    this.cellErrors.delete(this.key(row, column));
  }
}

