/**
 * Expression engine for calculated columns and per-cell formulas.
 *
 * Two parse modes share one grammar core:
 *
 * - **`'expression'` mode** (default — calculated columns, gap-plan A2):
 *   same-row bracket references (`[colId]`), the public operator set, and the
 *   public provided-function set (AG Grid docs 36.1, "Calculated Columns" +
 *   "Formula Reference": the same operators and functions Formulas uses).
 *   Evaluation is same-row: a reference resolves the referenced column's value
 *   in the *same* row.
 * - **`'cell'` mode** (per-cell formulas, gap-plan A1): additionally accepts
 *   A1-notation cell references (`B2`, `AA12`), `$`-absolute refs (`$A$1`,
 *   `A$1`, `=$A1`), rectangular ranges (`A1:B2`) and the LibreGrid long-hand
 *   reference format (`[colId:rowId]`, ranges `[colIdStart:rowIdStart..colIdEnd:rowIdEnd]`).
 *   Range-taking functions (`SUMIF`, `COUNTIF`) receive ranges as iterable
 *   `RangeParam`-shaped arguments; built-ins flatten them per argument.
 *
 * Errors are spreadsheet-style codes returned as `FormulaError`; the formula
 * service renders the code text in the cell (`#REF!`, `#NAME?`, `#CIRCREF!`,
 * `#PARSE!`, `#VALUE!`, `#DIV/0!`, `#ERROR!`) and hands the error object to
 * Community's formula-error CSS/tooltip hooks (`getFormulaError`).
 *
 * Grammar (precedence, low → high):
 *   or:      and ('OR' and)*
 *   and:     cmp (('AND') cmp)*
 *   cmp:     add (( '=' | '<>' | '>' | '<' | '>=' | '<=' ) add)?
 *   add:     mult (('+' | '-' | '&') mult)*
 *   mult:    pow (('*' | '/') pow)*
 *   pow:     unary ('^' pow)?          (right-associative)
 *   unary:   '-' unary | '+' unary | '!' unary | postfix
 *   postfix: primary ('%')*
 *   primary: number | string | '[ref]' | true | false | ident '(' args ')' | '(' or ')'
 *   cell mode extends primary with: A1 cell refs, `$`-absolute cell refs,
 *   cell ranges (`cell ':' cell`) and long-hand bracket refs.
 *   A bare identifier that is not a call is an unknown function (`#NAME?` at
 *   evaluation time, not parse time, so validation reports the right reason).
 */

export type FormulaErrorCode =
  | '#REF!'
  | '#NAME?'
  | '#CIRCREF!'
  | '#PARSE!'
  | '#VALUE!'
  | '#DIV/0!'
  | '#ERROR!';

/** Spreadsheet-style formula error. `code` is the cell-rendered text. */
export class FormulaError extends Error {
  public constructor(
    public readonly code: FormulaErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FormulaError';
  }
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

type BinOp =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '&'
  | '='
  | '<>'
  | '>'
  | '<'
  | '>='
  | '<='
  | 'or'
  | 'and';

/** A cell reference in either shorthand (A1) or long-hand (col/row ID) form. */
export type CellRef =
  | { shorthand: true; letters: string; row: number; absCol: boolean; absRow: boolean }
  | { shorthand: false; colId: string; rowId: string };

export interface CellRangeBounds {
  rowStart: number;
  rowEnd: number;
  /** Grid column object bounding the range start — typed `unknown` to keep this module grid-agnostic. */
  colStart: unknown;
  /** Grid column object bounding the range end — typed `unknown` to keep this module grid-agnostic. */
  colEnd: unknown;
  /** Resolved values of every cell in the range, row-major. */
  values: unknown[];
}

/** `FormulaParam`-shaped range: bounds plus iteration over the resolved values. */
export interface RangeParamLike extends CellRangeBounds {
  kind: 'range';
}

/** `FormulaParam`-shaped scalar. */
export interface ValueParamLike {
  kind: 'value';
  value: unknown;
}

export type FormulaParamLike = ValueParamLike | RangeParamLike;

export type ExprNode =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'ref'; colId: string }
  | { kind: 'cell'; ref: CellRef }
  | { kind: 'range'; start: CellRef; end: CellRef }
  | { kind: 'binary'; op: BinOp; left: ExprNode; right: ExprNode }
  | { kind: 'unary'; op: '+' | '-' | '!'; operand: ExprNode }
  | { kind: 'percent'; operand: ExprNode }
  | { kind: 'call'; name: string; args: ExprNode[] };

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

export type ParseMode = 'expression' | 'cell';

export interface FormulaToken {
  type: 'num' | 'str' | 'ref' | 'cell' | 'ident' | 'op';
  value: string;
}

function fail(message: string): never {
  throw new FormulaError('#PARSE!', message);
}

/** A1 cell reference: 1–3 column letters then a 1-based row number. */
const CELL_REF_RE = /^([A-Za-z]{1,3})([0-9]+)$/;

/** True when `text` looks like a shorthand cell reference and not a function call or name. */
export function isCellRefText(text: string): boolean {
  return CELL_REF_RE.test(text);
}

export function tokenize(source: string, mode: ParseMode = 'expression'): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source.charAt(i);
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < source.length && /[0-9]/.test(source.charAt(i + 1)))) {
      let j = i;
      while (j < source.length && /[0-9.]/.test(source.charAt(j))) j++;
      const text = source.slice(i, j);
      const value = Number(text);
      if (!Number.isFinite(value)) fail(`invalid number "${text}"`);
      tokens.push({ type: 'num', value: text });
      i = j;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < source.length && source.charAt(j) !== ch) j++;
      if (j >= source.length) fail('unterminated string literal');
      tokens.push({ type: 'str', value: source.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (ch === '[') {
      let j = i + 1;
      while (j < source.length && source.charAt(j) !== ']') j++;
      if (j >= source.length) fail('unterminated bracket reference');
      const content = source.slice(i + 1, j).trim();
      if (content.length === 0) fail('empty bracket reference');
      tokens.push({ type: 'ref', value: content });
      i = j + 1;
      continue;
    }
    if (mode === 'cell' && (ch === '$' || /[A-Za-z]/.test(ch))) {
      // Cell mode: scan names including `$` anchors so `B2`, `A$1`, `$A1` and
      // `$A$1` each arrive as one token. `SUM(` stays an identifier (call).
      let j = i;
      while (j < source.length && /[A-Za-z0-9_$]/.test(source.charAt(j))) j++;
      const text = source.slice(i, j);
      const next = source.slice(j).match(/^\s*\(/);
      if (!next && /^\$?[A-Za-z]{1,3}\$?[0-9]+$/.test(text)) {
        tokens.push({ type: 'cell', value: text });
        i = j;
        continue;
      }
      if (text.includes('$')) fail(`invalid cell reference "${text}"`);
      tokens.push({ type: 'ident', value: text });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < source.length && /[A-Za-z0-9_]/.test(source.charAt(j))) j++;
      const text = source.slice(i, j);
      tokens.push({ type: 'ident', value: text });
      i = j;
      continue;
    }
    const two = source.slice(i, i + 2);
    if (two === '<>' || two === '>=' || two === '<=') {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if ((mode === 'cell' && ch === ':') || '+-*/^&=<>!%,()'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    fail(`unexpected character "${ch}"`);
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

class Parser {
  private pos = 0;

  public constructor(
    private readonly tokens: FormulaToken[],
    private readonly mode: ParseMode = 'expression',
  ) {}

  public parse(): ExprNode {
    if (this.tokens.length === 0) fail('empty expression');
    const node = this.parseOr();
    if (this.pos < this.tokens.length) fail('unexpected trailing input');
    return node;
  }

  private peek(): FormulaToken | undefined {
    return this.tokens[this.pos];
  }

  private matchOp(op: string): boolean {
    const t = this.peek();
    if (t && t.type === 'op' && t.value === op) {
      this.pos++;
      return true;
    }
    return false;
  }

  private matchIdent(value: string): boolean {
    const t = this.peek();
    if (t && t.type === 'ident' && t.value.toUpperCase() === value) {
      this.pos++;
      return true;
    }
    return false;
  }

  private parseOr(): ExprNode {
    let left = this.parseAnd();
    while (this.matchIdent('OR')) {
      const right = this.parseAnd();
      left = { kind: 'binary', op: 'or', left, right };
    }
    return left;
  }

  private parseAnd(): ExprNode {
    let left = this.parseComparison();
    while (this.matchIdent('AND')) {
      const right = this.parseComparison();
      left = { kind: 'binary', op: 'and', left, right };
    }
    return left;
  }

  private parseComparison(): ExprNode {
    const left = this.parseAdditive();
    const t = this.peek();
    if (t && t.type === 'op' && ['=', '<>', '>', '<', '>=', '<='].includes(t.value)) {
      this.pos++;
      const right = this.parseAdditive();
      return { kind: 'binary', op: t.value as BinOp, left, right };
    }
    return left;
  }

  private parseAdditive(): ExprNode {
    let left = this.parseMultiplicative();
    for (;;) {
      const t = this.peek();
      if (t && t.type === 'op' && (t.value === '+' || t.value === '-' || t.value === '&')) {
        this.pos++;
        const right = this.parseMultiplicative();
        left = { kind: 'binary', op: t.value as BinOp, left, right };
      } else {
        return left;
      }
    }
  }

  private parseMultiplicative(): ExprNode {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t && t.type === 'op' && (t.value === '*' || t.value === '/')) {
        this.pos++;
        const right = this.parseExponent();
        left = { kind: 'binary', op: t.value as BinOp, left, right };
      } else {
        return left;
      }
    }
  }

  private parseUnary(): ExprNode {
    const t = this.peek();
    if (t && t.type === 'op' && (t.value === '-' || t.value === '+' || t.value === '!')) {
      this.pos++;
      // Spreadsheet semantics: exponentiation binds tighter than unary
      // minus, so -2^2 parses as -(2^2).
      return { kind: 'unary', op: t.value as '-' | '+' | '!', operand: this.parseUnary() };
    }
    return this.parseExponent();
  }

  private parseExponent(): ExprNode {
    const base = this.parsePostfix();
    const t = this.peek();
    if (t && t.type === 'op' && t.value === '^') {
      this.pos++;
      // Right-associative; the exponent may itself be unary (2^-3).
      const exponent = this.parseUnary();
      return { kind: 'binary', op: '^', left: base, right: exponent };
    }
    return base;
  }

  private parsePostfix(): ExprNode {
    let node = this.parsePrimary();
    while (this.matchOp('%')) {
      node = { kind: 'percent', operand: node };
    }
    return node;
  }

  private parsePrimary(): ExprNode {
    const t = this.peek();
    if (!t) fail('unexpected end of expression');
    if (t.type === 'num') {
      this.pos++;
      return { kind: 'number', value: Number(t.value) };
    }
    if (t.type === 'str') {
      this.pos++;
      return { kind: 'string', value: t.value };
    }
    if (t.type === 'cell') {
      this.pos++;
      const start = parseCellRefText(t.value);
      if (this.matchOp(':')) {
        const endTok = this.peek();
        if (!endTok || endTok.type !== 'cell') fail('range end must be a cell reference');
        this.pos++;
        return { kind: 'range', start, end: parseCellRefText(endTok.value) };
      }
      return { kind: 'cell', ref: start };
    }
    if (t.type === 'ref') {
      this.pos++;
      // Bracket content: `[colId]` (calculated columns), or in cell mode the
      // long-hand forms `[colId:rowId]` and `[colIdStart:rowIdStart..colIdEnd:rowIdEnd]`.
      if (this.mode === 'cell' && t.value.includes(':')) {
        const rangeParts = t.value.split('..');
        if (rangeParts.length === 2) {
          const [a, b] = rangeParts.map((p) => p.split(':').map((s) => s.trim()));
          if (!a || !b || a.length !== 2 || b.length !== 2 || !a[0] || !a[1] || !b[0] || !b[1]) {
            fail(`invalid long-hand range "[${t.value}]"`);
          }
          return {
            kind: 'range',
            start: { shorthand: false, colId: a[0], rowId: a[1] },
            end: { shorthand: false, colId: b[0], rowId: b[1] },
          };
        }
        const parts = t.value.split(':').map((s) => s.trim());
        if (parts.length !== 2 || !parts[0] || !parts[1]) fail(`invalid long-hand reference "[${t.value}]"`);
        return { kind: 'cell', ref: { shorthand: false, colId: parts[0], rowId: parts[1] } };
      }
      return { kind: 'ref', colId: t.value };
    }
    if (t.type === 'ident') {
      this.pos++;
      const lower = t.value.toLowerCase();
      if (lower === 'true') return { kind: 'boolean', value: true };
      if (lower === 'false') return { kind: 'boolean', value: false };
      const next = this.peek();
      if (next && next.type === 'op' && next.value === '(') {
        this.pos++; // consume '('
        const args: ExprNode[] = [];
        if (!this.matchOp(')')) {
          for (;;) {
            args.push(this.parseOr());
            if (!this.matchOp(',')) break;
          }
          if (!this.matchOp(')')) fail(`missing ")" in call to ${t.value}`);
        }
        return { kind: 'call', name: t.value, args };
      }
      // Bare identifier — unknown function or typo; resolved at evaluation
      // time so validation reports #NAME? (not #PARSE!) for unknown names.
      return { kind: 'call', name: t.value, args: [] };
    }
    if (t.type === 'op' && t.value === '(') {
      this.pos++;
      const node = this.parseOr();
      if (!this.matchOp(')')) fail('missing ")"');
      return node;
    }
    fail(`unexpected "${t.value}"`);
  }
}

/** Parse a tokenised A1 reference (`B2`, `$A$1`, `A$1`) into a `CellRef`. */
export function parseCellRefText(text: string): CellRef {
  const m = /^(\$?)([A-Za-z]{1,3})(\$?)([0-9]+)$/.exec(text);
  if (!m) fail(`invalid cell reference "${text}"`);
  return {
    shorthand: true,
    letters: m[2]!.toUpperCase(),
    row: Number(m[4]),
    absCol: m[1] === '$',
    absRow: m[3] === '$',
  };
}

export function parseExpression(source: string, mode: ParseMode = 'expression'): ExprNode {
  return new Parser(tokenize(source, mode), mode).parse();
}

/** Parse a per-cell formula body, stripping one leading `=` when present. */
export function parseCellFormula(source: string): ExprNode {
  const body = source.startsWith('=') ? source.slice(1) : source;
  return parseExpression(body, 'cell');
}

/** Whether the formula text carries the `=` value-form prefix. */
export function hasFormulaPrefix(value: string): boolean {
  return value.startsWith('=');
}

// ---------------------------------------------------------------------------
// Value coercion
// ---------------------------------------------------------------------------

function display(v: unknown): string {
  if (v === null || v === undefined) return 'empty';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export function toNum(v: unknown): number {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new FormulaError('#VALUE!', 'non-finite number');
    return v;
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.getTime();
  if (v === null || v === undefined) return 0;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return 0;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  throw new FormulaError('#VALUE!', `cannot convert to a number: ${display(v)}`);
}

export function toBool(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v instanceof Date) return true;
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    if (t === '') return false;
    if (t === 'true') return true;
    if (t === 'false') return false;
    const n = Number(t);
    return Number.isFinite(n) && n !== 0;
  }
  return true;
}

export function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/** Three-way compare with cross-type rules (numbers, dates, strings, empties). */
function compare(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty || bEmpty) {
    // Empty cells compare as 0 against numbers and as '' against strings.
    if (aEmpty && bEmpty) return 0;
    const other = aEmpty ? b : a;
    const dir = aEmpty ? 1 : -1;
    if (typeof other === 'number' || typeof other === 'boolean') return dir * (toNum(other) === 0 ? 0 : 1);
    if (other instanceof Date) return dir;
    if (typeof other === 'string') return dir;
    return 0;
  }
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (a instanceof Date) return toNum(a) - toNum(b);
  if (b instanceof Date) return toNum(a) - toNum(b);
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toLowerCase() === b.toLowerCase() ? 0 : a.toLowerCase() < b.toLowerCase() ? -1 : 1;
  }
  if (typeof a === 'string' || typeof b === 'string') {
    // Numeric string vs number compares numerically.
    return toNum(a) - toNum(b);
  }
  return toNum(a) - toNum(b);
}

const DAY_MS = 86_400_000;

function addValues(op: BinOp, left: unknown, right: unknown): unknown {
  if (op === '&') return toStr(left) + toStr(right);
  if (left instanceof Date || right instanceof Date) {
    if (op === '+') {
      // Exactly one operand is guaranteed to be a Date (the outer check).
      const d = left instanceof Date ? left : (right as Date);
      const n = toNum(left instanceof Date ? right : left);
      return new Date(d.getTime() + n * DAY_MS);
    }
    if (op === '-' && left instanceof Date && right instanceof Date) {
      return (left.getTime() - right.getTime()) / DAY_MS;
    }
    if (op === '-' && left instanceof Date) {
      return new Date(left.getTime() - toNum(right) * DAY_MS);
    }
  }
  switch (op) {
    case '=':
      return compare(left, right) === 0;
    case '<>':
      return compare(left, right) !== 0;
    case '>':
      return compare(left, right) > 0;
    case '<':
      return compare(left, right) < 0;
    case '>=':
      return compare(left, right) >= 0;
    case '<=':
      return compare(left, right) <= 0;
    case 'or':
      return toBool(left) || toBool(right);
    case 'and':
      return toBool(left) && toBool(right);
  }
  const l = toNum(left);
  const r = toNum(right);
  switch (op) {
    case '+':
      return l + r;
    case '-':
      return l - r;
    case '*':
      return l * r;
    case '/':
      if (r === 0) throw new FormulaError('#DIV/0!', 'division by zero');
      return l / r;
    case '^': {
      const v = Math.pow(l, r);
      if (!Number.isFinite(v)) throw new FormulaError('#VALUE!', `invalid power result for ${l} ^ ${r}`);
      return v;
    }
  }
}

// ---------------------------------------------------------------------------
// Provided functions (AG Grid 36.1 "Formula Reference")
// ---------------------------------------------------------------------------

export type FormulaFunc = (args: unknown[]) => unknown;

function arity(name: string, args: unknown[], min: number, max: number): void {
  if (args.length < min || args.length > max) {
    throw new FormulaError('#VALUE!', `${name} takes ${min === max ? min : `${min}–${max}`} argument(s), got ${args.length}`);
  }
}

/**
 * Spread one level of nested array/iterable arguments (a cell-mode range
 * arrives as an array-valued argument). Range-taking functions (`SUMIF`,
 * `COUNTIF`) deliberately do not use this — their first argument *is* the
 * range array.
 */
function flat(args: unknown[]): unknown[] {
  return args.flatMap((a) => {
    if (Array.isArray(a)) return a;
    if (a !== null && typeof a === 'object' && Symbol.iterator in (a as object)) return [...(a as Iterable<unknown>)];
    return [a];
  });
}

function numericArgs(args: unknown[]): number[] {
  return flat(args).filter((v) => v !== null && v !== undefined && v !== '').map(toNum);
}

function toRange(v: unknown, fn: string): unknown[] {
  if (Array.isArray(v)) return v;
  if (v !== null && typeof v === 'object' && Symbol.iterator in (v as object)) {
    return Array.from(v as Iterable<unknown>);
  }
  throw new FormulaError('#VALUE!', `${fn} ranges require a cell range (Formulas feature); got a scalar`);
}

function matchesCriteria(value: unknown, criteria: unknown): boolean {
  if (typeof criteria === 'number' || typeof criteria === 'boolean') {
    return compare(value, criteria) === 0;
  }
  const c = toStr(criteria).trim();
  if (c === '') return value === null || value === undefined || value === '';
  const m = c.match(/^(>=|<=|<>|>|<|=)([\s\S]*)$/);
  if (m) {
    const op = m[1]!;
    const target = m[2]!;
    const cmp = compare(value, target);
    switch (op) {
      case '=': return cmp === 0;
      case '<>': return cmp !== 0;
      case '>': return cmp > 0;
      case '<': return cmp < 0;
      case '>=': return cmp >= 0;
      case '<=': return cmp <= 0;
    }
  }
  return compare(value, c) === 0;
}

function sumif(args: unknown[]): unknown {
  arity('SUMIF', args, 2, 3);
  const range = toRange(args[0], 'SUMIF');
  const sumRange = args.length === 3 ? toRange(args[2], 'SUMIF') : range;
  if (range.length !== sumRange.length) {
    throw new FormulaError('#VALUE!', 'SUMIF range and sum_range must be the same length');
  }
  let total = 0;
  for (let i = 0; i < range.length; i++) {
    if (matchesCriteria(range[i], args[1])) total += toNum(sumRange[i]);
  }
  return total;
}

function countif(args: unknown[]): unknown {
  arity('COUNTIF', args, 2, 2);
  const range = toRange(args[0], 'COUNTIF');
  let count = 0;
  for (let i = 0; i < range.length; i++) {
    if (matchesCriteria(range[i], args[1])) count++;
  }
  return count;
}

export const FORMULA_FUNCTIONS: Readonly<Record<string, FormulaFunc>> = {
  SUM: (a) => numericArgs(a).reduce((s, v) => s + v, 0),
  PRODUCT: (a) => numericArgs(a).reduce((p, v) => p * v, 1),
  MIN: (a) => {
    const nums = numericArgs(a);
    return nums.length === 0 ? 0 : Math.min(...nums);
  },
  MAX: (a) => {
    const nums = numericArgs(a);
    return nums.length === 0 ? 0 : Math.max(...nums);
  },
  AVERAGE: (a) => {
    const nums = numericArgs(a);
    if (nums.length === 0) throw new FormulaError('#DIV/0!', 'AVERAGE has no numeric arguments');
    return nums.reduce((s, v) => s + v, 0) / nums.length;
  },
  MEDIAN: (a) => {
    const nums = numericArgs(a).sort((x, y) => x - y);
    if (nums.length === 0) throw new FormulaError('#VALUE!', 'MEDIAN has no numeric arguments');
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 === 1 ? nums[mid]! : (nums[mid - 1]! + nums[mid]!) / 2;
  },
  POWER: (a) => {
    arity('POWER', a, 2, 2);
    const v = Math.pow(toNum(a[0]!), toNum(a[1]!));
    if (!Number.isFinite(v)) throw new FormulaError('#VALUE!', `invalid power result for ${a[0]} ^ ${a[1]}`);
    return v;
  },
  RAND: () => Math.random(),
  NOW: () => new Date(),
  TODAY: () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  },
  CONCAT: (a) => flat(a).map(toStr).join(''),
  IF: (a) => {
    arity('IF', a, 2, 3);
    return toBool(a[0]!) ? a[1]! : (a[2] ?? null);
  },
  COUNT: (a) => flat(a).filter((v) => typeof v === 'number').length,
  COUNTA: (a) => flat(a).filter((v) => v !== null && v !== undefined && v !== '').length,
  COUNTBLANK: (a) => flat(a).filter((v) => v === null || v === undefined || v === '').length,
  AND: (a) => flat(a).every(toBool),
  OR: (a) => flat(a).some(toBool),
  NOT: (a) => {
    arity('NOT', a, 1, 1);
    return !toBool(a[0]!);
  },
  SUMIF: sumif,
  COUNTIF: countif,
};

export const FORMULA_FUNCTION_NAMES: readonly string[] = Object.keys(FORMULA_FUNCTIONS).sort();

export function getFormulaFunction(name: string): FormulaFunc | undefined {
  return FORMULA_FUNCTIONS[name.toUpperCase()];
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

export interface ExpressionEvaluator {
  /** Parse mode driving the node set (default `'expression'` — calculated columns). */
  mode?: ParseMode;
  /** Same-row value of the referenced column. Throws `FormulaError('#REF!')` when the column does not exist. */
  resolveColumn(colId: string): unknown;
  /** Whether `colId` is already on the active resolution chain (circular-reference guard). */
  isResolving(colId: string): boolean;
  /** Value of one referenced cell (cell mode). Throws `FormulaError('#REF!')` for unresolvable refs. */
  resolveCell?(ref: CellRef): unknown;
  /** Bounds + resolved values of a rectangular range (cell mode), row-major. */
  resolveRange?(start: CellRef, end: CellRef): CellRangeBounds;
  /** Custom function registry (cell mode) — consulted before the built-ins. */
  resolveCustomFunction?(
    name: string,
  ):
    | ((
        params: { row: unknown; column: unknown; args: Iterable<FormulaParamLike>; values: Iterable<unknown> },
      ) => unknown)
    | undefined;
  /** Row/column passed through to custom functions (cell mode). */
  functionContext?: { row: unknown; column: unknown };
}

/** Build the iterable `RangeParam`-shaped object the docs' custom functions receive. */
function toRangeParam(bounds: CellRangeBounds): RangeParamLike {
  return {
    kind: 'range',
    rowStart: bounds.rowStart,
    rowEnd: bounds.rowEnd,
    colStart: bounds.colStart,
    colEnd: bounds.colEnd,
    values: bounds.values,
  };
}

/** Flatten params into one lazy iterator of raw values (the docs' `params.values`). */
function* flattenValues(params: FormulaParamLike[]): Iterable<unknown> {
  for (const p of params) {
    if (p.kind === 'value') yield p.value;
    else yield* p.values;
  }
}

/** A lazily-evaluated argument: ranges stay `RangeParam`-shaped for custom functions. */
function evaluateParam(node: ExprNode, ev: ExpressionEvaluator): FormulaParamLike {
  if (node.kind === 'range') {
    if (!ev.resolveRange) throw new FormulaError('#ERROR!', 'ranges are not supported in this context');
    return toRangeParam(ev.resolveRange(node.start, node.end));
  }
  return { kind: 'value', value: evaluate(node, ev) };
}

export function evaluate(node: ExprNode, ev: ExpressionEvaluator): unknown {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'string':
      return node.value;
    case 'boolean':
      return node.value;
    case 'ref': {
      if (ev.isResolving(node.colId)) {
        throw new FormulaError('#CIRCREF!', `circular reference through [${node.colId}]`);
      }
      return ev.resolveColumn(node.colId);
    }
    case 'cell': {
      if (!ev.resolveCell) throw new FormulaError('#ERROR!', 'cell references are not supported in this context');
      return ev.resolveCell(node.ref);
    }
    case 'range':
      // A bare range outside a call cannot coerce to a scalar.
      throw new FormulaError('#VALUE!', 'a cell range can only be used as a function argument');
    case 'binary':
      return addValues(node.op, evaluate(node.left, ev), evaluate(node.right, ev));
    case 'unary': {
      const v = evaluate(node.operand, ev);
      if (node.op === '!') return !toBool(v);
      const n = toNum(v);
      return node.op === '-' ? -n : n;
    }
    case 'percent':
      return toNum(evaluate(node.operand, ev)) / 100;
    case 'call': {
      const name = node.name.toUpperCase();
      if (name === 'IF') {
        // Spreadsheet semantics: only the taken branch is evaluated.
        if (node.args.length < 2 || node.args.length > 3) {
          throw new FormulaError('#VALUE!', `IF takes 2–3 argument(s), got ${node.args.length}`);
        }
        const condition = evaluate(node.args[0]!, ev);
        const branch = (arg: ExprNode | undefined): unknown => {
          if (!arg) return null;
          if (ev.mode === 'cell') {
            const p = evaluateParam(arg, ev);
            return p.kind === 'value' ? p.value : (p.values[0] ?? null);
          }
          return evaluate(arg, ev);
        };
        return toBool(condition) ? branch(node.args[1]) : branch(node.args[2]);
      }
      if (ev.mode === 'cell') {
        // Cell mode: range arguments stay `RangeParam`-shaped for custom
        // functions; built-ins receive ranges flattened per argument.
        const params = node.args.map((a) => evaluateParam(a, ev));
        const custom = ev.resolveCustomFunction?.(node.name);
        if (custom) {
          const ctx = ev.functionContext ?? { row: undefined, column: undefined };
          try {
            return custom({ row: ctx.row, column: ctx.column, args: params, values: flattenValues(params) });
          } catch (e) {
            if (e instanceof FormulaError) throw e;
            throw new FormulaError('#ERROR!', `${node.name} failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
        const fn = getFormulaFunction(node.name);
        if (!fn) throw new FormulaError('#NAME?', `unknown function "${node.name}"`);
        const args = params.map((p) => (p.kind === 'value' ? p.value : p.values));
        try {
          return fn(args);
        } catch (e) {
          if (e instanceof FormulaError) throw e;
          throw new FormulaError('#ERROR!', `${node.name} failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      const fn = getFormulaFunction(name);
      if (!fn) throw new FormulaError('#NAME?', `unknown function "${node.name}"`);
      const args = node.args.map((a) => evaluate(a, ev));
      try {
        return fn(args);
      } catch (e) {
        if (e instanceof FormulaError) throw e;
        throw new FormulaError('#ERROR!', `${node.name} failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Validation + reference collection
// ---------------------------------------------------------------------------

export interface ValidateOptions {
  /** When provided, each referenced colId must resolve or validation fails with `#REF!`. */
  resolveReference?: (colId: string) => boolean;
  /** Parse mode — `'cell'` enables A1/range/long-hand references. */
  mode?: ParseMode;
}

/** Parse (and optionally reference-check) without evaluating. `null` when valid. */
export function validateExpression(source: string, options: ValidateOptions = {}): FormulaError | null {
  let ast: ExprNode;
  try {
    ast = parseExpression(source, options.mode ?? 'expression');
  } catch (e) {
    return e instanceof FormulaError ? e : new FormulaError('#PARSE!', String(e));
  }
  if (options.resolveReference) {
    const ids = referencedColumnIds(ast);
    for (const id of ids) {
      if (!options.resolveReference(id)) {
        return new FormulaError('#REF!', `unknown column reference [${id}]`);
      }
    }
  }
  return null;
}

/** Unique referenced colIds (bracket refs) in declaration order. */
export function referencedColumnIds(node: ExprNode): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const visit = (n: ExprNode): void => {
    switch (n.kind) {
      case 'ref':
        if (!seen.has(n.colId)) {
          seen.add(n.colId);
          out.push(n.colId);
        }
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
      case 'range':
        visitCellRef(n.start);
        visitCellRef(n.end);
        break;
      case 'cell':
        visitCellRef(n.ref);
        break;
    }
  };
  const visitCellRef = (ref: CellRef): void => {
    if (!ref.shorthand && !seen.has(ref.colId)) {
      seen.add(ref.colId);
      out.push(ref.colId);
    }
  };
  visit(node);
  return out;
}

/** Every cell reference in the expression, in declaration order (cell mode). */
export function referencedCells(node: ExprNode): CellRef[] {
  const out: CellRef[] = [];
  const visit = (n: ExprNode): void => {
    switch (n.kind) {
      case 'cell':
        out.push(n.ref);
        break;
      case 'range':
        out.push(n.start, n.end);
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
    }
  };
  visit(node);
  return out;
}

// ---------------------------------------------------------------------------
// Serialisation, long-hand conversion and offset shifting (gap-plan A1)
// ---------------------------------------------------------------------------

/** Column letters for a 0-based column position (0 → `A`, 25 → `Z`, 26 → `AA`). */
export function columnLetters(position: number): string {
  if (!Number.isInteger(position) || position < 0) throw new FormulaError('#REF!', 'invalid column position');
  let out = '';
  let n = position;
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** 0-based column position for column letters (`A` → 0, `AA` → 26). */
export function columnPosition(letters: string): number {
  if (!/^[A-Za-z]{1,3}$/.test(letters)) throw new FormulaError('#REF!', `invalid column letters "${letters}"`);
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export interface CellFormulaFormat {
  /** Column ID for a 0-based visible leaf column position. Throws `#REF!` when unmappable. */
  colIdAt(position: number): string;
  /** 0-based visible leaf column position for a column ID. Throws `#REF!` when unmappable. */
  positionOf(colId: string): number;
  /** Row ID for a 0-based row index. Throws `#REF!` when unmappable. */
  rowIdAt(index: number): string;
  /** 0-based row index for a row ID. Throws `#REF!` when unmappable. */
  indexOf(rowId: string): number;
}

function cellRefToLong(ref: CellRef, format: CellFormulaFormat): string {
  if (!ref.shorthand) return `[${ref.colId}:${ref.rowId}]`;
  const colId = format.colIdAt(columnPosition(ref.letters));
  const rowId = format.rowIdAt(ref.row - 1);
  return `[${colId}:${rowId}]`;
}

/** Precedence ranking matching the parser grammar (higher binds tighter). */
function precedenceOf(node: ExprNode): number {
  switch (node.kind) {
    case 'binary':
      switch (node.op) {
        case 'or':
          return 1;
        case 'and':
          return 2;
        case '=':
        case '<>':
        case '>':
        case '<':
        case '>=':
        case '<=':
          return 3;
        case '+':
        case '-':
        case '&':
          return 4;
        case '*':
        case '/':
          return 5;
        case '^':
          return 6;
      }
      break;
    case 'unary':
      return 7;
    case 'percent':
      return 8;
    default:
      return 9;
  }
  return 9;
}

const LEFT_ASSOC = new Set(['or', 'and', '+', '-', '&', '*', '/', '=']);

function serializeCellRef(ref: CellRef): string {
  if (ref.shorthand) {
    return `${ref.absCol ? '$' : ''}${ref.letters}${ref.absRow ? '$' : ''}${ref.row}`;
  }
  // Long-hand refs are ID-pinned and serialise without a conversion context.
  return `[${ref.colId}:${ref.rowId}]`;
}

/** Serialise a ref to shorthand, converting long-hand through `format` when available. */
function serializeShorthand(ref: CellRef, format?: CellFormulaFormat): string {
  if (ref.shorthand || !format) return serializeCellRef(ref);
  // Long-hand references carry no absolute anchors — they are ID-pinned.
  return `${columnLetters(format.positionOf(ref.colId))}${format.indexOf(ref.rowId) + 1}`;
}

function serializeNode(node: ExprNode, parentPrec: number, parentOp: BinOp | null, isRightOperand: boolean, format?: CellFormulaFormat, longHand = false): string {
  const prec = precedenceOf(node);
  const parenthesise =
    prec < parentPrec ||
    // Same precedence: right operand of a left-assoc op, or either operand of
    // the right-assoc `^`, needs its own parentheses to round-trip.
    (prec === parentPrec && ((parentOp !== null && isRightOperand && LEFT_ASSOC.has(parentOp)) || parentOp === '^'));
  const body = (): string => {
    switch (node.kind) {
      case 'number':
        return String(node.value);
      case 'string':
        return `"${node.value}"`;
      case 'boolean':
        return node.value ? 'TRUE' : 'FALSE';
      case 'ref':
        return `[${node.colId}]`;
      case 'cell':
        return longHand ? cellRefToLong(node.ref, format!) : serializeShorthand(node.ref, format);
      case 'range': {
        const a = longHand ? cellRefToLong(node.start, format!) : serializeShorthand(node.start, format);
        const b = longHand ? cellRefToLong(node.end, format!) : serializeShorthand(node.end, format);
        return longHand || (!node.start.shorthand && !format) ? `${a}..${b}` : `${a}:${b}`;
      }
      case 'binary':
        return `${serializeNode(node.left, prec, node.op, false, format, longHand)} ${node.op} ${serializeNode(node.right, prec, node.op, true, format, longHand)}`;
      case 'unary':
        return `${node.op}${serializeNode(node.operand, prec, null, false, format, longHand)}`;
      case 'percent':
        return `${serializeNode(node.operand, prec, null, false, format, longHand)}%`;
      case 'call':
        return `${node.name}(${node.args.map((a) => serializeNode(a, 0, null, false, format, longHand)).join(', ')})`;
    }
  };
  return parenthesise ? `(${body()})` : body();
}

/** Serialise an AST back to shorthand (A1) text, parenthesising to preserve precedence. */
export function stringifyCellFormula(node: ExprNode, format?: CellFormulaFormat): string {
  return serializeNode(node, 0, null, false, format, false);
}

/** Serialise an AST to the long-hand storage format (col/row IDs). */
export function stringifyCellFormulaLong(node: ExprNode, format: CellFormulaFormat): string {
  return serializeNode(node, 0, null, false, format, true);
}

export interface OffsetShift {
  value: string;
  rowDelta?: number;
  columnDelta?: number;
  /**
   * When `true`, each reference keeps its original format (long-hand stays
   * long-hand). Default rewrites every reference to shorthand — which needs
   * `format` when the formula contains long-hand references.
   */
  useRefFormat?: boolean;
  /** Conversion context used when rewriting long-hand references to shorthand. */
  format?: CellFormulaFormat;
}

/**
 * Shift a formula's relative references by row/column deltas (fill handle).
 * Absolute (`$`) anchors never move; long-hand references are already
 * ID-pinned and never move.
 */
export function shiftFormula(params: OffsetShift): string {
  const { value, rowDelta = 0, columnDelta = 0, useRefFormat, format } = params;
  if (rowDelta === 0 && columnDelta === 0) return value;
  const prefixed = value.startsWith('=');
  let ast: ExprNode;
  try {
    ast = parseCellFormula(value);
  } catch (e) {
    if (e instanceof FormulaError && e.code === '#PARSE!') return value;
    throw e;
  }
  const shift = (ref: CellRef): CellRef => {
    if (!ref.shorthand) return ref;
    if (ref.absCol && ref.absRow) return ref;
    const position = columnPosition(ref.letters) + (ref.absCol ? 0 : columnDelta);
    const row = ref.row + (ref.absRow ? 0 : rowDelta);
    if (position < 0 || row < 1) throw new FormulaError('#REF!', 'shifted reference leaves the grid');
    return { shorthand: true, letters: columnLetters(position), row, absCol: ref.absCol, absRow: ref.absRow };
  };
  const shiftNode = (n: ExprNode): ExprNode => {
    switch (n.kind) {
      case 'cell':
        return { kind: 'cell', ref: shift(n.ref) };
      case 'range':
        return { kind: 'range', start: shift(n.start), end: shift(n.end) };
      case 'binary':
        return { kind: 'binary', op: n.op, left: shiftNode(n.left), right: shiftNode(n.right) };
      case 'unary':
        return { kind: 'unary', op: n.op, operand: shiftNode(n.operand) };
      case 'percent':
        return { kind: 'percent', operand: shiftNode(n.operand) };
      case 'call':
        return { kind: 'call', name: n.name, args: n.args.map(shiftNode) };
      default:
        return n;
    }
  };
  const shifted = shiftNode(ast);
  const render = (text: string): string => (prefixed ? `=${text}` : text);
  if (useRefFormat) {
    return render(serializeNode(shifted, 0, null, false));
  }
  // Default: rewrite everything to shorthand (long-hand needs a format context).
  const shorthandRef = (ref: CellRef): CellRef => {
    if (ref.shorthand) return ref;
    return {
      shorthand: true,
      letters: columnLetters(format!.positionOf(ref.colId)),
      row: format!.indexOf(ref.rowId) + 1,
      absCol: false,
      absRow: false,
    };
  };
  const toShorthand = (n: ExprNode): ExprNode => {
    switch (n.kind) {
      case 'cell':
        return { kind: 'cell', ref: shorthandRef(n.ref) };
      case 'range':
        return { kind: 'range', start: shorthandRef(n.start), end: shorthandRef(n.end) };
      case 'binary':
        return { kind: 'binary', op: n.op, left: toShorthand(n.left), right: toShorthand(n.right) };
      case 'unary':
        return { kind: 'unary', op: n.op, operand: toShorthand(n.operand) };
      case 'percent':
        return { kind: 'percent', operand: toShorthand(n.operand) };
      case 'call':
        return { kind: 'call', name: n.name, args: n.args.map(toShorthand) };
      default:
        return n;
    }
  };
  if (format) return render(stringifyCellFormula(toShorthand(shifted)));
  return render(serializeNode(shifted, 0, null, false));
}

/**
 * Convert a formula between shorthand (A1) and long-hand (col/row ID) forms.
 * `toLong: true` → long-hand storage form; `false` → shorthand display form.
 * The `=` value-form prefix is preserved.
 */
export function convertFormula(value: string, format: CellFormulaFormat, toLong: boolean): string {
  const prefixed = value.startsWith('=');
  const ast = parseCellFormula(value);
  const out = toLong ? stringifyCellFormulaLong(ast, format) : stringifyCellFormula(ast, format);
  return prefixed ? `=${out}` : out;
}

// One-line human descriptions for the dialog's function picker.
export const FORMULA_FUNCTION_DESCRIPTIONS: Readonly<Record<string, string>> = {
  AVERAGE: 'Average of all numeric arguments',
  AND: 'TRUE when every argument is true',
  CONCAT: 'Joins all arguments into one string',
  COUNT: 'Counts numeric arguments',
  COUNTA: 'Counts non-empty arguments',
  COUNTBLANK: 'Counts empty arguments',
  COUNTIF: 'Counts range values meeting a criteria (cell ranges: Formulas)',
  IF: 'value_if_true when the condition is true, else value_if_false',
  MAX: 'Largest numeric argument',
  MEDIAN: 'Median of numeric arguments',
  MIN: 'Smallest numeric argument',
  NOW: 'Current date and time',
  NOT: 'Negates the argument',
  OR: 'TRUE when any argument is true',
  POWER: 'Raises the first argument to the power of the second',
  PRODUCT: 'Product of all numeric arguments',
  RAND: 'Random number between 0 and 1',
  SUM: 'Sum of all numeric arguments',
  SUMIF: 'Sum of range values meeting a criteria (cell ranges: Formulas)',
  TODAY: 'Current date at midnight',
};

export const FORMULA_OPERATORS: ReadonlyArray<{ op: string; description: string }> = [
  { op: '+', description: 'Addition (or add days to a date)' },
  { op: '-', description: 'Subtraction (or subtract days from a date)' },
  { op: '*', description: 'Multiplication' },
  { op: '/', description: 'Division' },
  { op: '^', description: 'Exponentiation' },
  { op: '&', description: 'String concatenation' },
  { op: '=', description: 'Equal to' },
  { op: '<>', description: 'Not equal to' },
  { op: '>', description: 'Greater than' },
  { op: '<', description: 'Less than' },
  { op: '>=', description: 'Greater than or equal' },
  { op: '<=', description: 'Less than or equal' },
  { op: '%', description: 'Percentage (divides by 100)' },
];
