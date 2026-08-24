import type { AiFilterOperator, AiScalar } from './capabilities';

/**
 * The provider-independent semantic plan.
 *
 * This is LibreGrid's own representation, deliberately kept separate from both
 * the model's wire shape and Community's `GridState`. The wire shape is
 * constrained by what a 45M-parameter model emits reliably; `GridState` is
 * constrained by the grid. Neither should become the other's permanent
 * interface — a later model that can express nested boolean groups should not
 * require a new public type.
 */
export interface AiGridPlan {
  version: 1;
  /** All conditions must hold (v1 is AND-only across columns). */
  filter?: AiFilterCondition[] | null;
  sort?: AiSort[];
  visibility?: AiVisibilityChange;
  reset?: boolean;
}

export interface AiFilterCondition {
  columnId: string;
  operator: AiFilterOperator;
  operands: AiScalar[];
}

export interface AiSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface AiVisibilityChange {
  hide?: string[];
  show?: string[];
}

/** Why a request did not change the grid. All are expected user outcomes. */
export type AiNotAppliedReason = 'ambiguous' | 'unsupported' | 'off-topic' | 'invalid' | 'cancelled';

export interface AiAppliedChanges {
  filter?: AiFilterCondition[] | null;
  sort?: AiSort[];
  visibility?: AiVisibilityChange;
  reset?: boolean;
}

export type AiCommandResult =
  | { status: 'applied'; changes: AiAppliedChanges }
  | { status: 'not-applied'; reason: AiNotAppliedReason; message: string };

/** True when the plan would not change anything. */
export function isEmptyPlan(plan: AiGridPlan): boolean {
  return (
    plan.reset !== true &&
    plan.filter == null &&
    (plan.sort === undefined || plan.sort.length === 0) &&
    plan.visibility === undefined
  );
}
