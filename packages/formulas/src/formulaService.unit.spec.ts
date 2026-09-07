/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { AgColumn, type ColDef } from 'ag-grid-community';
import { makeBeanHarness, type BeanHarness } from '@libregrid/core/testing';
import { FormulaDataService, type FormulaDataSource } from './formulaDataService';
import { FormulaService } from './formulaService';
import { FormulaError } from './expression';

function makeColumn(colId: string, allowFormula?: boolean, calculatedExpression?: string): AgColumn {
  const col = new AgColumn({ field: colId } as ColDef, null, colId, true, 'user');
  col.allowFormula = allowFormula === true;
  col.calculatedExpression = calculatedExpression;
  return col;
}

interface Harness {
  bean: FormulaService;
  gos: BeanHarness<FormulaService>['gos'];
  beans: BeanHarness<FormulaService>['beans'];
  columns: Map<string, AgColumn>;
  values: Map<string, unknown>;
  rows: Map<string, { id: string; group?: boolean }>;
  destroy(): void;
}

const COL_IDS = ['a', 'b', 'calc'];
const ROW_IDS = ['r1', 'r2', 'r3'];

function makeService(gridOptions: Record<string, unknown> = {}): Harness {
  const columns = new Map<string, AgColumn>();
  const values = new Map<string, unknown>();
  const rows = new Map<string, { id: string; group?: boolean }>();
  for (const id of ROW_IDS) rows.set(id, { id });
  const harness = makeBeanHarness(FormulaService, {
    gridOptions: { rowModelType: 'clientSide', ...gridOptions },
    beans: {
      colModel: {
        getNonPivotColById: (colId: string) => columns.get(colId),
        pivotMode: false,
      },
      valueSvc: {
        // Raw reads include the pending-edit path; the unit stub returns the map value.
        getValue: (col: AgColumn) => values.get(col.colId),
        getValueFromData: (col: AgColumn, rowNode: { id: string }) =>
          values.get(`${col.colId}@${rowNode.id}`) ?? values.get(col.colId),
      },
      // Lazy getter — reflects the columns the individual test seeds.
      visibleCols: {
        get allCols() {
          return COL_IDS.map((id) => columns.get(id)!).filter(Boolean);
        },
      },
      gridApi: {
        getDisplayedRowAtIndex: (index: number) => [...rows.values()][index] ?? undefined,
        getDisplayedRowCount: () => rows.size,
        refreshCells: (_params: unknown) => undefined,
      },
    },
  });
  return { bean: harness.bean, gos: harness.gos, beans: harness.beans, columns, values, rows, destroy: harness.destroy };
}

const ROW = { id: 'r1' } as unknown as Parameters<FormulaService['resolveValue']>[1];

function seedColumns(h: Harness, allow = true): void {
  h.columns.set('a', makeColumn('a'));
  h.columns.set('b', makeColumn('b'));
  h.columns.set('calc', makeColumn('calc', allow));
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('FormulaService — active/eligibility', () => {
  it('activates only with allowFormula columns on an eligible grid', () => {
    const h = makeService();
    h.bean.setFormulasActive([{ allowFormula: true }, {}]);
    expect(h.bean.active).toBe(true);
    h.bean.setFormulasActive([{}]);
    expect(h.bean.active).toBe(false);
    h.destroy();
  });

  it('stays inactive for non-CSR row models, tree data, pivot mode and grouping', () => {
    for (const gridOptions of [
      { rowModelType: 'serverSide' },
      { rowModelType: 'infinite' },
      { rowModelType: 'viewport' },
      { treeData: true },
    ]) {
      const h = makeService(gridOptions);
      h.bean.setFormulasActive([{ allowFormula: true }]);
      expect(h.bean.active).toBe(false);
      h.destroy();
    }
    const pivot = makeService();
    (pivot.beans as unknown as { colModel: { pivotMode: boolean } }).colModel.pivotMode = true;
    pivot.bean.setFormulasActive([{ allowFormula: true }]);
    expect(pivot.bean.active).toBe(false);
    pivot.destroy();
    const grouped = makeService();
    (grouped.beans as unknown as { rowGroupColsSvc?: { columns: unknown[] } }).rowGroupColsSvc = { columns: [{}] };
    grouped.bean.setFormulasActive([{ allowFormula: true }]);
    expect(grouped.bean.active).toBe(false);
    grouped.destroy();
  });
});

describe('FormulaService — per-cell formulas', () => {
  it('evaluates a data-supplied A1 formula against displayed columns/rows', () => {
    const h = makeService();
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    h.values.set('a', 10);
    h.values.set('b', 4);
    h.values.set('calc', '=B1 + A1');
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe(14);
    h.destroy();
  });

  it('passes plain values through untouched', () => {
    const h = makeService();
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    h.values.set('calc', 'just text');
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe('just text');
    h.destroy();
  });

  it('renders blank on group rows (grouping unsupported)', () => {
    const h = makeService();
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    h.values.set('calc', '=A1 + 1');
    const groupRow = { id: 'r1', group: true } as unknown as Parameters<FormulaService['resolveValue']>[1];
    expect(h.bean.resolveValue(h.columns.get('calc')!, groupRow)).toBeNull();
    h.destroy();
  });

  it('reports spreadsheet error codes as cell values', () => {
    const h = makeService();
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    for (const [formula, code] of [
      ['=A1 +', '#PARSE!'],
      ['=ZZ1 + 1', '#REF!'],
      ['=1 / 0', '#DIV/0!'],
      ['=NOPE(1)', '#NAME?'],
    ] as const) {
      h.values.set('calc', formula);
      expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe(code);
      expect(h.bean.getFormulaError(h.columns.get('calc')!, ROW)?.code).toBe(code);
    }
    h.destroy();
  });

  it('detects circular chains across formula cells', () => {
    const h = makeService();
    seedColumns(h);
    h.columns.set('a', makeColumn('a', true));
    h.bean.setFormulasActive([{ allowFormula: true }]);
    h.values.set('calc', '=A1 + 1');
    // a:r1 points back at calc:r1
    h.values.set('a', '=B1 + 1');
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe('#CIRCREF!');
    h.destroy();
  });

  it('resolves ranges over the displayed grid', () => {
    const h = makeService();
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    h.values.set('a', 1);
    h.values.set('b', 2);
    h.values.set('calc', '=SUM(A1:B1)');
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe(3);
    h.destroy();
  });

  it('returns undefined for non-formula columns', () => {
    const h = makeService();
    seedColumns(h);
    expect(h.bean.resolveValue(h.columns.get('a')!, ROW)).toBeUndefined();
    h.destroy();
  });
});

describe('FormulaService — external formula data source', () => {
  function makeDataStore(h: Harness): Map<string, string | undefined> {
    const store = new Map<string, string | undefined>();
    const dataSource: FormulaDataSource = {
      getFormula: ({ column, rowNode }) => store.get(`${rowNode.id}-${column.colId}`),
      setFormula: ({ column, rowNode, formula }) => {
        const key = `${rowNode.id}-${column.colId}`;
        if (formula === undefined) store.delete(key);
        else store.set(key, formula);
      },
    };
    const dataHarness = makeBeanHarness(FormulaDataService, {
      gridOptions: { formulaDataSource: dataSource },
      beans: {},
    });
    (h.beans as unknown as Record<string, unknown>).formulaDataSvc = dataHarness.bean;
    return store;
  }

  it('resolves formulas from the external store and caches the text', () => {
    const h = makeService();
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    const store = makeDataStore(h);
    h.values.set('a', 5);
    store.set('r1-calc', '=A1 * 2');
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe(10);
    expect(h.bean.hasCachedRows()).toBe(true);
    h.destroy();
  });

  it('prefers the external store over row data', () => {
    const h = makeService();
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    const store = makeDataStore(h);
    h.values.set('a', 5);
    h.values.set('calc', '=999');
    store.set('r1-calc', '=A1 * 2');
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe(10);
    h.destroy();
  });

  it('invalidates the text cache via refreshFormulas / refreshRow / onRowsChanged', () => {
    const h = makeService();
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    const store = makeDataStore(h);
    h.values.set('a', 5);
    store.set('r1-calc', '=A1');
    const calc = h.columns.get('calc')!;
    expect(h.bean.resolveValue(calc, ROW)).toBe(5);

    // Store mutation visible only after invalidation.
    store.set('r1-calc', '=A1 * 10');
    expect(h.bean.resolveValue(calc, ROW)).toBe(5);
    expect(h.bean.refreshFormulas(true)).toBeUndefined();
    expect(h.bean.resolveValue(calc, ROW)).toBe(50);

    store.set('r1-calc', '=A1 * 100');
    expect(h.bean.refreshRow('r1')).toBe(true);
    expect(h.bean.resolveValue(calc, ROW)).toBe(500);

    store.set('r1-calc', '=A1 * 1000');
    h.bean.onRowsChanged(undefined, true);
    expect(h.bean.resolveValue(calc, ROW)).toBe(5000);
    h.destroy();
  });
});

describe('FormulaService — custom functions', () => {
  it('consults formulaFuncs before the built-ins and passes params through', () => {
    const h = makeService({ formulaFuncs: { DOUBLE: { func: (params: { values: Iterable<unknown> }) => [...params.values].reduce((s: number, v) => s + (v as number), 0) * 2 } } });
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    h.values.set('a', 3);
    h.values.set('calc', '=DOUBLE(A1) + DOUBLE(1, 2)');
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe(12); // 6 + 6
    expect(h.bean.getFunctionNames()).toContain('DOUBLE');
    h.destroy();
  });

  it('surfaces custom function throws as #ERROR!', () => {
    const h = makeService({ formulaFuncs: { BOOM: { func: () => { throw new Error('bad'); } } } });
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    h.values.set('calc', '=BOOM(1)');
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe('#ERROR!');
    h.destroy();
  });

  it('adapts built-ins to the FormulaFunctionParams shape', () => {
    const h = makeService();
    seedColumns(h);
    const sum = h.bean.getFunction('SUM')!;
    const range = { kind: 'range', rowStart: 0, rowEnd: 0, colStart: {}, colEnd: {}, values: [1, 2, 3] };
    expect(sum({ row: ROW, column: h.columns.get('a')!, args: [range, { kind: 'value', value: 4 }], values: [1, 2, 3, 4] } as never)).toBe(10);
    expect(h.bean.getFunction('NOPE')).toBeUndefined();
    h.destroy();
  });
});

describe('FormulaService — normalise and offsets', () => {
  it('converts long-hand ⇄ shorthand with the live layout', () => {
    const h = makeService();
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    expect(h.bean.normaliseFormula('=[a:r1] + [b:r2]', true)).toBe('=A1 + B2');
    expect(h.bean.normaliseFormula('=A1 + B2', false)).toBe('=[a:r1] + [b:r2]');
    expect(h.bean.normaliseFormula('plain', true)).toBeNull();
    h.destroy();
  });

  it('shifts references for the fill handle', () => {
    const h = makeService();
    seedColumns(h);
    expect(h.bean.updateFormulaByOffset({ value: '=B2 + A1', rowDelta: 1 })).toBe('=B3 + A2');
    expect(h.bean.updateFormulaByOffset({ value: '=$A$1 + B2', rowDelta: 1 })).toBe('=$A$1 + B3');
    h.destroy();
  });

  it('maps formula references to grid range descriptors', () => {
    const h = makeService();
    seedColumns(h);
    h.bean.setFormulasActive([{ allowFormula: true }]);
    expect(h.bean.formulaRangeDescriptors('=SUM(A1:B2)')).toEqual([
      { rowStart: 0, rowEnd: 1, columnStart: 'a', columnEnd: 'b' },
    ]);
    expect(h.bean.formulaRangeDescriptors('=C4')).toEqual([]);
    h.destroy();
  });
});

describe('FormulaService — calculated-column mode (Phase 18 regression)', () => {
  it('still evaluates same-row bracket expressions', () => {
    const h = makeService();
    seedColumns(h, false);
    h.columns.set('calc', makeColumn('calc', false, '[a] - [b]'));
    h.values.set('a', 10);
    h.values.set('b', 4);
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe(6);
    expect(h.bean.getFormulaError(h.columns.get('calc')!, ROW)).toBeNull();
    h.destroy();
  });

  it('reports parse and reference errors for calculated columns', () => {
    const h = makeService();
    seedColumns(h, false);
    h.columns.set('calc', makeColumn('calc', false, '[nope] + 1'));
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe('#REF!');
    h.columns.set('calc', makeColumn('calc', false, '[a] +'));
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe('#PARSE!');
    h.destroy();
  });

  it('detects circular calculated references through the column chain', () => {
    const h = makeService();
    seedColumns(h, false);
    h.columns.set('calc', makeColumn('calc', false, '[calc] + 1'));
    expect(h.bean.resolveValue(h.columns.get('calc')!, ROW)).toBe('#CIRCREF!');
    h.destroy();
  });

  it('validates expressions for the dialog', () => {
    const h = makeService();
    seedColumns(h);
    expect(h.bean.validateExpression('[a] + 1')).toBeNull();
    expect(h.bean.validateExpression('[a] +')?.code).toBe('#PARSE!');
    expect(h.bean.validateExpression('A1 +', { mode: 'cell' })?.code).toBe('#PARSE!');
    h.destroy();
  });

  it('reports errors on demand through getFormulaError', () => {
    const h = makeService();
    seedColumns(h, false);
    h.columns.set('calc', makeColumn('calc', false, '[a] +'));
    expect(h.bean.getFormulaError(h.columns.get('calc')!, ROW)?.code).toBe('#PARSE!');
    expect(h.bean.hasCachedRows()).toBe(true);
    h.bean.refreshRow('r1');
    expect(h.bean.hasCachedRows()).toBe(false);
    h.destroy();
  });
});

describe('FormulaError', () => {
  it('carries the code as the rendered text', () => {
    expect(new FormulaError('#REF!', 'x').code).toBe('#REF!');
  });
});
