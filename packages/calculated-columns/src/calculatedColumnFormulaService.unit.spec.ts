/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { AgColumn, type ColDef } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { CalculatedColumnFormulaService } from './calculatedColumnFormulaService';
import { FormulaError } from './expression';

function makeColumn(colId: string, calculatedExpression?: string): AgColumn {
  const col = new AgColumn({ field: colId } as ColDef, null, colId, true, 'user');
  col.calculatedExpression = calculatedExpression;
  return col;
}

interface Harness {
  bean: CalculatedColumnFormulaService;
  columns: Map<string, AgColumn>;
  values: Map<string, unknown>;
  destroy(): void;
}

function makeService(): Harness {
  const columns = new Map<string, AgColumn>();
  const values = new Map<string, unknown>();
  const harness = makeBeanHarness(CalculatedColumnFormulaService, {
    beans: {
      colModel: { getNonPivotColById: (colId: string) => columns.get(colId) },
      valueSvc: { getValueFromData: (col: AgColumn) => values.get(col.colId) },
    },
  });
  return { bean: harness.bean, columns, values, destroy: harness.destroy };
}

const ROW = { id: 'r1' } as Parameters<CalculatedColumnFormulaService['resolveValue']>[1];

afterEach(() => {
  document.body.replaceChildren();
});

describe('CalculatedColumnFormulaService (unit)', () => {
  it('resolves nothing for non-calculated columns', () => {
    const { bean, destroy } = makeService();
    expect(bean.resolveValue(makeColumn('plain'), ROW)).toBeUndefined();
    expect(bean.getFormulaError(makeColumn('plain'), ROW)).toBeNull();
    destroy();
  });

  it('returns blank for empty expressions without errors', () => {
    const { bean, destroy } = makeService();
    const col = makeColumn('calc', '');
    expect(bean.resolveValue(col, ROW)).toBeNull();
    expect(bean.getFormulaError(col, ROW)).toBeNull();
    destroy();
  });

  it('evaluates bracket references against same-row values', () => {
    const { bean, columns, values, destroy } = makeService();
    columns.set('a', makeColumn('a'));
    columns.set('b', makeColumn('b'));
    values.set('a', 10);
    values.set('b', 4);
    const calc = makeColumn('calc', '[a] - [b]');
    expect(bean.resolveValue(calc, ROW)).toBe(6);
    expect(bean.getFormulaError(calc, ROW)).toBeNull();
    destroy();
  });

  it('returns error codes as the cell value and reports the error', () => {
    const { bean, columns, values, destroy } = makeService();
    columns.set('a', makeColumn('a'));
    values.set('a', 1);

    const missing = makeColumn('missing', '[nope] + 1');
    expect(bean.resolveValue(missing, ROW)).toBe('#REF!');
    expect(bean.getFormulaError(missing, ROW)?.code).toBe('#REF!');

    const parse = makeColumn('parse', '[a] +');
    expect(bean.resolveValue(parse, ROW)).toBe('#PARSE!');
    expect(bean.getFormulaError(parse, ROW)?.code).toBe('#PARSE!');

    const divZero = makeColumn('divzero', '1 / 0');
    expect(bean.resolveValue(divZero, ROW)).toBe('#DIV/0!');
    destroy();
  });

  it('detects circular references through the resolution chain', () => {
    const { bean, columns, destroy } = makeService();
    const calc = makeColumn('calc', '[calc] + 1');
    columns.set('calc', calc);
    expect(bean.resolveValue(calc, ROW)).toBe('#CIRCREF!');
    expect(bean.getFormulaError(calc, ROW)?.code).toBe('#CIRCREF!');
    destroy();
  });

  it('evaluates errors on demand through getFormulaError', () => {
    const { bean, columns, destroy } = makeService();
    columns.set('a', makeColumn('a'));
    const calc = makeColumn('calc', '[a] +');
    const error = bean.getFormulaError(calc, ROW);
    expect(error?.code).toBe('#PARSE!');
    destroy();
  });

  it('validates expressions (syntax and references)', () => {
    const { bean, columns, destroy } = makeService();
    columns.set('a', makeColumn('a'));
    expect(bean.validateExpression('[a] + 1')).toBeNull();
    expect(bean.validateExpression('[a] +')?.code).toBe('#PARSE!');
    expect(
      bean.validateExpression('[x] + 1', { resolveReference: (id) => id === 'a' })?.code,
    ).toBe('#REF!');
    destroy();
  });

  it('invalidates errors via refreshRow / refreshFormulas / onRowsChanged', () => {
    const { bean, columns, destroy } = makeService();
    columns.set('a', makeColumn('a'));
    const calc = makeColumn('calc', '[a] +');
    expect(bean.getFormulaError(calc, ROW)?.code).toBe('#PARSE!');
    expect(bean.hasCachedRows()).toBe(true);

    expect(bean.refreshRow('r1')).toBe(true);
    expect(bean.refreshRow('r1')).toBe(false);
    expect(bean.hasCachedRows()).toBe(false);

    bean.getFormulaError(calc, ROW);
    expect(bean.hasCachedRows()).toBe(true);
    bean.onRowsChanged(undefined, true);
    expect(bean.hasCachedRows()).toBe(false);

    bean.getFormulaError(calc, ROW);
    bean.onRowsChanged(undefined, false);
    expect(bean.hasCachedRows()).toBe(false);

    bean.getFormulaError(calc, ROW);
    bean.refreshFormulas();
    expect(bean.hasCachedRows()).toBe(false);
    destroy();
  });

  it('exposes the formula-data hooks as A1-scope no-ops', () => {
    const { bean, columns, destroy } = makeService();
    columns.set('a', makeColumn('a'));
    expect(bean.isFormula('=1+1')).toBe(true);
    expect(bean.isFormula('1+1')).toBe(false);
    expect(bean.isFormula('=')).toBe(false);
    expect(bean.active).toBe(false);
    expect(bean.isEvaluationActive()).toBe(false);
    expect(bean.getDataSourceFormula(ROW, makeColumn('a'))).toBeUndefined();
    expect(bean.normaliseFormula('=1+1')).toBe('=1+1');
    expect(bean.getColByRef('a')).toBe(columns.get('a'));
    expect(bean.getColByRef('nope')).toBeNull();
    expect(bean.getColRef(makeColumn('a'))).toBe('a');
    expect(
      bean.updateFormulaByOffset({ value: '[a]+1', rowDelta: 1, columnDelta: 1 }),
    ).toBe('[a]+1');
    bean.setFormulasActive([makeColumn('a')]);
    destroy();
  });

  it('exposes the function registry', () => {
    const { bean, destroy } = makeService();
    expect(bean.getFunctionNames()).toContain('SUM');
    expect(bean.getFunctionNames()).toContain('IF');
    expect(bean.getFunction('SUM')).toBeTypeOf('function');
    expect(bean.getFunction('NOPE')).toBeUndefined();
    destroy();
  });

  it('drops a column AST on forgetColumn', () => {
    const { bean, columns, values, destroy } = makeService();
    columns.set('a', makeColumn('a'));
    values.set('a', 1);
    const calc = makeColumn('calc', '[a] + 1');
    expect(bean.resolveValue(calc, ROW)).toBe(2);
    bean.forgetColumn(calc);
    bean.forgetColumn(undefined);
    destroy();
  });

  it('wraps unexpected evaluation failures as #ERROR!', () => {
    const { bean, columns, values, destroy } = makeService();
    columns.set('a', makeColumn('a'));
    values.set('a', { toString: () => { throw new Error('boom'); } });
    const calc = makeColumn('calc', '[a] & "x"');
    expect(bean.resolveValue(calc, ROW)).toBe('#ERROR!');
    const err = bean.getFormulaError(calc, ROW);
    expect(err).toBeInstanceOf(FormulaError);
    expect(err?.code).toBe('#ERROR!');
    destroy();
  });

  it('refreshes rows by RowNode or id', () => {
    const { bean, columns, destroy } = makeService();
    columns.set('a', makeColumn('a'));
    const calc = makeColumn('calc', '[a] +');
    bean.getFormulaError(calc, ROW);
    expect(bean.hasCachedRows()).toBe(true);
    expect(bean.refreshRow({ id: 'r1' } as Parameters<CalculatedColumnFormulaService['refreshRow']>[0])).toBe(true);
    expect(bean.hasCachedRows()).toBe(false);
    destroy();
  });
});
