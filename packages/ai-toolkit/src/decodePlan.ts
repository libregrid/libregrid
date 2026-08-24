import type { RawToolCall } from './tools';
import type { GridAiEnvironment } from './environment';
import type { AiFilterCondition, AiGridPlan, AiSort, AiVisibilityChange } from './plan';
import { isAiFilterOperator, type AiScalar } from './capabilities';

export type DecodeResult = { ok: true; plan: AiGridPlan } | { ok: false; reason: string };

/**
 * Turn the model's raw calls into one semantic plan, resolving request-local
 * column references (`c0`) back to real column ids.
 *
 * Decoding is structural only — it establishes "the model said this much
 * coherently". Whether the plan is *allowed* is `validatePlan`'s job, and
 * whether it is *executable* is the compiler's. Every call in the response
 * contributes, so a combined request ("filter, sort and hide") becomes one
 * plan applied in one transaction rather than three separate mutations.
 */
export function decodePlan(calls: readonly RawToolCall[], environment: GridAiEnvironment): DecodeResult {
  const plan: AiGridPlan = { version: 1 };

  for (const call of calls) {
    const args = call.arguments ?? {};
    switch (call.name) {
      case 'setFilter': {
        const decoded = decodeConditions(args.conditions, environment);
        if (!decoded.ok) return decoded;
        plan.filter = decoded.conditions;
        break;
      }
      case 'setSort': {
        const decoded = decodeSort(args.sortModel, environment);
        if (!decoded.ok) return decoded;
        plan.sort = decoded.sort;
        break;
      }
      case 'setColumnVisibility': {
        const decoded = decodeVisibility(args, environment);
        if (!decoded.ok) return decoded;
        plan.visibility = decoded.visibility;
        break;
      }
      case 'resetGrid':
        plan.reset = true;
        break;
      default:
        return { ok: false, reason: `unknown tool: ${call.name}` };
    }
  }

  return { ok: true, plan };
}

function resolve(ref: unknown, environment: GridAiEnvironment): string | null {
  return typeof ref === 'string' ? (environment.columnRefs.get(ref) ?? null) : null;
}

function decodeConditions(
  raw: unknown,
  environment: GridAiEnvironment,
): { ok: true; conditions: AiFilterCondition[] } | { ok: false; reason: string } {
  if (!Array.isArray(raw)) return { ok: false, reason: 'conditions must be an array' };
  // An explicitly empty condition list is how the model clears the filter.
  const conditions: AiFilterCondition[] = [];

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return { ok: false, reason: 'each condition must be an object' };
    const entry = item as Record<string, unknown>;

    const columnId = resolve(entry.column, environment);
    if (!columnId) return { ok: false, reason: `unknown column reference: ${String(entry.column)}` };
    if (typeof entry.operator !== 'string') return { ok: false, reason: 'condition operator must be a string' };
    if (!isAiFilterOperator(entry.operator)) return { ok: false, reason: `unknown filter operator: ${entry.operator}` };

    const operands = normaliseOperands(entry.operands);
    if (operands === null) return { ok: false, reason: 'operands must be strings, numbers or booleans' };

    conditions.push({ columnId, operator: entry.operator, operands });
  }

  return { ok: true, conditions };
}

/** Accept a bare scalar as a one-element list — small models often omit the array. */
function normaliseOperands(raw: unknown): AiScalar[] | null {
  if (raw === undefined || raw === null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const operands: AiScalar[] = [];
  for (const value of list) {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return null;
    operands.push(value);
  }
  return operands;
}

function decodeSort(
  raw: unknown,
  environment: GridAiEnvironment,
): { ok: true; sort: AiSort[] } | { ok: false; reason: string } {
  if (!Array.isArray(raw)) return { ok: false, reason: 'sortModel must be an array' };
  const sort: AiSort[] = [];

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return { ok: false, reason: 'each sort entry must be an object' };
    const entry = item as Record<string, unknown>;

    const columnId = resolve(entry.column, environment);
    if (!columnId) return { ok: false, reason: `unknown column reference: ${String(entry.column)}` };

    // Ascending is the natural default and the model frequently omits it.
    const direction = entry.direction === undefined ? 'asc' : entry.direction;
    if (direction !== 'asc' && direction !== 'desc') return { ok: false, reason: `invalid sort direction: ${String(direction)}` };

    sort.push({ columnId, direction });
  }

  return { ok: true, sort };
}

function decodeVisibility(
  args: Record<string, unknown>,
  environment: GridAiEnvironment,
): { ok: true; visibility: AiVisibilityChange } | { ok: false; reason: string } {
  const visibility: AiVisibilityChange = {};

  for (const key of ['hide', 'show'] as const) {
    const raw = args[key];
    if (raw === undefined) continue;
    if (!Array.isArray(raw)) return { ok: false, reason: `${key} must be an array of column references` };

    const ids: string[] = [];
    for (const ref of raw) {
      const columnId = resolve(ref, environment);
      if (!columnId) return { ok: false, reason: `unknown column reference: ${String(ref)}` };
      ids.push(columnId);
    }
    visibility[key] = ids;
  }

  if (visibility.hide === undefined && visibility.show === undefined) {
    return { ok: false, reason: 'setColumnVisibility needs hide or show' };
  }
  return { ok: true, visibility };
}
