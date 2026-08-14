import type { AdvancedFilterModel, ColumnAdvancedFilterModel } from 'ag-grid-community';

export type ColumnKind = 'text' | 'number' | 'boolean' | 'date' | 'dateString' | 'dateTime' | 'dateTimeString' | 'bigint' | 'object';
export interface ExpressionColumn { id: string; kind?: ColumnKind; }
export interface ExpressionError { message: string; position: number; }
export type ExpressionResult = { model: AdvancedFilterModel; error?: never } | { model?: never; error: ExpressionError };

type TokenKind = 'column' | 'word' | 'string' | 'number' | 'operator' | 'lparen' | 'rparen' | 'eof';
interface Token { kind: TokenKind; value: string; position: number; }

/** Parses the documented expression grammar into the public serialisable model. */
export function parseAdvancedFilterExpression(text: string, columns: readonly ExpressionColumn[] = []): ExpressionResult {
  try {
    const parser = new Parser(tokenise(text), columns);
    return { model: parser.parse() };
  } catch (error) {
    const parseError = error instanceof ParseError ? error : new ParseError('Invalid expression', 0);
    return { error: { message: parseError.message, position: parseError.position } };
  }
}

/** A canonical, unambiguous text representation accepted by the parser. */
export function serialiseAdvancedFilterModel(model: AdvancedFilterModel | null): string {
  if (!model) return '';
  return serialise(model, 0);
}

/** Evaluates an advanced-filter model against a row-value accessor. */
export function evaluateAdvancedFilterModel(model: AdvancedFilterModel | null, getValue: (colId: string) => unknown): boolean {
  if (!model) return true;
  if (model.filterType === 'join') {
    return model.type === 'AND'
      ? model.conditions.every((condition) => evaluateAdvancedFilterModel(condition, getValue))
      : model.conditions.some((condition) => evaluateAdvancedFilterModel(condition, getValue));
  }
  const value = getValue(model.colId);
  const type = model.type;
  if (type === 'blank') return value == null || value === '';
  if (type === 'notBlank') return value != null && value !== '';
  if (model.filterType === 'boolean') return type === 'true' ? value === true : value === false;
  const expected = model.filter;
  if (model.filterType === 'number' || model.filterType === 'bigint') {
    const actualNumber = Number(value);
    const expectedNumber = Number(expected);
    if (Number.isNaN(actualNumber) || Number.isNaN(expectedNumber)) return false;
    return compare(actualNumber, expectedNumber, type);
  }
  if (model.filterType === 'date' || model.filterType === 'dateString' || model.filterType === 'dateTime' || model.filterType === 'dateTimeString') {
    return compare(String(value ?? ''), String(expected ?? ''), type);
  }
  const actual = String(value ?? '');
  const search = String(expected ?? '');
  switch (type) {
    case 'equals': return actual === search;
    case 'notEqual': return actual !== search;
    case 'contains': return actual.includes(search);
    case 'notContains': return !actual.includes(search);
    case 'startsWith': return actual.startsWith(search);
    case 'endsWith': return actual.endsWith(search);
    default: return false;
  }
}

function compare(actual: number | string, expected: number | string, type: string): boolean {
  switch (type) {
    case 'equals': return actual === expected;
    case 'notEqual': return actual !== expected;
    case 'lessThan': return actual < expected;
    case 'lessThanOrEqual': return actual <= expected;
    case 'greaterThan': return actual > expected;
    case 'greaterThanOrEqual': return actual >= expected;
    default: return false;
  }
}

function serialise(model: AdvancedFilterModel, parentPrecedence: number): string {
  if (model.filterType === 'join') {
    const precedence = model.type === 'AND' ? 2 : 1;
    const value = model.conditions.map((child) => serialise(child, precedence)).join(` ${model.type} `);
    return precedence < parentPrecedence ? `(${value})` : value;
  }
  const column = `[${model.colId.replaceAll(']', '\\]')}]`;
  if (model.filterType === 'boolean') return `${column} IS ${model.type.toUpperCase()}`;
  if (model.type === 'blank') return `${column} IS BLANK`;
  if (model.type === 'notBlank') return `${column} IS NOT BLANK`;
  const operator: Record<string, string> = {
    equals: '=', notEqual: '!=', lessThan: '<', lessThanOrEqual: '<=', greaterThan: '>', greaterThanOrEqual: '>=',
    contains: 'CONTAINS', notContains: 'NOT CONTAINS', startsWith: 'STARTS WITH', endsWith: 'ENDS WITH',
  };
  const raw = model.filter;
  const value = typeof raw === 'number' ? String(raw) : JSON.stringify(raw ?? '');
  return `${column} ${operator[model.type] ?? model.type} ${value}`;
}

function tokenise(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  const add = (kind: TokenKind, value: string, position: number) => tokens.push({ kind, value, position });
  while (index < source.length) {
    const start = index;
    const char = source[index]!;
    if (/\s/.test(char)) { index++; continue; }
    if (char === '(' || char === ')') { add(char === '(' ? 'lparen' : 'rparen', char, index++); continue; }
    if (char === '[') {
      index++;
      let value = '';
      while (index < source.length && source[index] !== ']') {
        if (source[index] === '\\' && source[index + 1] === ']') { value += ']'; index += 2; } else value += source[index++]!;
      }
      if (source[index] !== ']') throw new ParseError('Unterminated column name', start);
      index++; add('column', value, start); continue;
    }
    if (char === '"' || char === "'") {
      const quote = char; index++;
      let value = '';
      while (index < source.length && source[index] !== quote) {
        if (source[index] === '\\') {
          index++;
          if (index >= source.length) throw new ParseError('Unterminated string', start);
          const escaped = source[index++]!;
          value += escaped === 'n' ? '\n' : escaped === 't' ? '\t' : escaped;
        } else value += source[index++]!;
      }
      if (source[index] !== quote) throw new ParseError('Unterminated string', start);
      index++; add('string', value, start); continue;
    }
    const op = source.slice(index).match(/^(?:!=|<=|>=|=|<|>)/)?.[0];
    if (op) { index += op.length; add('operator', op, start); continue; }
    const number = source.slice(index).match(/^-?(?:\d+\.?\d*|\.\d+)/)?.[0];
    if (number) { index += number.length; add('number', number, start); continue; }
    const word = source.slice(index).match(/^[\p{L}_$][\p{L}\p{N}_$.-]*/u)?.[0];
    if (word) { index += word.length; add('word', word, start); continue; }
    throw new ParseError(`Unexpected character '${char}'`, index);
  }
  add('eof', '', index);
  return tokens;
}

class Parser {
  private index = 0;
  private readonly kinds = new Map<string, ColumnKind>();
  public constructor(private readonly tokens: Token[], columns: readonly ExpressionColumn[]) { columns.forEach((column) => this.kinds.set(column.id, column.kind ?? 'text')); }
  public parse(): AdvancedFilterModel { const result = this.parseOr(); this.expect('eof'); return result; }
  private parseOr(): AdvancedFilterModel { return this.join('OR', () => this.parseAnd()); }
  private parseAnd(): AdvancedFilterModel { return this.join('AND', () => this.parsePrimary()); }
  private join(type: 'AND' | 'OR', parseChild: () => AdvancedFilterModel): AdvancedFilterModel {
    const conditions = [parseChild()];
    while (this.wordIs(type)) { this.index++; conditions.push(parseChild()); }
    const flattened = conditions.flatMap((condition) => condition.filterType === 'join' && condition.type === type ? condition.conditions : [condition]);
    return flattened.length === 1 ? flattened[0]! : { filterType: 'join', type, conditions: flattened };
  }
  private parsePrimary(): AdvancedFilterModel {
    if (this.current.kind === 'lparen') { this.index++; const value = this.parseOr(); this.expect('rparen'); return value; }
    return this.parseCondition();
  }
  private parseCondition(): ColumnAdvancedFilterModel {
    const col = this.current;
    if (col.kind !== 'column' && col.kind !== 'word') throw new ParseError('Expected a column name', col.position);
    this.index++;
    const kind = this.kinds.get(col.value) ?? 'text';
    if (this.wordIs('IS')) {
      this.index++;
      if (this.wordIs('NOT')) { this.index++; this.expectWord('BLANK'); return { filterType: kind, colId: col.value, type: 'notBlank' } as ColumnAdvancedFilterModel; }
      if (this.wordIs('BLANK')) { this.index++; return { filterType: kind, colId: col.value, type: 'blank' } as ColumnAdvancedFilterModel; }
      if (this.wordIs('TRUE') || this.wordIs('FALSE')) { const bool = this.current.value.toLowerCase() as 'true' | 'false'; this.index++; return { filterType: 'boolean', colId: col.value, type: bool }; }
      throw new ParseError('Expected BLANK, NOT BLANK, TRUE, or FALSE', this.current.position);
    }
    const type = this.parseOperator(kind);
    const raw = this.current;
    if (!['string', 'number', 'word'].includes(raw.kind)) throw new ParseError('Expected a filter value', raw.position);
    this.index++;
    const filter = kind === 'number' ? Number(raw.value) : raw.value;
    if (kind === 'number' && Number.isNaN(filter)) throw new ParseError('Expected a numeric filter value', raw.position);
    return { filterType: kind, colId: col.value, type, filter } as ColumnAdvancedFilterModel;
  }
  private parseOperator(kind: ColumnKind): string {
    const token = this.current;
    if (token.kind === 'operator') { this.index++; return ({ '=': 'equals', '!=': 'notEqual', '<': 'lessThan', '<=': 'lessThanOrEqual', '>': 'greaterThan', '>=': 'greaterThanOrEqual' } as Record<string, string>)[token.value]!; }
    const mapping: Record<string, string> = { CONTAINS: 'contains', 'NOT CONTAINS': 'notContains', 'STARTS WITH': 'startsWith', 'ENDS WITH': 'endsWith' };
    const first = this.consumeWord();
    const second = first === 'NOT' || first === 'STARTS' || first === 'ENDS' ? this.consumeWord() : undefined;
    const found = mapping[[first, second].filter((value): value is string => !!value).join(' ')];
    if (found && !['number', 'date', 'dateString', 'dateTime', 'dateTimeString', 'bigint'].includes(kind)) return found;
    throw new ParseError('Expected a valid filter operator', token.position);
  }
  private consumeWord(): string | undefined { if (this.current.kind !== 'word') return undefined; return this.tokens[this.index++]!.value.toUpperCase(); }
  private wordIs(word: string): boolean { return this.current.kind === 'word' && this.current.value.toUpperCase() === word; }
  private expectWord(word: string): void { if (!this.wordIs(word)) throw new ParseError(`Expected ${word}`, this.current.position); this.index++; }
  private expect(kind: TokenKind): void { if (this.current.kind !== kind) throw new ParseError(`Expected ${kind === 'eof' ? 'end of expression' : kind}`, this.current.position); this.index++; }
  private get current(): Token { return this.tokens[this.index]!; }
}

class ParseError extends Error { public constructor(message: string, public readonly position: number) { super(message); } }
