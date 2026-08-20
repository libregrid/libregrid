/**
 * Expression engine for calculated columns.
 *
 * Evaluates the `colDef.calculatedExpression` string: same-row bracket references
 * (`[colId]`), the public operator set, and the public provided-function set
 * (AG Grid docs 36.1, "Calculated Columns" + "Formula Reference": the same
 * operators and functions Formulas uses). Evaluation is same-row: a reference
 * resolves the referenced column's value in the *same* row. Cross-row / range
 * references are a Formulas feature (gap-plan A1) — range-taking functions
 * (`SUMIF`, `COUNTIF`) accept array arguments so they keep working once cell
 * ranges exist, and error with `#VALUE!` when given scalars.
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

export type ExprNode =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'ref'; colId: string }
  | { kind: 'binary'; op: BinOp; left: ExprNode; right: ExprNode }
  | { kind: 'unary'; op: '+' | '-' | '!'; operand: ExprNode }
  | { kind: 'percent'; operand: ExprNode }
  | { kind: 'call'; name: string; args: ExprNode[] };

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

export interface FormulaToken {
  type: 'num' | 'str' | 'ref' | 'ident' | 'op';
  value: string;
}

function fail(message: string): never {
  throw new FormulaError('#PARSE!', message);
}

export function tokenize(source: string): FormulaToken[] {
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
      if (j >= source.length) fail('unterminated column reference');
      const colId = source.slice(i + 1, j).trim();
      if (colId.length === 0) fail('empty column reference');
      tokens.push({ type: 'ref', value: colId });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < source.length && /[A-Za-z0-9_]/.test(source.charAt(j))) j++;
      tokens.push({ type: 'ident', value: source.slice(i, j) });
      i = j;
      continue;
    }
    const two = source.slice(i, i + 2);
    if (two === '<>' || two === '>=' || two === '<=') {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if ('+-*/^&=<>!%,()'.includes(ch)) {
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
    if (t.type === 'ref') {
      this.pos++;
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

export function parseExpression(source: string): ExprNode {
  return new Parser(tokenize(source)).parse();
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

function numericArgs(args: unknown[]): number[] {
  return args.filter((v) => v !== null && v !== undefined && v !== '').map(toNum);
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
  CONCAT: (a) => a.map(toStr).join(''),
  IF: (a) => {
    arity('IF', a, 2, 3);
    return toBool(a[0]!) ? a[1]! : (a[2] ?? null);
  },
  COUNT: (a) => a.filter((v) => typeof v === 'number').length,
  COUNTA: (a) => a.filter((v) => v !== null && v !== undefined && v !== '').length,
  COUNTBLANK: (a) => a.filter((v) => v === null || v === undefined || v === '').length,
  AND: (a) => a.every(toBool),
  OR: (a) => a.some(toBool),
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
  /** Same-row value of the referenced column. Throws `FormulaError('#REF!')` when the column does not exist. */
  resolveColumn(colId: string): unknown;
  /** Whether `colId` is already on the active resolution chain (circular-reference guard). */
  isResolving(colId: string): boolean;
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
        return toBool(condition)
          ? evaluate(node.args[1]!, ev)
          : node.args[2]
            ? evaluate(node.args[2], ev)
            : null;
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
}

/** Parse (and optionally reference-check) without evaluating. `null` when valid. */
export function validateExpression(source: string, options: ValidateOptions = {}): FormulaError | null {
  let ast: ExprNode;
  try {
    ast = parseExpression(source);
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

/** Unique referenced colIds in declaration order. */
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
    }
  };
  visit(node);
  return out;
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
