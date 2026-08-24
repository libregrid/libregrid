/**
 * The operator vocabulary the model speaks, and how it maps onto the filter
 * models Community can actually execute.
 *
 * The vocabulary is deliberately provider-independent and shorter than
 * Community's own `ISimpleFilterModelType` — a small local model emits `gt`
 * far more reliably than `greaterThanOrEqual`, and the mapping back is exact.
 */

/** Column data types the toolkit reasons about (Community's 9 collapse to these). */
export type AiDataType = 'text' | 'number' | 'date' | 'boolean';

/** Which filter implementation a column carries; decides the model shape emitted. */
export type AiFilterKind = 'text' | 'number' | 'date' | 'set';

/** Normalised operator vocabulary. */
export type AiFilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'between'
  | 'isBlank'
  | 'isNotBlank';

/**
 * The complete, stable filter vocabulary accepted by the AI plan decoder.
 *
 * This deliberately includes the compact spellings for every operator the
 * Advanced Filter UI exposes (for example `startsWith` and `endsWith`). The
 * compiler maps those spellings to the provided-filter wire types below.
 */
export const AI_FILTER_OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'in',
  'between',
  'isBlank',
  'isNotBlank',
] as const satisfies readonly AiFilterOperator[];

const AI_FILTER_OPERATOR_SET = new Set<string>(AI_FILTER_OPERATORS);

/** Whether an untrusted model output names a recognised filter operator. */
export function isAiFilterOperator(value: string): value is AiFilterOperator {
  return AI_FILTER_OPERATOR_SET.has(value);
}

export type AiScalar = string | number | boolean;

/** `ISimpleFilterModelType` values this maps onto (community text/number/date filters). */
const SIMPLE_TYPE: Record<Exclude<AiFilterOperator, 'in'>, string> = {
  eq: 'equals',
  neq: 'notEqual',
  gt: 'greaterThan',
  gte: 'greaterThanOrEqual',
  lt: 'lessThan',
  lte: 'lessThanOrEqual',
  contains: 'contains',
  notContains: 'notContains',
  startsWith: 'startsWith',
  endsWith: 'endsWith',
  between: 'inRange',
  isBlank: 'blank',
  isNotBlank: 'notBlank',
};

/** The `type` a simple filter model carries for this operator, if it has one. */
export function simpleFilterType(operator: AiFilterOperator): string | undefined {
  return operator === 'in' ? undefined : SIMPLE_TYPE[operator];
}

const SCALAR_OPS: readonly AiFilterOperator[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isBlank', 'isNotBlank'];
const TEXT_OPS: readonly AiFilterOperator[] = ['eq', 'neq', 'contains', 'notContains', 'startsWith', 'endsWith', 'isBlank', 'isNotBlank'];
/** A set filter has no operator concept — membership is all it does. */
const SET_OPS: readonly AiFilterOperator[] = ['eq', 'in'];

/** Operators a column supports, given the filter it carries. */
export function operatorsFor(kind: AiFilterKind): readonly AiFilterOperator[] {
  switch (kind) {
    case 'set':
      return SET_OPS;
    case 'number':
    case 'date':
      return SCALAR_OPS;
    case 'text':
      return TEXT_OPS;
  }
}

/** How many operands an operator takes: `[min, max]`, `max === Infinity` for lists. */
export function operandArity(operator: AiFilterOperator): [number, number] {
  switch (operator) {
    case 'isBlank':
    case 'isNotBlank':
      return [0, 0];
    case 'between':
      return [2, 2];
    case 'in':
      return [1, Infinity];
    default:
      return [1, 1];
  }
}

/** Whether an operand's JSON type is usable for a column of this data type. */
export function operandMatchesType(value: AiScalar, dataType: AiDataType): boolean {
  switch (dataType) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      // Dates travel as ISO-8601 date strings (the normalisation policy); the
      // compiler converts to Community's 'YYYY-MM-DD hh:mm:ss' wire format.
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    case 'text':
      return typeof value === 'string';
  }
}

/**
 * Collapse Community's resolved `cellDataType` to the four types the toolkit
 * reasons about. Mirrors the `kindFor` idiom in
 * `packages/advanced-filter/src/advancedFilterService.ts` — unknown or absent
 * means text, which is the conservative choice.
 */
export function dataTypeFor(cellDataType: unknown): AiDataType {
  switch (cellDataType) {
    case 'number':
    case 'bigint':
      return 'number';
    case 'date':
    case 'dateString':
    case 'dateTime':
    case 'dateTimeString':
      return 'date';
    case 'boolean':
      return 'boolean';
    default:
      return 'text';
  }
}

/**
 * Decide which filter implementation a column carries.
 *
 * An explicit filter component name wins. `filter: true` means "the default
 * filter for this data type", which Community resolves from `cellDataType` —
 * verified on a live grid: a `filter: true` number column accepts a
 * `filterType: 'number'` model. Returns null when the column has no filter we
 * can compile for, in which case it is not offered to the model at all.
 */
export function filterKindFor(filter: unknown, dataType: AiDataType): AiFilterKind | null {
  if (typeof filter === 'string') {
    switch (filter) {
      case 'agSetColumnFilter':
        return 'set';
      case 'agNumberColumnFilter':
        return 'number';
      case 'agDateColumnFilter':
        return 'date';
      case 'agTextColumnFilter':
        return 'text';
      default:
        // A custom or multi filter: we cannot know its model shape, so we do
        // not guess one. Better to omit the column than emit a model the
        // filter silently discards.
        return null;
    }
  }
  if (filter !== true) return null;
  switch (dataType) {
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
      // Community ships no boolean provided-filter; only a set filter can
      // express a boolean column, and this one is not configured with it.
      return null;
    case 'text':
      return 'text';
  }
}
