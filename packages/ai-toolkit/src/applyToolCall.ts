import type { BeanCollection, GridState } from 'ag-grid-community';
import type { ValidatedCall } from './tools';

interface StateServiceLike {
  setState(state: GridState, propertiesToIgnore?: string[]): void;
}

interface FilterManagerLike {
  getFilterModel(): Record<string, unknown> | null;
}

/**
 * Map a validated tool call to the `GridState` patch that applies it. Pure —
 * no beans needed, so the mapping is unit-testable in isolation.
 */
export function toolCallToStatePatch(call: ValidatedCall): Partial<GridState> {
  switch (call.kind) {
    case 'sort':
      return { sort: { sortModel: call.sortModel } };
    case 'filter':
      // Set semantics for one column; an empty values list clears it. The
      // merge with the current model happens in applyToolCall so other
      // columns' filters survive (spike finding B keeps calls single-column).
      return { filter: { filterModel: { [call.column]: call.values.length > 0 ? { filterType: 'set', values: call.values } : null } } };
    case 'visibility':
      return { columnVisibility: { hiddenColIds: call.hiddenColIds } };
    case 'reset':
      return { sort: { sortModel: [] }, filter: { filterModel: {} }, columnVisibility: { hiddenColIds: [] } };
  }
}

/**
 * Apply a validated tool call through Community's `stateSvc` bean (the
 * `GridStateModule` round-trip). Filter patches merge over the current
 * filter model so one column's filter never wipes another's.
 */
export function applyToolCall(beans: BeanCollection, call: ValidatedCall): void {
  const stateSvc = (beans as unknown as { stateSvc?: StateServiceLike }).stateSvc;
  if (!stateSvc) throw new Error('ai-toolkit: stateSvc bean missing — register GridStateModule');

  let patch = toolCallToStatePatch(call);
  if (call.kind === 'filter') {
    const filterManager = (beans as unknown as { filterManager?: FilterManagerLike }).filterManager;
    const current = filterManager?.getFilterModel() ?? {};
    const merged: Record<string, unknown> = { ...current };
    if (call.values.length > 0) merged[call.column] = { filterType: 'set', values: call.values };
    else delete merged[call.column];
    patch = { filter: { filterModel: merged } };
  }

  stateSvc.setState(patch);
}
