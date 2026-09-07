import { describe, expect, it } from 'vitest';
import {
  FORMULA_FUNCTIONS,
  FormulaError,
  evaluate,
  parseExpression,
  referencedColumnIds,
  validateExpression,
  type ExprNode,
} from './expression';

function resolveRefs(refs: Record<string, unknown>): Parameters<typeof evaluate>[1] {
  return {
    resolveColumn: (colId) => {
      if (!(colId in refs)) throw new FormulaError('#REF!', `unknown column reference [${colId}]`);
      return refs[colId];
    },
    isResolving: () => false,
  };
}

function ev(expression: string, refs: Record<string, unknown> = {}): unknown {
  return evaluate(parseExpression(expression), resolveRefs(refs));
}

function errorCode(expression: string, refs: Record<string, unknown> = {}): string | null {
  try {
    ev(expression, refs);
    return null;
  } catch (e) {
    return e instanceof FormulaError ? e.code : String(e);
  }
}

describe('expression engine — parsing', () => {
  it('parses numbers, strings, booleans and references', () => {
    expect(ev('42')).toBe(42);
    expect(ev('1.5')).toBe(1.5);
    expect(ev('"hello"')).toBe('hello');
    expect(ev("'world'")).toBe('world');
    expect(ev('TRUE')).toBe(true);
    expect(ev('false')).toBe(false);
    expect(ev('[a]', { a: 7 })).toBe(7);
  });

  it('supports operator precedence and parentheses', () => {
    expect(ev('1 + 2 * 3')).toBe(7);
    expect(ev('(1 + 2) * 3')).toBe(9);
    expect(ev('2 ^ 3 ^ 2')).toBe(512); // right-associative: 2^(3^2)
    expect(ev('-2 ^ 2')).toBe(-4); // unary binds looser than exponent? no: -(2^2)
  });

  it('supports the percent postfix operator', () => {
    expect(ev('50%')).toBe(0.5);
    expect(ev('200 * 10%')).toBe(20);
  });

  it('supports comparisons and logical keywords', () => {
    expect(ev('1 < 2')).toBe(true);
    expect(ev('2 >= 2')).toBe(true);
    expect(ev('1 <> 2')).toBe(true);
    expect(ev('"a" = "A"')).toBe(true); // case-insensitive strings
    expect(ev('TRUE AND FALSE')).toBe(false);
    expect(ev('TRUE OR FALSE')).toBe(true);
    expect(ev('NOT(TRUE)')).toBe(false);
    expect(ev('!TRUE')).toBe(false);
  });

  it('concatenates with & and converts to strings', () => {
    expect(ev('"a" & 1')).toBe('a1');
    expect(ev('1 & TRUE')).toBe('1TRUE');
  });

  it('treats unknown bare identifiers as unknown functions', () => {
    expect(errorCode('NOPE')).toBe('#NAME?');
  });

  it('reports parse errors as #PARSE!', () => {
    expect(errorCode('1 +')).toBe('#PARSE!');
    expect(errorCode('(1 + 2')).toBe('#PARSE!');
    expect(errorCode('[unclosed')).toBe('#PARSE!');
    expect(errorCode('')).toBe('#PARSE!');
    expect(errorCode('1 2')).toBe('#PARSE!');
    expect(errorCode('1 + & 2')).toBe('#PARSE!');
    expect(errorCode('1 @ 2')).toBe('#PARSE!');
  });

  it('collects referenced column ids', () => {
    expect(referencedColumnIds(parseExpression('[a] - [b] + [a]'))).toEqual(['a', 'b']);
    expect(referencedColumnIds(parseExpression('IF([x] > 0, [y], [z])'))).toEqual(['x', 'y', 'z']);
    expect(referencedColumnIds(parseExpression('1 + 2'))).toEqual([]);
  });
});

describe('expression engine — operators and values', () => {
  it('adds and subtracts numbers, and errors on division by zero', () => {
    expect(ev('[a] + [b]', { a: 2, b: 3 })).toBe(5);
    expect(ev('[a] - [b]', { a: 2, b: 3 })).toBe(-1);
    expect(errorCode('1 / 0')).toBe('#DIV/0!');
    expect(ev('10 / 4')).toBe(2.5);
  });

  it('converts numeric strings and booleans in arithmetic', () => {
    expect(ev('"2" + "3"')).toBe(5);
    expect(ev('TRUE + 1')).toBe(2);
    expect(errorCode('"abc" + 1')).toBe('#VALUE!');
  });

  it('handles empty cells as 0 / empty string', () => {
    expect(ev('[a] + 5', { a: null })).toBe(5);
    expect(ev('[a] & "x"', { a: null })).toBe('x');
    expect(ev('[a] = 0', { a: null })).toBe(true);
  });

  it('adds/subtracts days to dates', () => {
    const d = new Date('2026-08-20T00:00:00Z');
    const result = ev('[d] + 1', { d }) as Date;
    expect(result.getTime()).toBe(d.getTime() + 86_400_000);
    const earlier = ev('[d] - 2', { d }) as Date;
    expect(earlier.getTime()).toBe(d.getTime() - 2 * 86_400_000);
    expect(ev('[d2] - [d1]', { d1: new Date('2026-08-19T00:00:00Z'), d2: new Date('2026-08-20T00:00:00Z') })).toBe(1);
  });

  it('propagates #REF! for unknown references', () => {
    expect(errorCode('[missing] + 1')).toBe('#REF!');
  });

  it('propagates #CIRCREF! when the resolver reports a cycle', () => {
    let depth = 0;
    const ast = parseExpression('[a] + 1');
    const code = ((): string | null => {
      try {
        evaluate(ast, {
          resolveColumn: () => {
            depth++;
            if (depth > 2) throw new FormulaError('#CIRCREF!', 'circular');
            return evaluate(ast, {
              resolveColumn: () => {
                depth++;
                return evaluate(ast, {
                  resolveColumn: () => 1,
                  isResolving: () => true,
                });
              },
              isResolving: () => false,
            });
          },
          isResolving: () => false,
        });
        return null;
      } catch (e) {
        return e instanceof FormulaError ? e.code : String(e);
      }
    })();
    expect(code).toBe('#CIRCREF!');
  });

  it('errors when a reference resolves to a non-numeric value in arithmetic', () => {
    expect(errorCode('[a] * 2', { a: 'nope' })).toBe('#VALUE!');
  });
});

describe('expression engine — provided functions', () => {
  it('SUM / PRODUCT / MIN / MAX / AVERAGE / MEDIAN', () => {
    expect(ev('SUM(1, 2, 3)')).toBe(6);
    expect(ev('PRODUCT(2, 3, 4)')).toBe(24);
    expect(ev('MIN(3, 1, 2)')).toBe(1);
    expect(ev('MAX(3, 1, 2)')).toBe(3);
    expect(ev('AVERAGE(2, 4)')).toBe(3);
    expect(ev('MEDIAN(1, 2, 100)')).toBe(2);
    expect(ev('MEDIAN(1, 2, 3, 4)')).toBe(2.5);
    expect(ev('MIN()')).toBe(0);
    expect(errorCode('AVERAGE()')).toBe('#DIV/0!');
  });

  it('COUNT / COUNTA / COUNTBLANK', () => {
    // `null` is not a literal in the expression language — empty cells are
    // referenced columns with null values.
    expect(ev('COUNT(1, "x", [e], 2)', { e: null })).toBe(2);
    expect(ev('COUNTA(1, "x", [e])', { e: null })).toBe(2);
    expect(ev('COUNTBLANK(1, "", [e], 2)', { e: null })).toBe(2);
  });

  it('IF picks between branches lazily', () => {
    expect(ev('IF([a] > 10, "big", "small")', { a: 20 })).toBe('big');
    expect(ev('IF([a] > 10, "big", "small")', { a: 5 })).toBe('small');
    expect(ev('IF(FALSE, "yes")')).toBeNull(); // missing else → null
    // The un-taken branch is not evaluated: bad ref inside it is fine.
    expect(ev('IF(TRUE, 1, [missing])')).toBe(1);
  });

  it('AND / OR / NOT', () => {
    expect(ev('AND(TRUE, TRUE, TRUE)')).toBe(true);
    expect(ev('AND(TRUE, FALSE)')).toBe(false);
    expect(ev('OR(FALSE, FALSE, TRUE)')).toBe(true);
    expect(ev('OR(FALSE, 0)')).toBe(false);
    expect(ev('NOT(TRUE)')).toBe(false);
  });

  it('CONCAT and POWER', () => {
    expect(ev('CONCAT("a", 1, TRUE)')).toBe('a1TRUE');
    expect(ev('POWER(2, 10)')).toBe(1024);
    expect(errorCode('POWER(2)')).toBe('#VALUE!');
  });

  it('RAND returns a number in [0, 1)', () => {
    const v = ev('RAND()') as number;
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('NOW and TODAY return dates', () => {
    const before = Date.now();
    expect(ev('NOW()')).toBeInstanceOf(Date);
    expect(Date.now()).toBeGreaterThanOrEqual(before);
    const today = ev('TODAY()') as Date;
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
  });

  it('SUMIF / COUNTIF work on array arguments', () => {
    expect(ev('SUMIF([a], "> 2")', { a: [1, 2, 3, 4] })).toBe(7);
    expect(ev('COUNTIF([a], "< 3")', { a: [1, 2, 3, 4] })).toBe(2);
    expect(ev('SUMIF([a], 2)', { a: [1, 2, 3, 2] })).toBe(4);
    expect(errorCode('SUMIF(1, "> 2")')).toBe('#VALUE!'); // scalars: ranges are a Formulas feature
  });

  it('reports #NAME? for unknown functions and wrong arity as #VALUE!', () => {
    expect(errorCode('FRABULATOR(1)')).toBe('#NAME?');
    expect(errorCode('IF(TRUE)')).toBe('#VALUE!');
  });

  it('exposes the documented function set', () => {
    const names = Object.keys(FORMULA_FUNCTIONS).sort();
    expect(names).toEqual([
      'AND', 'AVERAGE', 'CONCAT', 'COUNT', 'COUNTA', 'COUNTBLANK', 'COUNTIF', 'IF',
      'MAX', 'MEDIAN', 'MIN', 'NOT', 'NOW', 'OR', 'POWER', 'PRODUCT', 'RAND', 'SUM',
      'SUMIF', 'TODAY',
    ]);
  });
});

describe('expression engine — validation', () => {
  it('accepts valid expressions', () => {
    expect(validateExpression('[a] + 1')).toBeNull();
    expect(validateExpression('IF([a] > 0, SUM([a], [b]), "neg")')).toBeNull();
  });

  it('rejects invalid syntax with #PARSE!', () => {
    const error = validateExpression('1 +');
    expect(error?.code).toBe('#PARSE!');
  });

  it('checks references when a resolver is provided', () => {
    const known = new Set(['a', 'b']);
    expect(validateExpression('[a] + [b]', { resolveReference: (id) => known.has(id) })).toBeNull();
    const error = validateExpression('[a] + [c]', { resolveReference: (id) => known.has(id) });
    expect(error?.code).toBe('#REF!');
  });

  it('treats empty expressions as parse errors at the engine level', () => {
    expect(validateExpression('')?.code).toBe('#PARSE!');
  });
});

describe('expression engine — type narrowing helpers', () => {
  it('keeps the AST shape extensible', () => {
    const ast = parseExpression('[a] - [b]');
    expect((ast as ExprNode).kind).toBe('binary');
  });
});
