import type { AiGridSnapshot, AiColumnSnapshot } from './gridSnapshot';
import type { AiGridPlan } from './plan';
import { operandArity, operandMatchesType, type AiFilterOperator, type AiScalar } from './capabilities';

export type PlanValidation = { ok: true } | { ok: false; reason: string };

export interface ValidatePlanLimits {
  maxConditions?: number;
  maxSortColumns?: number;
  maxOperands?: number;
}

export const DEFAULT_LIMITS: Required<ValidatePlanLimits> = {
  maxConditions: 8,
  maxSortColumns: 4,
  maxOperands: 50,
};

/**
 * Check a decoded plan against the live grid, in full, before anything is
 * applied.
 *
 * The plan is rejected whole: a request that asks for three things and gets
 * one of them wrong changes nothing. Partial application would leave the grid
 * in a state the user never asked for and cannot easily reason about, which is
 * worse than doing nothing and saying so.
 *
 * Nothing here trusts the environment to have constrained the model. The tool
 * enums say what the model *should* emit; this says what the grid *will*
 * accept, and only the second one is safe to act on.
 */
export function validatePlan(plan: AiGridPlan, snapshot: AiGridSnapshot, limits: ValidatePlanLimits = {}): PlanValidation {
  const { maxConditions, maxSortColumns, maxOperands } = { ...DEFAULT_LIMITS, ...limits };
  const byId = new Map(snapshot.columns.map((column) => [column.colId, column]));

  if (plan.filter) {
    if (plan.filter.length > maxConditions) {
      return { ok: false, reason: `too many filter conditions (${plan.filter.length} > ${maxConditions})` };
    }
    const seen = new Set<string>();
    for (const condition of plan.filter) {
      const column = byId.get(condition.columnId);
      if (!column) return { ok: false, reason: `unknown column: ${condition.columnId}` };
      if (!column.filter) return { ok: false, reason: `column is not filterable: ${condition.columnId}` };
      if (!column.filter.operators.includes(condition.operator)) {
        return { ok: false, reason: `operator ${condition.operator} is not available on ${condition.columnId}` };
      }
      // v1 compiles to Community's per-column filter model, which holds one
      // condition per column; two conditions on one column cannot both survive.
      if (seen.has(condition.columnId)) {
        return { ok: false, reason: `more than one condition for ${condition.columnId} is not supported` };
      }
      seen.add(condition.columnId);

      const operandCheck = checkOperands(condition.operands, condition.operator, column, maxOperands);
      if (!operandCheck.ok) return operandCheck;
    }
  }

  if (plan.sort) {
    if (plan.sort.length > maxSortColumns) {
      return { ok: false, reason: `too many sort columns (${plan.sort.length} > ${maxSortColumns})` };
    }
    const seen = new Set<string>();
    for (const entry of plan.sort) {
      const column = byId.get(entry.columnId);
      if (!column) return { ok: false, reason: `unknown column: ${entry.columnId}` };
      if (!column.sortable) return { ok: false, reason: `column is not sortable: ${entry.columnId}` };
      if (seen.has(entry.columnId)) return { ok: false, reason: `duplicate sort column: ${entry.columnId}` };
      seen.add(entry.columnId);
    }
  }

  if (plan.visibility) {
    for (const key of ['hide', 'show'] as const) {
      for (const colId of plan.visibility[key] ?? []) {
        const column = byId.get(colId);
        if (!column) return { ok: false, reason: `unknown column: ${colId}` };
        // `lockVisible` only stops the UI in Community; the API would happily
        // hide the column, so the guarantee has to be enforced here.
        if (!column.hideable) return { ok: false, reason: `column visibility is locked: ${colId}` };
      }
    }
    const hide = new Set(plan.visibility.hide ?? []);
    const contradiction = (plan.visibility.show ?? []).find((colId) => hide.has(colId));
    if (contradiction) return { ok: false, reason: `column is both hidden and shown: ${contradiction}` };
  }

  return { ok: true };
}

function checkOperands(
  operands: readonly AiScalar[],
  operator: AiFilterOperator,
  column: AiColumnSnapshot,
  maxOperands: number,
): PlanValidation {
  const [min, max] = operandArity(operator);
  if (operands.length < min || operands.length > max) {
    const expected = max === Infinity ? `at least ${min}` : min === max ? `${min}` : `${min}-${max}`;
    return { ok: false, reason: `${operator} expects ${expected} operand(s), got ${operands.length}` };
  }
  if (operands.length > maxOperands) {
    return { ok: false, reason: `too many operands (${operands.length} > ${maxOperands})` };
  }
  for (const operand of operands) {
    if (!operandMatchesType(operand, column.dataType)) {
      return { ok: false, reason: `operand ${JSON.stringify(operand)} is not a valid ${column.dataType} for ${column.colId}` };
    }
  }
  return { ok: true };
}
