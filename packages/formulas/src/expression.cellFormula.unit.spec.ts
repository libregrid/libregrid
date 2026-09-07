import { describe, expect, it } from 'vitest';
import {
  FormulaError,
  columnLetters,
  columnPosition,
  convertFormula,
  evaluate,
  parseCellFormula,
  referencedCells,
  referencedColumnIds,
  shiftFormula,
  stringifyCellFormula,
  validateExpression,
  type CellFormulaFormat,
  type ExprNode,
} from './expression';

/**
 * A tiny in-memory grid for the evaluator hooks: columns `a`,`b`,`c` mapped to
 * A1 letters A..C; rows `r1`..`r3` mapped to A1 rows 1..3 with numeric values.
 */
function makeGrid() {
  const colIds = ['a', 'b', 'c'];
  const rowIds = ['r1', 'r2', 'r3'];
  const cells = new Map<string, unknown>([
    ['a:r1', 1],
    ['b:r1', 2],
    ['c:r1', 3],
    ['a:r2', 10],
    ['b:r2', 20],
    ['c:r2', 30],
    ['a:r3', 100],
    ['b:r3', 200],
    ['c:r3', 300],
  ]);
  const format: CellFormulaFormat = {
    colIdAt: (p) => {
      if (p < 0 || p >= colIds.length) throw new FormulaError('#REF!', 'outside grid');
      return colIds[p]!;
    },
    positionOf: (colId) => {
      const p = colIds.indexOf(colId);
      if (p === -1) throw new FormulaError('#REF!', 'unknown col');
      return p;
    },
    rowIdAt: (i) => {
      if (i < 0 || i >= rowIds.length) throw new FormulaError('#REF!', 'outside grid');
      return rowIds[i]!;
    },
    indexOf: (rowId) => {
      const i = rowIds.indexOf(rowId);
      if (i === -1) throw new FormulaError('#REF!', 'unknown row');
      return i;
    },
  };
  const resolving = new Set<string>();
  const evaluator = {
    mode: 'cell' as const,
    resolveColumn: (colId: string) => cells.get(`${colId}:r1`) ?? null,
    isResolving: (colId: string) => resolving.has(colId),
    resolveCell: (ref: { shorthand: boolean } & Record<string, unknown>) => {
      const colId = ref.shorthand ? format.colIdAt(columnPosition(ref.letters as string)) : (ref.colId as string);
      const rowIndex = ref.shorthand ? (ref.row as number) - 1 : format.indexOf(ref.rowId as string);
      const rowId = format.rowIdAt(rowIndex);
      const key = `${colId}:${rowId}`;
      if (resolving.has(key)) throw new FormulaError('#CIRCREF!', `circular ${key}`);
      resolving.add(key);
      try {
        return cells.get(key) ?? null;
      } finally {
        resolving.delete(key);
      }
    },
    resolveRange: (start: never, end: never) => {
      const bounds = (ref: { shorthand: boolean } & Record<string, unknown>) => ({
        col: ref.shorthand ? columnPosition(ref.letters as string) : format.positionOf(ref.colId as string),
        row: ref.shorthand ? (ref.row as number) - 1 : format.indexOf(ref.rowId as string),
      });
      const a = bounds(start);
      const b = bounds(end);
      const colStart = Math.min(a.col, b.col);
      const colEnd = Math.max(a.col, b.col);
      const rowStart = Math.min(a.row, b.row);
      const rowEnd = Math.max(a.row, b.row);
      const values: unknown[] = [];
      for (let r = rowStart; r <= rowEnd; r++) {
        for (let c = colStart; c <= colEnd; c++) {
          values.push(cells.get(`${format.colIdAt(c)}:${format.rowIdAt(r)}`) ?? null);
        }
      }
      return {
        rowStart,
        rowEnd,
        colStart: format.colIdAt(colStart),
        colEnd: format.colIdAt(colEnd),
        values,
      };
    },
  };
  return { cells, format, evaluator, set: (colId: string, rowId: string, v: unknown) => cells.set(`${colId}:${rowId}`, v) };
}

function evalCell(source: string, grid = makeGrid()): unknown {
  return evaluate(parseCellFormula(source), grid.evaluator as never);
}

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (e) {
    if (e instanceof FormulaError) return e.code;
    throw e;
  }
  return 'no error';
}

describe('cell formula parsing (A1 notation)', () => {
  it('parses and evaluates bare cell references', () => {
    expect(evalCell('B2')).toBe(20);
    expect(() => evalCell('AA1 + 0')).toThrow(/outside grid/);
  });

  it('treats function-shaped identifiers as calls, not cell refs', () => {
    expect(codeOf(() => evalCell('NOSUCHFN(1)'))).toBe('#NAME?');
    expect(evalCell('TRUE')).toBe(true);
    expect(evalCell('FALSE')).toBe(false);
  });

  it('parses $-absolute references in all anchor combinations', () => {
    for (const text of ['$A$1', 'A$1', '$A1', 'A1']) {
      expect(evalCell(text)).toBe(1);
    }
  });

  it('rejects malformed $ refs at parse time', () => {
    expect(validateExpression('$1A', { mode: 'cell' })?.code).toBe('#PARSE!');
    expect(validateExpression('A$', { mode: 'cell' })?.code).toBe('#PARSE!');
  });

  it('resolves rectangular ranges row-major through functions', () => {
    expect(evalCell('SUM(A1:B2)')).toBe(33); // 1+2+10+20
    expect(evalCell('SUM(B2:A1)')).toBe(33); // reversed bounds normalise
    expect(evalCell('COUNT(A1:C3)')).toBe(9);
    expect(evalCell('COUNTIF(A1:C1, ">=2")')).toBe(2);
    expect(evalCell('SUMIF(A1:A3, ">50")')).toBe(100);
  });

  it('errors when a range appears outside a function call', () => {
    expect(validateExpression('A1:B2 + 1', { mode: 'cell' })).toBeNull(); // parses
    expect(codeOf(() => evalCell('A1:B2 + 1'))).toBe('#VALUE!');
  });

  it('reports #REF! for out-of-grid references', () => {
    expect(codeOf(() => evalCell('D1'))).toBe('#REF!');
    expect(codeOf(() => evalCell('A4'))).toBe('#REF!');
    expect(codeOf(() => evalCell('SUM(A1:A99)'))).toBe('#REF!');
  });
});

describe('cell formula parsing (long-hand)', () => {
  it('evaluates long-hand cell references', () => {
    expect(evalCell('[b:r2]')).toBe(20);
    expect(evalCell('[b:r2] + [a:r1]')).toBe(21);
  });

  it('evaluates long-hand ranges', () => {
    expect(evalCell('SUM([a:r1..b:r2])')).toBe(33);
  });

  it('mixes shorthand and long-hand in one formula', () => {
    expect(evalCell('[a:r1] + B2')).toBe(21);
  });

  it('rejects malformed long-hand refs', () => {
    expect(validateExpression('[a]', { mode: 'cell' })).toBeNull(); // calculated-style single segment parses
    expect(evalCell('[a]')).toBe(1); // ...and resolves as a same-row column reference
    expect(validateExpression('[a:r1:x]', { mode: 'cell' })?.code).toBe('#PARSE!');
  });
});

describe('custom function protocol', () => {
  it('passes ValueParam scalars and RangeParam ranges to custom functions', () => {
    const grid = makeGrid();
    const seen: unknown[] = [];
    grid.evaluator.resolveCustomFunction = (name: string) => {
      if (name !== 'COUNTEQ') return undefined;
      return (params: { args: Iterable<{ kind: string }>; values: Iterable<unknown> }) => {
        const args = [...params.args];
        seen.push(args.map((a) => a.kind));
        const [range, target] = args as [{ kind: string; values?: unknown[] }, { kind: string; value?: unknown }];
        expect(range.kind).toBe('range');
        expect(target.kind).toBe('value');
        let count = 0;
        for (const v of range.values ?? []) if (v === target.value) count++;
        return count;
      };
    };
    expect(evaluate(parseCellFormula('COUNTEQ(A1:C1, 2)'), grid.evaluator as never)).toBe(1);
    expect(seen).toEqual([['range', 'value']]);
  });

  it('exposes a lazy flattened values iterator across all params', () => {
    const grid = makeGrid();
    grid.evaluator.resolveCustomFunction = () => (params: { values: Iterable<unknown> }) => {
      return [...params.values].reduce((s: number, v) => s + (v as number), 0);
    };
    expect(evaluate(parseCellFormula('CUSTOMSUM(1, A1:B1, A2)'), grid.evaluator as never)).toBe(14); // 1+1+2+10
  });

  it('wraps custom function throws as #ERROR!', () => {
    const grid = makeGrid();
    grid.evaluator.resolveCustomFunction = () => () => {
      throw new Error('bad arguments');
    };
    expect(codeOf(() => evaluate(parseCellFormula('BOOM(1)'), grid.evaluator as never))).toBe('#ERROR!');
  });

  it('lets custom functions shadow built-ins', () => {
    const grid = makeGrid();
    grid.evaluator.resolveCustomFunction = (name: string) =>
      name === 'SUM' ? (params: { values: Iterable<unknown> }) => [...params.values].length * 1000 : undefined;
    expect(evaluate(parseCellFormula('SUM(A1:B1)'), grid.evaluator as never)).toBe(2000);
  });

  it('keeps IF lazy in cell mode with range branches', () => {
    expect(evalCell('IF(A1 > 0, A2, B3)')).toBe(10);
    expect(evalCell('IF(A1 < 0, A2, B3)')).toBe(200);
    expect(evalCell('IF(A1 > 0, SUM(A1:A2), 0)')).toBe(11);
  });
});

describe('serialisation and offsets', () => {
  const grid = makeGrid();
  const format = grid.format;

  function roundTrip(source: string): string {
    return stringifyCellFormula(parseCellFormula(source));
  }

  it('round-trips precedence through parse → stringify → parse', () => {
    for (const source of [
      '(A1 + B2) * 2',
      'A1 + B2 * 2',
      '-A1 ^ 2',
      '2 ^ -3',
      '(A1 - (B2 - C3))',
      'IF(A1 > 0, SUM(A1:B2), 0)',
      'A1 & "x"',
      '50%',
    ]) {
      const once = roundTrip(source);
      expect(roundTrip(once)).toBe(once);
      // Semantics preserved: evaluate the original and the re-parse.
      expect(evaluate(parseCellFormula(once), makeGrid().evaluator as never)).toBe(
        evaluate(parseCellFormula(source), makeGrid().evaluator as never),
      );
    }
  });

  it('converts shorthand → long-hand and back', () => {
    expect(convertFormula('=A1 + B2', format, true)).toBe('=[a:r1] + [b:r2]');
    expect(convertFormula('=[a:r1] + [b:r2]', format, false)).toBe('=A1 + B2');
  });

  it('serialises ranges long-hand with the .. separator', () => {
    expect(convertFormula('=SUM(A1:B2)', format, true)).toBe('=SUM([a:r1]..[b:r2])');
  });

  it('shifts relative references by deltas (fill handle)', () => {
    expect(shiftFormula({ value: '=B2+C2', rowDelta: 1 })).toBe('=B3 + C3');
    expect(shiftFormula({ value: '=B2+C2', columnDelta: 1 })).toBe('=C2 + D2');
    expect(shiftFormula({ value: '=B2*C2', rowDelta: 2, columnDelta: -1 })).toBe('=A4 * B4');
  });

  it('keeps absolute anchors fixed while shifting', () => {
    expect(shiftFormula({ value: '=$A$1 + A1', rowDelta: 3 })).toBe('=$A$1 + A4');
    expect(shiftFormula({ value: '=A$1 + $A1', rowDelta: 1, columnDelta: 1 })).toBe('=B$1 + $A2');
  });

  it('returns #REF!-safe results for shifts off the grid', () => {
    expect(codeOf(() => shiftFormula({ value: '=A1', rowDelta: -1 }))).toBe('#REF!');
    expect(shiftFormula({ value: '=not a formula', rowDelta: 1 })).toBe('=not a formula');
  });

  it('preserves long-hand refs under useRefFormat', () => {
    expect(shiftFormula({ value: '=[a:r1] + B2', rowDelta: 1, useRefFormat: true })).toBe('=[a:r1] + B3');
    expect(shiftFormula({ value: '=[a:r1] + B2', rowDelta: 1 })).toBe('=[a:r1] + B3'); // no format context → long-hand preserved
  });
});

describe('reference collection', () => {
  it('collects long-hand colIds from referencedColumnIds', () => {
    const ast: ExprNode = parseCellFormula('[a:r1] + B2 + [b:r2]');
    expect(referencedColumnIds(ast)).toEqual(['a', 'b']);
  });

  it('collects every cell endpoint from referencedCells', () => {
    const ast = parseCellFormula('SUM(A1:B2) + C3');
    expect(referencedCells(ast)).toHaveLength(3); // range endpoints A1, B2 + cell C3
  });
});

describe('column letter mapping', () => {
  it('maps positions to letters and back', () => {
    expect(columnLetters(0)).toBe('A');
    expect(columnLetters(25)).toBe('Z');
    expect(columnLetters(26)).toBe('AA');
    expect(columnLetters(701)).toBe('ZZ');
    for (let p = 0; p < 200; p++) {
      expect(columnPosition(columnLetters(p))).toBe(p);
    }
  });
});
